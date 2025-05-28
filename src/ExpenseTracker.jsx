import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiTrash2, FiEdit, FiChevronLeft, FiPieChart, FiCalendar } from 'react-icons/fi';
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
  const [editMode, setEditMode] = useState(false);
  const [currentExpenseId, setCurrentExpenseId] = useState(null);
  const [showForm, setShowForm] = useState(false);

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

      if (editMode && currentExpenseId) {
        // Update existing expense
        const expenseRef = ref(database, `expenses/${currentExpenseId}`);
        await set(expenseRef, newExpense);
        setEditMode(false);
        setCurrentExpenseId(null);
      } else {
        // Add new expense
        const expensesRef = ref(database, 'expenses');
        const newExpenseRef = push(expensesRef);
        await set(newExpenseRef, newExpense);
      }

      // Clear form
      setReason('');
      setPrice('');
      setFromDate('');
      setToDate('');
      setError('');
      
      // Hide form after successful submission
      setShowForm(false);
    } catch (err) {
      console.error("Error adding/updating expense:", err);
      setError(`Failed to ${editMode ? 'update' : 'add'} expense: ${err.message}`);
    }
  };

  const handleEditExpense = (expense) => {
    setReason(expense.reason);
    setPrice(expense.price.toString());
    setFromDate(expense.fromDate);
    setToDate(expense.toDate || '');
    setEditMode(true);
    setCurrentExpenseId(expense.id);
    setShowForm(true);
    
    // Scroll to form
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleCancelEdit = () => {
    setReason('');
    setPrice('');
    setFromDate('');
    setToDate('');
    setEditMode(false);
    setCurrentExpenseId(null);
    setError('');
    setShowForm(false);
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
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Header */}
      <header className={`py-4 px-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md sticky top-0 z-10`}>
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBackClick}
              className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors flex items-center justify-center`}
              aria-label="Back to clients"
            >
              <FiChevronLeft className={`h-5 w-5 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} />
            </button>

            <h1 className="font-bold flex items-center">
              <span className="bg-gradient-to-r from-emerald-500 to-teal-400 inline-block text-transparent bg-clip-text text-xl sm:text-2xl font-bold">
                Expense Tracker
              </span>
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className={`px-4 py-2 rounded-lg ${isDarkMode ? 'bg-indigo-900/50 text-indigo-200' : 'bg-indigo-100 text-indigo-800'} flex items-center`}>
              <BiRupee className="mr-1" />
              <span className="font-semibold">{formatCurrency(getTotalExpenses())}</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto py-6 px-4 space-y-6">
        {/* Action Button */}
        {!showForm && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowForm(true)}
              className={`px-5 py-3 rounded-full shadow-lg ${isDarkMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-500 hover:bg-emerald-600'} text-white font-medium flex items-center transition-all duration-300 transform hover:scale-105`}
            >
              <FiPlus className="mr-2" />
              {editMode ? 'Edit Expense' : 'Add New Expense'}
            </button>
          </div>
        )}

        {/* Add/Edit Expense Form */}
        {showForm && (
          <div className={`rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 mb-8 transition-all duration-300 transform`}>
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              {editMode ? (
                <>
                  <FiEdit className="mr-2 text-blue-500" />
                  Edit Expense
                </>
              ) : (
                <>
                  <FiPlus className="mr-2 text-emerald-500" />
                  Add New Expense
                </>
              )}
            </h2>

            {error && (
              <div className={`p-3 mb-5 rounded-lg ${isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-800'} flex items-center`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
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
                  className={`w-full px-4 py-3 rounded-lg border ${isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Price
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BiRupee className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                  </div>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Enter price"
                    min="0"
                    step="0.01"
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border ${isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  From Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiCalendar className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                  </div>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border ${isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  To Date (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiCalendar className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                  </div>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    min={fromDate}
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border ${isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors`}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={handleCancelEdit}
                className={`px-6 py-3 rounded-lg border ${isDarkMode
                  ? 'border-gray-600 hover:bg-gray-700'
                  : 'border-gray-300 hover:bg-gray-100'
                } font-medium transition duration-200`}
              >
                Cancel
              </button>
              <button
                onClick={handleAddExpense}
                className={`px-6 py-3 rounded-lg ${editMode
                  ? isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
                  : isDarkMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-500 hover:bg-emerald-600'
                } text-white font-medium transition duration-200`}
              >
                {editMode ? 'Update Expense' : 'Add Expense'}
              </button>
            </div>
          </div>
        )}

        {/* Expense Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className={`rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-4`}>
            <h3 className={`text-sm uppercase font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>Total Expenses</h3>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{formatCurrency(getTotalExpenses())}</p>
          </div>
          
          <div className={`rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-4`}>
            <h3 className={`text-sm uppercase font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>Total Records</h3>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{expenses.length}</p>
          </div>
          
          <div className={`rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-4`}>
            <h3 className={`text-sm uppercase font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>Avg. Expense</h3>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              {expenses.length > 0 ? formatCurrency(getTotalExpenses() / expenses.length) : formatCurrency(0)}
            </p>
          </div>
        </div>

        {/* Expense List */}
        <div className={`rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <FiPieChart className="mr-2 text-indigo-500" />
            Expense History
          </h2>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
              <span className="ml-3 text-lg">Loading expenses...</span>
            </div>
          ) : expenses.length === 0 ? (
            <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <p className="text-lg mb-2">No expenses recorded yet</p>
              <p className="mb-6">Add your first expense to start tracking</p>
              <button
                onClick={() => setShowForm(true)}
                className={`inline-flex items-center px-5 py-2 rounded-lg ${isDarkMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-500 hover:bg-emerald-600'} text-white font-medium transition duration-200`}
              >
                <FiPlus className="mr-2" />
                Add Your First Expense
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid grid-cols-1 gap-4">
                {expenses.map(expense => (
                  <div
                    key={expense.id}
                    className={`p-4 rounded-lg border flex flex-col md:flex-row md:items-center justify-between ${
                      isDarkMode ? 'bg-gray-750 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50'
                    } transition-colors`}
                  >
                    <div className="flex-1 mb-3 md:mb-0">
                      <h3 className="font-medium">{expense.reason}</h3>
                      <div className={`text-sm flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <FiCalendar className="mr-1" size={14} />
                        {formatDateRange(expense)}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between md:justify-end w-full md:w-auto">
                      <span className={`text-lg font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {formatCurrency(expense.price)}
                      </span>
                      
                      <div className="flex ml-4">
                        <button
                          onClick={() => handleEditExpense(expense)}
                          className={`p-2 rounded-full ${isDarkMode
                            ? 'hover:bg-gray-600 text-blue-400 hover:text-blue-300'
                            : 'hover:bg-blue-100 text-blue-600'
                          }`}
                          aria-label="Edit expense"
                        >
                          <FiEdit size={18} />
                        </button>
                        <button
                          onClick={() => handleRemoveExpense(expense.id)}
                          className={`p-2 rounded-full ${isDarkMode
                            ? 'hover:bg-gray-600 text-red-400 hover:text-red-300'
                            : 'hover:bg-red-100 text-red-600'
                          }`}
                          aria-label="Delete expense"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ExpenseTracker; 