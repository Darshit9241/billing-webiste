import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAllClients } from './firebase/clientsFirebase';
import { useTheme } from './context/ThemeContext';
import ThemeToggle from './components/ThemeToggle';

const ClientNameOrders = () => {
  const { clientName } = useParams();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [decodedClientName, setDecodedClientName] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  
  // New state variables for enhanced functionality
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState('desc');
  const [viewMode, setViewMode] = useState(() => {
    // Get saved view mode from localStorage or use default 'card'
    return localStorage.getItem('viewMode') || 'card';
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  
  useEffect(() => {
    // Decode the client name from URL parameter
    const decoded = decodeURIComponent(clientName);
    setDecodedClientName(decoded);
    
    fetchOrdersByClientName(decoded);
  }, [clientName]);
  
  // Save viewMode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);
  
  const fetchOrdersByClientName = async (name) => {
    setLoading(true);
    try {
      const allClients = await fetchAllClients();
      
      // Filter clients by name (case insensitive)
      const matchingOrders = allClients.filter(
        client => client.clientName && client.clientName.toLowerCase() === name.toLowerCase()
      );
      
      // Don't sort here, will sort in the useMemo
      
      setOrders(matchingOrders);
      
      // Calculate totals
      let total = 0;
      let pending = 0;
      let paid = 0;
      
      matchingOrders.forEach(order => {
        const orderTotal = parseFloat(order.grandTotal) || 0;
        const orderPaid = parseFloat(order.amountPaid) || 0;
        
        total += orderTotal;
        paid += orderPaid;
        pending += Math.max(0, orderTotal - orderPaid);
      });
      
      setTotalAmount(total);
      setPaidAmount(paid);
      setPendingAmount(pending);
    } catch (err) {
      console.error("Error fetching orders by client name:", err);
      setError("Failed to load orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Sort orders
  const sortedOrders = useMemo(() => {
    if (!orders.length) return [];
    
    return [...orders].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'timestamp':
          comparison = new Date(a.timestamp) - new Date(b.timestamp);
          break;
        case 'grandTotal':
          comparison = (parseFloat(a.grandTotal) || 0) - (parseFloat(b.grandTotal) || 0);
          break;
        case 'amountPaid':
          comparison = (parseFloat(a.amountPaid) || 0) - (parseFloat(b.amountPaid) || 0);
          break;
        case 'balanceDue':
          const aBalance = (parseFloat(a.grandTotal) || 0) - (parseFloat(a.amountPaid) || 0);
          const bBalance = (parseFloat(b.grandTotal) || 0) - (parseFloat(b.amountPaid) || 0);
          comparison = aBalance - bBalance;
          break;
        case 'paymentStatus':
          comparison = (a.paymentStatus || '').localeCompare(b.paymentStatus || '');
          break;
        case 'orderStatus':
          comparison = (a.orderStatus || '').localeCompare(b.orderStatus || '');
          break;
        default:
          comparison = new Date(a.timestamp) - new Date(b.timestamp);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [orders, sortField, sortDirection]);
  
  // Paginate the sorted orders
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedOrders, currentPage, itemsPerPage]);
  
  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(sortedOrders.length / itemsPerPage);
  }, [sortedOrders, itemsPerPage]);
  
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata'
    });
  };
  
  const handleOrderClick = (orderId) => {
    navigate(`/order/${orderId}`);
  };
  
  const handleBackClick = () => {
    navigate('/client-names');
  };

  // Sorting handler
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending for dates, ascending for others
      setSortField(field);
      setSortDirection(field === 'timestamp' ? 'desc' : 'asc');
    }
  };
  
  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };
  
  // SortButton Component
  const SortButton = ({ field, label, currentSort, direction, onClick }) => {
    const isActive = currentSort === field;
    
    return (
      <button
        onClick={() => onClick(field)}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center space-x-1 ${
          isActive 
            ? `${isDarkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`
            : `${isDarkMode ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
        } transition-colors`}
      >
        <span>{label}</span>
        {isActive && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d={direction === 'asc' ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} 
            />
          </svg>
        )}
      </button>
    );
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-gray-100 to-white'} py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleBackClick}
                className={`p-2 rounded-lg ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
                aria-label="Back to client list"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              
              <h1 className={`text-lg sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center`}>
                <span className="bg-gradient-to-r from-emerald-500 to-teal-400 inline-block text-transparent bg-clip-text text-xl sm:text-2xl font-bold">
                  {decodedClientName}'s Orders
                </span>
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className={`p-1 rounded-lg flex ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                <button 
                  onClick={() => setViewMode('card')} 
                  className={`p-1.5 rounded-md ${viewMode === 'card' ? (isDarkMode ? 'bg-slate-700' : 'bg-white shadow-sm') : ''}`}
                  aria-label="Card view"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button 
                  onClick={() => setViewMode('compact')} 
                  className={`p-1.5 rounded-md ${viewMode === 'compact' ? (isDarkMode ? 'bg-slate-700' : 'bg-white shadow-sm') : ''}`}
                  aria-label="Compact view"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
        
        {/* Sort controls */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <SortButton 
              field="timestamp" 
              label="Date" 
              currentSort={sortField} 
              direction={sortDirection} 
              onClick={handleSort} 
            />
            <SortButton 
              field="grandTotal" 
              label="Total" 
              currentSort={sortField} 
              direction={sortDirection} 
              onClick={handleSort} 
            />
            <SortButton 
              field="amountPaid" 
              label="Paid" 
              currentSort={sortField} 
              direction={sortDirection} 
              onClick={handleSort} 
            />
            <SortButton 
              field="balanceDue" 
              label="Due" 
              currentSort={sortField} 
              direction={sortDirection} 
              onClick={handleSort} 
            />
            <SortButton 
              field="paymentStatus" 
              label="Payment Status" 
              currentSort={sortField} 
              direction={sortDirection} 
              onClick={handleSort} 
            />
            <SortButton 
              field="orderStatus" 
              label="Order Type" 
              currentSort={sortField} 
              direction={sortDirection} 
              onClick={handleSort} 
            />
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="bg-red-900/50 border-l-4 border-red-500 text-red-100 p-4 mb-6 rounded-lg animate-pulse backdrop-blur-sm shadow-xl">
            <div className="flex">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}
        
        {/* Stats Section */}
        <div className="mb-6">
          <div className={`backdrop-blur-md ${isDarkMode ? 'bg-white/5' : 'bg-white'} rounded-xl border ${isDarkMode ? 'border-white/10' : 'border-gray-200'} shadow-md p-5`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Summary for {decodedClientName}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-xl p-4 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Orders</p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{orders.length}</p>
              </div>
              
              <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-xl p-4 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Amount</p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{totalAmount.toFixed(2)}</p>
              </div>
              
              <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-xl p-4 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Paid</p>
                    <p className={`text-xl font-bold text-emerald-500`}>₹{paidAmount.toFixed(2)}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Pending</p>
                    <p className={`text-xl font-bold text-amber-500`}>₹{pendingAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Orders list */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-12">
            <div className="relative mb-4">
              <div className="h-20 w-20 rounded-full border-t-4 border-b-4 border-emerald-500 animate-spin"></div>
              <div className="absolute top-0 left-0 h-20 w-20 rounded-full border-r-4 border-teal-300 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <div className="text-center">
              <p className="text-lg text-slate-300 font-medium mb-2">Loading orders...</p>
              <div className={`inline-block h-1.5 w-32 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}>
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 animate-pulse" 
                  style={{ width: '70%' }}
                ></div>
              </div>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 bg-white/5 rounded-xl border border-white/10 shadow-xl backdrop-blur-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-slate-600 opacity-50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-2xl font-semibold text-white mb-3">No orders found</h2>
            <p className="text-slate-400 max-w-lg mx-auto mb-6">
              There are no orders found for client "{decodedClientName}".
            </p>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg shadow-lg hover:shadow-emerald-500/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create New Order
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Orders in Card or Compact View */}
            {viewMode === 'card' ? (
              <div className="space-y-4">
                {paginatedOrders.map((order) => (
                  <div 
                    key={order.id} 
                    onClick={() => handleOrderClick(order.id)}
                    className={`backdrop-blur-md ${isDarkMode ? 'bg-white/10' : 'bg-white'} rounded-xl shadow-xl overflow-hidden border ${isDarkMode ? 'border-white/10' : 'border-gray-200'} hover:shadow-emerald-500/10 transition-all duration-300 cursor-pointer`}
                  >
                    {/* Card header */}
                    <div className={`p-5 ${isDarkMode ? 'bg-gradient-to-r from-slate-800/80 to-slate-700/80' : 'bg-gradient-to-r from-gray-50 to-gray-100'} border-b ${isDarkMode ? 'border-slate-600/30' : 'border-gray-200'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className={`font-semibold text-left text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Order #{order.id.substring(0, 8)}
                          </h3>
                          <p className={`text-xs text-left ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} mt-1`}>
                            {formatDate(order.timestamp)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${order.paymentStatus === 'cleared'
                            ? `${isDarkMode ? 'bg-sky-500/20' : 'bg-sky-100'} ${isDarkMode ? 'text-sky-300' : 'text-sky-700'} border ${isDarkMode ? 'border-sky-500/30' : 'border-sky-200'}`
                            : `${isDarkMode ? 'bg-amber-500/20' : 'bg-amber-100'} ${isDarkMode ? 'text-amber-300' : 'text-amber-700'} border ${isDarkMode ? 'border-amber-500/30' : 'border-amber-200'}`
                            }`}>
                            {order.paymentStatus === 'cleared' ? 'Paid' : 'Pending'}
                          </span>
                          {order.orderStatus && (
                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                              order.orderStatus === 'sell'
                              ? `${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'} ${isDarkMode ? 'text-blue-300' : 'text-blue-700'} border ${isDarkMode ? 'border-blue-500/30' : 'border-blue-200'}`
                              : `${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'} ${isDarkMode ? 'text-purple-300' : 'text-purple-700'} border ${isDarkMode ? 'border-purple-500/30' : 'border-purple-200'}`
                            }`}>
                              {order.orderStatus === 'sell' ? '📤 Sell' : '📥 Purchased'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card content */}
                    <div className="p-5 space-y-4">
                      {/* Financial summary */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-lg p-3 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total:</p>
                          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{typeof order.grandTotal === 'number' ? order.grandTotal.toFixed(2) : '0.00'}</p>
                        </div>
                        <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-lg p-3 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Amount Paid:</p>
                          <p className="font-medium text-emerald-500">₹{typeof order.amountPaid === 'number' ? order.amountPaid.toFixed(2) : '0.00'}</p>
                        </div>
                        <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-lg p-3 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Balance Due:</p>
                          <p className={`font-medium ${((typeof order.grandTotal === 'number' ? order.grandTotal : 0) -
                            (typeof order.amountPaid === 'number' ? order.amountPaid : 0)) <= 0 ? 'text-sky-500' : 'text-amber-500'
                            }`}>
                            ₹{((typeof order.grandTotal === 'number' ? order.grandTotal : 0) -
                              (typeof order.amountPaid === 'number' ? order.amountPaid : 0)).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Products info */}
                      <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-lg p-3 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-center">
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Products:</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                            {order.products?.length || 0} items
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* View order hint */}
                    <div className={`py-3 px-4 text-center text-xs ${isDarkMode ? 'bg-white/5 text-slate-300' : 'bg-gray-50 text-gray-600'} border-t ${isDarkMode ? 'border-slate-700/50' : 'border-gray-200'}`}>
                      Click to view complete order details
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Compact View
              <div className={`overflow-hidden rounded-xl border ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'}`}>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className={isDarkMode ? 'bg-slate-800/50' : 'bg-gray-50'}>
                      <tr>
                        <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>Order ID</th>
                        <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>Date</th>
                        <th scope="col" className={`px-6 py-3 text-center text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>Total</th>
                        <th scope="col" className={`px-6 py-3 text-center text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>Paid</th>
                        <th scope="col" className={`px-6 py-3 text-center text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>Balance</th>
                        <th scope="col" className={`px-6 py-3 text-center text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>Status</th>
                        <th scope="col" className={`px-6 py-3 text-center text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>Type</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-white/10' : 'divide-gray-200'}`}>
                      {paginatedOrders.map((order, index) => {
                        const balanceDue = (parseFloat(order.grandTotal) || 0) - (parseFloat(order.amountPaid) || 0);
                        return (
                          <tr 
                            key={order.id} 
                            onClick={() => handleOrderClick(order.id)}
                            className={`${index % 2 === 0 ? (isDarkMode ? 'bg-white/5' : 'bg-white') : (isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50')} cursor-pointer hover:bg-emerald-500/10`}
                          >
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>#{order.id.substring(0, 8)}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{formatDate(order.timestamp)}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>₹{parseFloat(order.grandTotal || 0).toFixed(2)}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-center text-emerald-500 font-medium`}>₹{parseFloat(order.amountPaid || 0).toFixed(2)}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${balanceDue <= 0 ? 'text-sky-500' : 'text-amber-500'} font-medium`}>₹{balanceDue.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${order.paymentStatus === 'cleared'
                                ? `${isDarkMode ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-100 text-sky-700'}`
                                : `${isDarkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700'}`
                                }`}>
                                {order.paymentStatus === 'cleared' ? 'Paid' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {order.orderStatus && (
                                <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${
                                  order.orderStatus === 'sell'
                                  ? `${isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'}`
                                  : `${isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`
                                }`}>
                                  {order.orderStatus === 'sell' ? 'Sell' : 'Purchase'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-between items-center">
                <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedOrders.length)} of {sortedOrders.length} orders
                </div>
                
                <div className="flex space-x-1">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg ${
                      currentPage === 1 
                        ? (isDarkMode ? 'bg-white/5 text-slate-600' : 'bg-gray-100 text-gray-400') 
                        : (isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                    } transition-colors`}
                    aria-label="Previous page"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  {/* Page number buttons */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Logic to show pages around current page
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-10 h-10 rounded-lg ${
                          currentPage === pageNum
                            ? (isDarkMode ? 'bg-emerald-500 text-white' : 'bg-emerald-500 text-white')
                            : (isDarkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                        } transition-colors`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg ${
                      currentPage === totalPages 
                        ? (isDarkMode ? 'bg-white/5 text-slate-600' : 'bg-gray-100 text-gray-400') 
                        : (isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                    } transition-colors`}
                    aria-label="Next page"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientNameOrders; 