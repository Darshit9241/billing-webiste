import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiDollarSign, FiTrash2 } from 'react-icons/fi';
import ThemeToggle from './components/ThemeToggle';
import { useTheme } from './context/ThemeContext';
import { database } from './firebase/config';
import { ref, set, onValue, remove, push } from 'firebase/database';
import { BiRupee } from 'react-icons/bi';

const ExpenseTracker = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [expenses, setExpenses] = useState([]);
  const [reason, setReason] = useState('');
  const [price, setPrice] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch expenses when component mounts
    const expensesRef = ref(database, 'expenses');

    const unsubscribe = onValue(expensesRef, (snapshot) => {
      setLoading(true);
      if (snapshot.exists()) {
        const expensesData = [];
        snapshot.forEach((childSnapshot) => {
          expensesData.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        });

        // Sort by date (newest first)
        const sortedExpenses = expensesData.sort((a, b) =>
          new Date(b.date) - new Date(a.date)
        );

        setExpenses(sortedExpenses);
      } else {
        setExpenses([]);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error loading expenses:", error);
      setError("Failed to load expenses. Please try again.");
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleAddExpense = async () => {
    // Validate inputs
    if (!reason.trim()) {
      setError('Please enter an expense reason');
      return;
    }

    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      setError('Please enter a valid price');
      return;
    }

    if (!fromDate) {
      setError('Please select a from date');
      return;
    }

    try {
      // Create new expense object
      const newExpense = {
        reason: reason.trim(),
        price: Number(price),
        fromDate: fromDate,
        toDate: toDate || null,
        date: new Date().toISOString()
      };

      // Add to Firebase
      const expensesRef = ref(database, 'expenses');
      const newExpenseRef = push(expensesRef);
      await set(newExpenseRef, newExpense);

      // Clear form
      setReason('');
      setPrice('');
      setFromDate('');
      setToDate('');
      setError('');
    } catch (err) {
      console.error("Error adding expense:", err);
      setError(`Failed to add expense: ${err.message}`);
    }
  };

  const handleRemoveExpense = async (id) => {
    try {
      const expenseRef = ref(database, `expenses/${id}`);
      await remove(expenseRef);
    } catch (err) {
      console.error("Error removing expense:", err);
      setError(`Failed to remove expense: ${err.message}`);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateRange = (expense) => {
    const fromDateFormatted = formatDate(expense.fromDate);

    if (!expense.toDate) {
      return fromDateFormatted;
    }

    const toDateFormatted = formatDate(expense.toDate);
    return `${fromDateFormatted} - ${toDateFormatted}`;
  };

  const getTotalExpenses = () => {
    return expenses.reduce((total, expense) => total + expense.price, 0);
  };
  const handleBackClick = () => {
    navigate('/');
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`py-4 px-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
        <div className="container mx-auto flex justify-between items-center">
          {/* <h1 className="text-2xl font-bold">Expense Tracker</h1> */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleBackClick}
              className={`p-2 rounded-lg ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
              aria-label="Back to clients"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>

            <h1 className={`text-lg sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center`}>
              <span className="bg-gradient-to-r from-emerald-500 to-teal-400 inline-block text-transparent bg-clip-text text-xl sm:text-2xl font-bold">
                <a href="/dashboard" className="bg-gradient-to-r from-emerald-500 to-teal-400 inline-block text-transparent bg-clip-text text-xl font-bold">
                  Expensess
                </a>
              </span>
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        {/* Add Expense Form */}
        <div className={`rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 mb-8`}>
          <h2 className="text-xl font-semibold mb-4">Add New Expense</h2>

          {error && (
            <div className={`p-3 mb-4 rounded-lg ${isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`}>
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Expense Reason
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for expense"
                className={`w-full px-4 py-2 rounded-lg border ${isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Price
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <BiRupee className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />                </div>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Enter price"
                  min="0"
                  step="0.01"
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={fromDate}
                className={`w-full px-4 py-2 rounded-lg border ${isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleAddExpense}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200"
            >
              <FiPlus className="mr-2" />
              Add Expense
            </button>
          </div>
        </div>

        {/* Expense List */}
        <div className={`rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Expense List</h2>
            <div className={`px-4 py-2 rounded-lg ${isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
              }`}>
              Total: {formatCurrency(getTotalExpenses())}
            </div>
          </div>

          {loading ? (
            <div className={`flex justify-center items-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
              <span>Loading expenses...</span>
            </div>
          ) : expenses.length === 0 ? (
            <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              No expenses added yet. Add your first expense above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      } uppercase tracking-wider`}>
                      Date Range
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      } uppercase tracking-wider`}>
                      Reason
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      } uppercase tracking-wider`}>
                      Amount
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      } uppercase tracking-wider`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {expenses.map(expense => (
                    <tr key={expense.id} className={`hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-left">
                        {formatDateRange(expense)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-left">
                        {expense.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        {formatCurrency(expense.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => handleRemoveExpense(expense.id)}
                          className={`p-2 rounded-full ${isDarkMode
                              ? 'hover:bg-gray-600 text-red-400 hover:text-red-300'
                              : 'hover:bg-red-100 text-red-600'
                            }`}
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ExpenseTracker; 