import React, { useState, useEffect, useRef } from 'react';
import { fetchAllClients } from './firebase/clientsFirebase';
import { useTheme } from './context/ThemeContext';
import { useNavigate } from 'react-router-dom';

const ClientOrders = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(10);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const dropdownRef = useRef(null);
  const tableRef = useRef(null);

  const paymentStatuses = [
    { value: '', label: 'All Payment Status' },
    { value: 'pending', label: 'Pending', color: 'text-yellow-600' },
    { value: 'cleared', label: 'Cleared', color: 'text-green-600' },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchClients();
  }, []);

  // Add scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (tableRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = tableRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 20) {
          setDisplayCount(prev => prev + 10);
        }
      }
    };

    const tableElement = tableRef.current;
    if (tableElement) {
      tableElement.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (tableElement) {
        tableElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const fetchClients = async () => {
    try {
      const data = await fetchAllClients();
      console.log("sasasasa", data)
      setClients(data);
    } catch (err) {
      setError('Error loading client orders. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => {
    // Helper function to check if a date matches the search query
    const isDateMatch = (timestamp, searchQuery) => {
      if (!timestamp || !searchQuery) return false;
      
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return false; // Invalid date

      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString();

      // Format date in different patterns
      const ddmm = `${day}/${month}`;
      const ddmmyyyy = `${day}/${month}/${year}`;
      const mmdd = `${month}/${day}`;
      const mmddyyyy = `${month}/${day}/${year}`;

      // Convert timestamp to string format for includes check
      const dateStr = date.toISOString();

      // Check if search query matches any of the date formats
      return searchQuery === ddmm || 
             searchQuery === ddmmyyyy ||
             searchQuery === mmdd ||
             searchQuery === mmddyyyy ||
             dateStr.includes(searchQuery);
    };

    const matchesSearch =
      client.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.clientGst.toLowerCase().includes(searchQuery.toLowerCase()) ||
      isDateMatch(client.timestamp, searchQuery) ||
      (client.totalAmount && client.totalAmount.toString().includes(searchQuery));

    const clientDate = new Date(client.timestamp);
    const fromDateObj = fromDate ? new Date(fromDate) : null;
    const toDateObj = toDate ? new Date(toDate) : null;

    const matchesDateRange =
      (!fromDateObj || clientDate >= fromDateObj) &&
      (!toDateObj || clientDate <= toDateObj);

    const matchesPaymentStatus = !paymentStatusFilter ||
      client.paymentStatus?.toLowerCase() === paymentStatusFilter.toLowerCase();

    return matchesSearch && matchesDateRange && matchesPaymentStatus;
  });

  // Calculate total amount of filtered products
  const totalFilteredAmount = filteredClients.reduce((sum, client) => {
    return sum + (parseFloat(client.grandTotal) || 0);
  }, 0);

  const getPendingOrders = () => {
    return filteredClients.filter(client =>
      client.paymentStatus?.toLowerCase() === 'pending'
    );
  };

  // Calculate total pending amount
  const calculateTotalPendingAmount = () => {
    return getPendingOrders().reduce((sum, client) => {
      return sum + (parseFloat(client.grandTotal) || 0);
    }, 0);
  };

  // Add clear date range function
  const clearDateRange = () => {
    setFromDate('');
    setToDate('');
  };

  const handleBack = () => {
    navigate("/clients");
  };

  const handleOrderClick = (orderId) => {
    navigate(`/order/${orderId}`);
  };

  const handleDeleteClick = (orderId) => {
    setOrderToDelete(orderId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;
    
    setDeleteLoading(true);
    try {
      // Import delete function from clientsFirebase
      const { deleteClient } = await import('./firebase/clientsFirebase');
      
      // Call the correct deleteClient function
      await deleteClient(orderToDelete);
      
      // Update local state
      setClients(clients.filter(client => client.id !== orderToDelete));
      
      // Close modal
      setIsDeleteModalOpen(false);
      setOrderToDelete(null);
    } catch (err) {
      setError('Error deleting order. Please try again.');
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setOrderToDelete(null);
  };

  const handleEditClick = (orderId) => {
    // Navigate to clients page with edit flag and orderId
    navigate(`/clients?edit=true&orderId=${orderId}`);
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section with Back Button and Info Button */}
          <div className="mb-8 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className={`p-2 rounded-lg ${isDarkMode
                    ? 'bg-gray-800 hover:bg-gray-700 text-white'
                    : 'bg-white hover:bg-gray-50 text-gray-900'
                  } shadow-sm border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'
                  } transition-all`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-3xl font-bold">Client Orders</h1>
            </div>
            <button
              onClick={() => setIsSummaryModalOpen(true)}
              className={`p-2 rounded-lg ${isDarkMode
                  ? 'bg-gray-800 hover:bg-gray-700 text-white'
                  : 'bg-white hover:bg-gray-50 text-gray-900'
                } shadow-sm border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'
                } transition-all`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>

          {/* Filters Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

              {/* Date Range */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium mb-2">Date Range</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-lg border ${isDarkMode
                        ? 'bg-gray-800 border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                    />
                  </div>
                  <div>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-lg border ${isDarkMode
                        ? 'bg-gray-800 border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                    />
                  </div>
                </div>
                {(fromDate || toDate) && (
                  <button
                    onClick={clearDateRange}
                    className={`mt-2 px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${isDarkMode
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      } transition-colors`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear Dates
                  </button>
                )}
              </div>

              {/* Payment Status Dropdown */}
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium mb-2">Payment Status</label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`w-full px-4 py-2.5 rounded-lg border flex justify-between items-center ${isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                  >
                    <span className="truncate">
                      {paymentStatuses.find(status => status.value === paymentStatusFilter)?.label || 'All Payment Status'}
                    </span>
                    <svg
                      className={`w-5 h-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isDropdownOpen && (
                    <div className={`absolute z-50 w-full mt-1 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'
                      } border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      {paymentStatuses.map((status) => (
                        <button
                          key={status.value}
                          onClick={() => {
                            setPaymentStatusFilter(status.value);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${status.value === paymentStatusFilter ? 'bg-blue-50 dark:bg-blue-900' : ''
                            } ${status.color || ''} transition-colors`}
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Total Orders</div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{filteredClients.length}</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Total Amount</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  ₹{totalFilteredAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4">
                <div className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">Average Order Value</div>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  ₹{(totalFilteredAmount / (filteredClients.length || 1)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden relative z-10">
            <div
              ref={tableRef}
              className="overflow-y-auto max-h-[600px] hide-scrollbar"
            >
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} sticky top-0 z-10`}>
                  <tr>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Client Name
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      GST Number
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Order Date
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Payment Status
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-gray-200 dark:divide-gray-700 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                  {filteredClients.slice(0, displayCount).map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <button
                          onClick={() => handleOrderClick(client.id)}
                          className={`text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors`}
                        >
                          {client.id}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        {client.clientName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        {client.clientGst}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        {new Date(client.timestamp).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 text-center">
                        {client.grandTotal} ₹
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${client.paymentStatus === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : client.paymentStatus === 'cleared'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                          {client.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <div className="flex items-center justify-center space-x-3">
                          <button
                            onClick={() => handleEditClick(client.id)}
                            className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Edit order"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(client.id)}
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete order"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {displayCount < filteredClients.length && (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>Loading orders...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                <div className="text-red-500 text-center">
                  <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg font-medium mb-2">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} p-4`}>
        <div className="text-red-500 text-center">{error}</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section with Back Button and Info Button */}
        <div className="mb-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className={`p-2 rounded-lg ${isDarkMode
                  ? 'bg-gray-800 hover:bg-gray-700 text-white'
                  : 'bg-white hover:bg-gray-50 text-gray-900'
                } shadow-sm border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'
                } transition-all`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold">Client Orders</h1>
          </div>
          <button
            onClick={() => setIsSummaryModalOpen(true)}
            className={`p-2 rounded-lg ${isDarkMode
                ? 'bg-gray-800 hover:bg-gray-700 text-white'
                : 'bg-white hover:bg-gray-50 text-gray-900'
              } shadow-sm border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'
              } transition-all`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        {/* Filters Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

            {/* Date Range */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium mb-2">Date Range</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border ${isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                  />
                </div>
                <div>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border ${isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                  />
                </div>
              </div>
              {(fromDate || toDate) && (
                <button
                  onClick={clearDateRange}
                  className={`mt-2 px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    } transition-colors`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear Dates
                </button>
              )}
            </div>

            {/* Payment Status Dropdown */}
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium mb-2">Payment Status</label>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`w-full px-4 py-2.5 rounded-lg border flex justify-between items-center ${isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                >
                  <span className="truncate">
                    {paymentStatuses.find(status => status.value === paymentStatusFilter)?.label || 'All Payment Status'}
                  </span>
                  <svg
                    className={`w-5 h-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isDropdownOpen && (
                  <div className={`absolute z-50 w-full mt-1 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'
                    } border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    {paymentStatuses.map((status) => (
                      <button
                        key={status.value}
                        onClick={() => {
                          setPaymentStatusFilter(status.value);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${status.value === paymentStatusFilter ? 'bg-blue-50 dark:bg-blue-900' : ''
                          } ${status.color || ''} transition-colors`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 mb-5">
          <input
            type="text"
            placeholder="Search by name, ID, GST, or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full px-4 py-2.5 rounded-lg border ${isDarkMode
              ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
          />
        </div>

        {/* Table Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden relative z-10">
          <div
            ref={tableRef}
            className="overflow-y-auto max-h-[600px] hide-scrollbar"
          >
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} sticky top-0 z-10`}>
                <tr>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Client Name
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    GST Number
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Order Date
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Payment Status
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-gray-200 dark:divide-gray-700 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                {filteredClients.slice(0, displayCount).map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <button
                        onClick={() => handleOrderClick(client.id)}
                        className={`text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors`}
                      >
                        {client.id}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      {client.clientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      {client.clientGst}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      {new Date(client.timestamp).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 text-center">
                      {client.grandTotal} ₹
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${client.paymentStatus === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : client.paymentStatus === 'cleared'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                        {client.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <div className="flex items-center justify-center space-x-3">
                        <button
                          onClick={() => handleEditClick(client.id)}
                          className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Edit order"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(client.id)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete order"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {displayCount < filteredClients.length && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
        </div>

        {/* Summary Modal */}
        {isSummaryModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-2xl w-full mx-4 p-6 relative ${isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
              {/* Close Button */}
              <button
                onClick={() => setIsSummaryModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Modal Title */}
              <h2 className="text-2xl font-bold mb-6">Order Summary</h2>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                  <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Total Orders</div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{filteredClients.length}</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                  <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Total Amount</div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    ₹{totalFilteredAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-4">
                  <div className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-1">Total Pending Amount</div>
                  <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                    ₹{calculateTotalPendingAmount().toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Additional Statistics */}
              <div className="space-y-4">
                <div className="border-t dark:border-gray-700 pt-4">
                  <h3 className="text-lg font-semibold mb-3">Payment Status Distribution</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-3">
                      <div className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Pending Orders</div>
                      <div className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
                        {filteredClients.filter(client => client.paymentStatus === 'pending').length}
                      </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3">
                      <div className="text-sm font-medium text-green-600 dark:text-green-400">Cleared Orders</div>
                      <div className="text-xl font-bold text-green-700 dark:text-green-300">
                        {filteredClients.filter(client => client.paymentStatus === 'cleared').length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full mx-4 p-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <h3 className="text-xl font-bold mb-4">Confirm Delete</h3>
              <p className="mb-6">Are you sure you want to delete this order? This action cannot be undone.</p>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={cancelDelete}
                  className={`px-4 py-2 rounded-lg ${isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-200 hover:bg-gray-300'
                  } transition-colors`}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>Loading orders...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="text-red-500 text-center">
                <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium mb-2">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientOrders; 