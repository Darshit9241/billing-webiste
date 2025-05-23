import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAllClients, updateClient, deleteClient } from './firebase/clientsFirebase';
import { useTheme } from './context/ThemeContext';
import ThemeToggle from './components/ThemeToggle';

// CSS keyframes for animations
const fadeInKeyframes = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const slideDownKeyframes = `
  @keyframes slideDown {
    from { transform: translateY(-10px); }
    to { transform: translateY(0); }
  }
`;

const ClientNameOrders = () => {
  const { clientName } = useParams();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  
    // Default view mode
  const defaultViewMode = 'compact';
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [decodedClientName, setDecodedClientName] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [filteredTotalAmount, setFilteredTotalAmount] = useState(0);
  const [filteredPendingAmount, setFilteredPendingAmount] = useState(0);
  const [filteredPaidAmount, setFilteredPaidAmount] = useState(0);
  
  // Date filter states
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);
  
  // New state variables for enhanced functionality
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState('desc');
  const [viewMode, setViewMode] = useState(() => {
    try {
      // Get saved view mode from localStorage or use default
      const savedMode = localStorage.getItem('viewMode');
      return savedMode || defaultViewMode;
    } catch (error) {
      console.error("Error reading viewMode from localStorage:", error);
      return defaultViewMode; // Fallback to defaultViewMode if there's an error
    }
  });
  
  // Save viewMode to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('viewMode', viewMode);
    } catch (error) {
      console.error("Error saving viewMode to localStorage:", error);
    }
  }, [viewMode]);
  
  // Search functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState('all');
  const [searchFieldDropdownOpen, setSearchFieldDropdownOpen] = useState(false);
  
  // State variables for order merging
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [mergedOrder, setMergedOrder] = useState(null);
  const [mergeLoading, setMergeLoading] = useState(false);
  
  // State for delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // State for summary visibility
  const [showSummary, setShowSummary] = useState(false);
  
  useEffect(() => {
    // Decode the client name from URL parameter
    const decoded = decodeURIComponent(clientName);
    setDecodedClientName(decoded);
    
    fetchOrdersByClientName(decoded);
  }, [clientName]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdownElements = document.querySelectorAll('.search-field-dropdown');
      let clickedInsideDropdown = false;
      
      dropdownElements.forEach(element => {
        if (element.contains(event.target)) {
          clickedInsideDropdown = true;
        }
      });
      
      if (!clickedInsideDropdown) {
        setSearchFieldDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const fetchOrdersByClientName = async (name) => {
    setLoading(true);
    try {
      const allClients = await fetchAllClients();
      
      // First try exact match with trimmed lowercase
      let matchingOrders = allClients.filter(
        client => client.clientName && client.clientName.toLowerCase().trim() === name.toLowerCase().trim()
      );
      
      // If no matches found, try a more flexible approach
      if (matchingOrders.length === 0) {
        console.log("No exact matches found, trying flexible matching...");
        // Try to match by removing extra spaces and normalizing case
        const normalizedName = name.toLowerCase().replace(/\s+/g, ' ').trim();
        matchingOrders = allClients.filter(client => {
          if (!client.clientName) return false;
          const normalizedClientName = client.clientName.toLowerCase().replace(/\s+/g, ' ').trim();
          return normalizedClientName === normalizedName;
        });
        
        // If still no matches, try substring matching as a last resort
        if (matchingOrders.length === 0 && normalizedName.length > 2) {
          console.log("No normalized matches found, trying substring matching...");
          matchingOrders = allClients.filter(client => {
            if (!client.clientName) return false;
            const normalizedClientName = client.clientName.toLowerCase().replace(/\s+/g, ' ').trim();
            return normalizedClientName.includes(normalizedName) || normalizedName.includes(normalizedClientName);
          });
        }
      }
      
      setOrders(matchingOrders);
      
      // Calculate totals
      let total = 0;
      let pending = 0;
      let paid = 0;
      
      matchingOrders.forEach(order => {
        // Skip if this order is part of a merged order
        if (order.mergedFrom) return;
        
        const orderTotal = parseFloat(order.grandTotal) || 0;
        const orderPaid = parseFloat(order.amountPaid) || 0;
        
        total += orderTotal;
        paid += orderPaid;
        pending += Math.max(0, orderTotal - orderPaid);
      });
      
      setTotalAmount(total);
      setPaidAmount(paid);
      setPendingAmount(pending);
      
      // Log for debugging
      console.log(`Found ${matchingOrders.length} orders for client "${name}"`);
      if (matchingOrders.length === 0) {
        console.log("All available clients:", allClients.map(c => c.clientName));
      }
    } catch (err) {
      console.error("Error fetching orders by client name:", err);
      setError("Failed to load orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Format date function - moved up before it's used in filteredOrders
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata'
    });
  };

  // Handle search term change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle search field change
  const handleSearchFieldChange = (value) => {
    setSearchField(value);
  };
  
  // Date filter handlers
  const handleFromDateChange = (e) => {
    setFromDate(e.target.value);
    setIsDateFilterActive(!!e.target.value || !!toDate);
  };
  
  const handleToDateChange = (e) => {
    setToDate(e.target.value);
    setIsDateFilterActive(!!e.target.value || !!fromDate);
  };
  
  const clearDateFilter = () => {
    setFromDate('');
    setToDate('');
    setIsDateFilterActive(false);
  };
  
  // Filter orders based on search term and field
  const filteredOrders = useMemo(() => {
    let filtered = orders;
    
    // Apply date filter if active
    if (isDateFilterActive) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.timestamp);
        
        // Check if order date is after fromDate (if fromDate is set)
        if (fromDate && new Date(fromDate) > orderDate) {
          return false;
        }
        
        // Check if order date is before toDate (if toDate is set)
        // Add one day to toDate to include the entire day
        if (toDate) {
          const toDateObj = new Date(toDate);
          toDateObj.setDate(toDateObj.getDate() + 1);
          if (toDateObj < orderDate) {
            return false;
          }
        }
        
        return true;
      });
    }
    
    // Apply search term filter
    if (!searchTerm.trim()) return filtered;
    
    const term = searchTerm.toLowerCase().trim();
    
    return filtered.filter(order => {
      switch (searchField) {
        case 'id':
          return order.id.toLowerCase().includes(term);
        case 'amount':
          const grandTotal = parseFloat(order.grandTotal) || 0;
          return grandTotal.toString().includes(term);
        case 'status':
          return (order.paymentStatus || '').toLowerCase().includes(term);
        case 'orderType':
          return (order.orderStatus || '').toLowerCase().includes(term);
        case 'date':
          // Search in formatted date
          const formattedDate = formatDate(order.timestamp).toLowerCase();
          return formattedDate.includes(term);
        case 'all':
        default:
          // Search in all fields
          return (
            order.id.toLowerCase().includes(term) ||
            ((parseFloat(order.grandTotal) || 0).toString().includes(term)) ||
            ((order.paymentStatus || '').toLowerCase().includes(term)) ||
            ((order.orderStatus || '').toLowerCase().includes(term)) ||
            (formatDate(order.timestamp).toLowerCase().includes(term))
          );
      }
    });
  }, [orders, searchTerm, searchField, isDateFilterActive, fromDate, toDate]);

  // Sort orders
  const sortedOrders = useMemo(() => {
    if (!filteredOrders.length) return [];
    
    return [...filteredOrders].sort((a, b) => {
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
  }, [filteredOrders, sortField, sortDirection]);
  
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
    // This function is no longer needed as we're removing pagination
  };
  
  const handlePrevPage = () => {
    // This function is no longer needed as we're removing pagination
  };
  
  const handleNextPage = () => {
    // This function is no longer needed as we're removing pagination
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

  // Order merge functionality
  const toggleSelectionMode = () => {
    setIsSelectionMode(prev => !prev);
    // Clear selections when exiting selection mode
    if (isSelectionMode) {
      setSelectedOrders([]);
    }
  };
  
  const toggleOrderSelection = (order) => {
    if (!isSelectionMode) return;
    
    setSelectedOrders(prev => {
      const isSelected = prev.some(o => o.id === order.id);
      if (isSelected) {
        return prev.filter(o => o.id !== order.id);
      } else {
        return [...prev, order];
      }
    });
  };
  
  const createMergedOrder = () => {
    if (selectedOrders.length < 2) {
      setError("Please select at least 2 orders to merge");
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    // Use the first order as the base
    const baseOrder = { ...selectedOrders[0] };
    
    // Initialize merged values
    let allProducts = [...(baseOrder.products || [])];
    let totalGrandTotal = parseFloat(baseOrder.grandTotal) || 0;
    let totalAmountPaid = parseFloat(baseOrder.amountPaid) || 0;
    let allPaymentHistory = [...(baseOrder.paymentHistory || [])];
    
    // Combine data from all other selected orders
    for (let i = 1; i < selectedOrders.length; i++) {
      const order = selectedOrders[i];
      
      // Merge products
      if (order.products && order.products.length > 0) {
        allProducts = [...allProducts, ...order.products];
      }
      
      // Sum up the financial data
      totalGrandTotal += parseFloat(order.grandTotal) || 0;
      totalAmountPaid += parseFloat(order.amountPaid) || 0;
      
      // Merge payment history
      if (order.paymentHistory && order.paymentHistory.length > 0) {
        allPaymentHistory = [...allPaymentHistory, ...order.paymentHistory];
      }
    }
    
    // Sort payment history by date
    allPaymentHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Create the merged order
    const newMergedOrder = {
      ...baseOrder,
      clientName: decodedClientName,
      products: allProducts,
      grandTotal: totalGrandTotal,
      amountPaid: totalAmountPaid,
      paymentHistory: allPaymentHistory,
      paymentStatus: totalAmountPaid >= totalGrandTotal ? 'cleared' : 'pending',
      orderStatus: baseOrder.orderStatus || 'sell',
      merged: true,
      mergedFrom: selectedOrders.map(o => o.id),
      timestamp: Date.now(),
      id: `merged_${Date.now()}`
    };
    
    setMergedOrder(newMergedOrder);
    setShowMergeConfirm(true);
  };
  
  const saveMergedOrder = async () => {
    if (!mergedOrder) return;
    
    setMergeLoading(true);
    try {
      // Save to Firebase
      await updateClient(mergedOrder);
      
      // Update local state
      setOrders(prev => [...prev, mergedOrder]);
      
      // Reset merge state
      setSelectedOrders([]);
      setIsSelectionMode(false);
      setShowMergeConfirm(false);
      setMergedOrder(null);
      
      // Show success message
      setError('Orders successfully merged!');
      setTimeout(() => setError(''), 3000);
      
      // Refresh orders to reflect the merge
      await fetchOrdersByClientName(decodedClientName);
    } catch (err) {
      setError(`Failed to save merged order: ${err.message}`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setMergeLoading(false);
    }
  };
  
  const cancelMerge = () => {
    setShowMergeConfirm(false);
    setMergedOrder(null);
  };

  const handleDeleteClick = (e, order) => {
    e.stopPropagation(); // Prevent row click event
    setOrderToDelete(order);
    setShowDeleteConfirm(true);
  };
  
  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    
    setDeleteLoading(true);
    try {
      // Delete the order from Firebase
      await deleteClient(orderToDelete.id);
      
      // Update local state
      setOrders(prev => prev.filter(order => order.id !== orderToDelete.id));
      
      // Show success message
      setError('Order successfully deleted!');
      setTimeout(() => setError(''), 3000);
      
      // Recalculate totals
      const updatedOrders = orders.filter(order => order.id !== orderToDelete.id);
      let total = 0;
      let pending = 0;
      let paid = 0;
      
      updatedOrders.forEach(order => {
        if (order.mergedFrom) return;
        
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
      setError(`Failed to delete order: ${err.message}`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
      setOrderToDelete(null);
    }
  };
  
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setOrderToDelete(null);
  };

  // Toggle summary visibility
  const toggleSummary = () => {
    setShowSummary(prev => !prev);
  };

  // Update filtered totals whenever filteredOrders changes
  useEffect(() => {
    // Calculate totals for filtered orders
    let total = 0;
    let pending = 0;
    let paid = 0;
    
    filteredOrders.forEach(order => {
      // Skip if this order is part of a merged order
      if (order.mergedFrom) return;
      
      const orderTotal = parseFloat(order.grandTotal) || 0;
      const orderPaid = parseFloat(order.amountPaid) || 0;
      
      total += orderTotal;
      paid += orderPaid;
      pending += Math.max(0, orderTotal - orderPaid);
    });
    
    setFilteredTotalAmount(total);
    setFilteredPaidAmount(paid);
    setFilteredPendingAmount(pending);
  }, [filteredOrders]);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-gray-100 to-white'} py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200`}>
      {/* Inject CSS keyframes */}
      <style>
        {fadeInKeyframes}
        {slideDownKeyframes}
      </style>
      
      
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
              {/* Info button for summary */}
              <button 
                onClick={toggleSummary}
                className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'} transition-colors flex items-center`}
                aria-label="Toggle summary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              
              {/* Merge orders button/controls */}
              {!isSelectionMode ? (
                <button 
                  onClick={toggleSelectionMode}
                  disabled={orders.length < 2}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center space-x-1 
                    ${orders.length < 2 
                      ? (isDarkMode ? 'bg-slate-700/50 text-slate-500' : 'bg-gray-200 text-gray-400') 
                      : (isDarkMode ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200')
                    } transition-colors`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
                  </svg>
                  <span>Merge Orders</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={createMergedOrder}
                    disabled={selectedOrders.length < 2}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center
                      ${selectedOrders.length < 2 
                        ? (isDarkMode ? 'bg-slate-700/50 text-slate-500' : 'bg-gray-200 text-gray-400') 
                        : (isDarkMode ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200')
                      } transition-colors`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    <span>Merge Selected ({selectedOrders.length})</span>
                  </button>
                  <button 
                    onClick={toggleSelectionMode}
                    className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-red-100 text-red-700 hover:bg-red-200'} transition-colors`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              
              {/* View mode toggle */}
              <div className={`p-1 rounded-lg flex ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                <button 
                  onClick={() => setViewMode('card')} 
                  className={`p-1.5 rounded-md ${(viewMode || defaultViewMode) === 'card' ? (isDarkMode ? 'bg-slate-700' : 'bg-white shadow-sm') : ''}`}
                  aria-label="Card view"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button 
                  onClick={() => setViewMode('compact')} 
                  className={`p-1.5 rounded-md ${(viewMode || defaultViewMode) === 'compact' ? (isDarkMode ? 'bg-slate-700' : 'bg-white shadow-sm') : ''}`}
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
        
        {/* Search bar */}
        <div className="mb-6">
          <div className={`flex flex-col gap-3 ${isDarkMode ? 'bg-white/5' : 'bg-white'} p-4 rounded-xl border ${isDarkMode ? 'border-white/10' : 'border-gray-200'} shadow-sm`}>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search orders..."
                  className={`block w-full pl-10 pr-3 py-2 rounded-lg ${
                    isDarkMode 
                      ? 'bg-white/10 border-white/10 text-white placeholder-slate-400 focus:border-emerald-500' 
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-emerald-500'
                  } border focus:ring-2 focus:ring-emerald-500/30 outline-none transition-colors`}
                />
              </div>
              <div className="sm:w-48">
                <div className="relative search-field-dropdown">
                  <button
                    type="button"
                    onClick={() => setSearchFieldDropdownOpen(prev => !prev)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setSearchFieldDropdownOpen(false);
                      } else if (e.key === 'ArrowDown' && !searchFieldDropdownOpen) {
                        setSearchFieldDropdownOpen(true);
                      }
                    }}
                    aria-haspopup="listbox"
                    aria-expanded={searchFieldDropdownOpen}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-lg ${
                      isDarkMode 
                        ? 'bg-white/10 border-white/10 text-white' 
                        : 'bg-gray-50 border-gray-300 text-gray-900'
                    } border focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-colors`}
                  >
                    <span className="flex items-center">
                      {searchField === 'all' && (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                          </svg>
                          All Fields
                        </>
                      )}
                      {searchField === 'id' && (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                          Order ID
                        </>
                      )}
                      {searchField === 'amount' && (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Amount
                        </>
                      )}
                      {searchField === 'status' && (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Payment Status
                        </>
                      )}
                      {searchField === 'orderType' && (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          Order Type
                        </>
                      )}
                      {searchField === 'date' && (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Date
                        </>
                      )}
                    </span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-4 w-4 transition-transform duration-200 ${searchFieldDropdownOpen ? 'transform rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {searchFieldDropdownOpen && (
                    <div 
                      role="listbox"
                      tabIndex={-1}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setSearchFieldDropdownOpen(false);
                        }
                      }}
                      className={`absolute z-50 mt-1 w-full rounded-lg shadow-lg ${
                        isDarkMode 
                          ? 'bg-slate-800 border border-white/10' 
                          : 'bg-white border border-gray-200'
                      } py-1 overflow-hidden animate-fadeIn`}
                      style={{
                        animation: 'fadeIn 0.15s ease-out, slideDown 0.15s ease-out'
                      }}
                    >
                      <div className="max-h-80 overflow-auto">
                        {[
                          { value: 'all', label: 'All Fields', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg> },
                          { value: 'id', label: 'Order ID', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg> },
                          { value: 'amount', label: 'Amount', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                          { value: 'status', label: 'Payment Status', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                          { value: 'orderType', label: 'Order Type', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
                          { value: 'date', label: 'Date', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> }
                        ].map((option, index) => (
                          <div
                            key={option.value}
                            role="option"
                            aria-selected={searchField === option.value}
                            tabIndex={0}
                            onClick={() => {
                              handleSearchFieldChange(option.value);
                              setSearchFieldDropdownOpen(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleSearchFieldChange(option.value);
                                setSearchFieldDropdownOpen(false);
                              } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                const nextElement = e.currentTarget.nextElementSibling;
                                if (nextElement) nextElement.focus();
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                const prevElement = e.currentTarget.previousElementSibling;
                                if (prevElement) prevElement.focus();
                              }
                            }}
                            className={`px-4 py-2 cursor-pointer flex items-center ${
                              searchField === option.value
                                ? isDarkMode
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-emerald-50 text-emerald-700'
                                : isDarkMode
                                  ? 'text-white hover:bg-white/5'
                                  : 'text-gray-900 hover:bg-gray-100'
                            } transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500/50`}
                          >
                            <span className="mr-2">{option.icon}</span>
                            {option.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Date filter section */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-200 dark:border-white/10">
              <div className="flex flex-1 flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label htmlFor="fromDate" className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>From Date</label>
                  <input
                    type="date"
                    id="fromDate"
                    value={fromDate}
                    onChange={handleFromDateChange}
                    className={`block w-full px-3 py-2 rounded-lg ${
                      isDarkMode 
                        ? 'bg-white/10 border-white/10 text-white focus:border-emerald-500' 
                        : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-emerald-500'
                    } border focus:ring-2 focus:ring-emerald-500/30 outline-none transition-colors`}
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="toDate" className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>To Date</label>
                  <input
                    type="date"
                    id="toDate"
                    value={toDate}
                    onChange={handleToDateChange}
                    className={`block w-full px-3 py-2 rounded-lg ${
                      isDarkMode 
                        ? 'bg-white/10 border-white/10 text-white focus:border-emerald-500' 
                        : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-emerald-500'
                    } border focus:ring-2 focus:ring-emerald-500/30 outline-none transition-colors`}
                  />
                </div>
                {isDateFilterActive && (
                  <div className="flex items-end">
                    <button
                      onClick={clearDateFilter}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        isDarkMode 
                          ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' 
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      } transition-colors flex items-center`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear
                    </button>
                  </div>
                )}
              </div>
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
        
        {/* Search results message */}
        {searchTerm && (
          <div className={`mb-4 px-4 py-2 rounded-lg ${
            isDarkMode ? 'bg-white/5 text-slate-300' : 'bg-gray-50 text-gray-700'
          }`}>
            {filteredOrders.length === 0 ? (
              <p>No results found for "{searchTerm}"</p>
            ) : (
              <p>Found {filteredOrders.length} result{filteredOrders.length !== 1 ? 's' : ''} for "{searchTerm}"</p>
            )}
          </div>
        )}
        
        {/* Stats Section */}
        {showSummary && (
          <div className="mb-6">
            <div className={`backdrop-blur-md ${isDarkMode ? 'bg-white/5' : 'bg-white'} rounded-xl border ${isDarkMode ? 'border-white/10' : 'border-gray-200'} shadow-md p-5`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Summary for {decodedClientName}
                {(searchTerm || isDateFilterActive) && (
                  <span className={`ml-2 text-sm font-normal ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    (Filtered)
                  </span>
                )}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-xl p-4 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Orders</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {(searchTerm || isDateFilterActive) ? filteredOrders.length : orders.length}
                    {(searchTerm || isDateFilterActive) && orders.length > 0 && (
                      <span className={`text-sm ml-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        of {orders.length}
                      </span>
                    )}
                  </p>
                </div>
                
                <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-xl p-4 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Amount</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    ₹{(searchTerm || isDateFilterActive) ? filteredTotalAmount.toFixed(2) : totalAmount.toFixed(2)}
                    {(searchTerm || isDateFilterActive) && orders.length > 0 && (
                      <span className={`text-sm ml-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        of ₹{totalAmount.toFixed(2)}
                      </span>
                    )}
                  </p>
                </div>
                
                <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-xl p-4 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Paid</p>
                      <p className={`text-xl font-bold text-emerald-500`}>
                        ₹{(searchTerm || isDateFilterActive) ? filteredPaidAmount.toFixed(2) : paidAmount.toFixed(2)}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Pending</p>
                      <p className={`text-xl font-bold text-amber-500`}>
                        ₹{(searchTerm || isDateFilterActive) ? filteredPendingAmount.toFixed(2) : pendingAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
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
            {/* Orders in Card or Compact View with scrollable container */}
            {(viewMode || defaultViewMode) === 'card' ? (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                {sortedOrders.map((order) => {
                  const isSelected = selectedOrders.some(o => o.id === order.id);
                  return (
                  <div 
                    key={order.id} 
                    onClick={() => isSelectionMode ? toggleOrderSelection(order) : handleOrderClick(order.id)}
                    className={`backdrop-blur-md ${isDarkMode ? 'bg-white/10' : 'bg-white'} rounded-xl shadow-xl overflow-hidden border 
                      ${isSelectionMode && isSelected 
                        ? (isDarkMode ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-indigo-500 ring-2 ring-indigo-500/30') 
                        : (isDarkMode ? 'border-white/10' : 'border-gray-200')} 
                      hover:shadow-emerald-500/10 transition-all duration-300 cursor-pointer
                      ${order.merged ? (isDarkMode ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-blue-500') : ''}
                    `}
                  >
                    {/* Selection indicator (shown in selection mode) */}
                    {isSelectionMode && (
                      <div className={`absolute top-3 right-3 h-5 w-5 rounded-full flex items-center justify-center 
                        ${isSelected 
                          ? (isDarkMode ? 'bg-indigo-500 text-white' : 'bg-indigo-500 text-white') 
                          : (isDarkMode ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500')}`}
                      >
                        {isSelected && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    )}
                    
                    {/* Card header */}
                    <div className={`p-5 ${isDarkMode ? 'bg-gradient-to-r from-slate-800/80 to-slate-700/80' : 'bg-gradient-to-r from-gray-50 to-gray-100'} border-b ${isDarkMode ? 'border-slate-600/30' : 'border-gray-200'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className={`font-semibold text-left text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {order.merged ? '🔄 ' : ''}Order #{order.id.substring(0, 8)}
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
                      {isSelectionMode ? 'Click to select for merging' : 'Click to view complete order details'}
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              // Compact View with scrollable container
              <div className={`overflow-hidden rounded-xl border ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'}`}>
                <div className="overflow-x-auto max-h-[70vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className={`sticky top-0 z-10 ${isDarkMode ? 'bg-slate-800/90' : 'bg-gray-50/90'} backdrop-blur-sm`}>
                      <tr>
                        {isSelectionMode && (
                          <th scope="col" className={`px-4 py-3 text-center ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                            Select
                          </th>
                        )}
                        <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>Order ID</th>
                        <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>Date</th>
                        <th scope="col" className={`px-6 py-3 text-center text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>Total</th>
                        <th scope="col" className={`px-6 py-3 text-center text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>Paid</th>
                        <th scope="col" className={`px-6 py-3 text-center text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>Balance</th>
                        <th scope="col" className={`px-6 py-3 text-center text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>Status</th>
                        <th scope="col" className={`px-6 py-3 text-center text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>Type</th>
                        <th scope="col" className={`px-6 py-3 text-center text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-white/10' : 'divide-gray-200'}`}>
                      {sortedOrders.map((order, index) => {
                        const balanceDue = (parseFloat(order.grandTotal) || 0) - (parseFloat(order.amountPaid) || 0);
                        const isSelected = selectedOrders.some(o => o.id === order.id);
                        return (
                          <tr 
                            key={order.id} 
                            onClick={() => isSelectionMode ? toggleOrderSelection(order) : handleOrderClick(order.id)}
                            className={`${index % 2 === 0 ? (isDarkMode ? 'bg-white/5' : 'bg-white') : (isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50')} 
                              cursor-pointer hover:bg-emerald-500/10 
                              ${isSelectionMode && isSelected ? 'bg-indigo-500/20' : ''}
                              ${order.merged ? (isDarkMode ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-blue-500') : ''}
                            `}
                          >
                            {isSelectionMode && (
                              <td className="px-4 py-4 whitespace-nowrap text-center">
                                <div className={`h-5 w-5 rounded-full mx-auto flex items-center justify-center 
                                  ${isSelected 
                                    ? (isDarkMode ? 'bg-indigo-500 text-white' : 'bg-indigo-500 text-white') 
                                    : (isDarkMode ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500')}`}
                                >
                                  {isSelected && (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                              </td>
                            )}
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-left ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {order.merged ? '🔄 ' : ''}#{order.id.substring(0, 8)}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-left ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{formatDate(order.timestamp)}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>₹{parseFloat(order.grandTotal || 0).toFixed(2)}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-center text-emerald-500 font-medium`}>₹{parseFloat(order.amountPaid || 0).toFixed(2)}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${balanceDue <= 0 ? 'text-sky-500' : 'text-amber-500'} font-medium`}>₹{balanceDue.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${order.paymentStatus === 'cleared'
                                ? `${isDarkMode ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-100 text-sky-700'}`
                                : `${isDarkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700'}`
                                }`}>
                                {order.paymentStatus === 'cleared' ? 'cleared' : 'Pending'}
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
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={(e) => handleDeleteClick(e, order)}
                                className={`p-1.5 rounded-full ${isDarkMode ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-red-100 text-red-700 hover:bg-red-200'} transition-colors`}
                                aria-label="Delete order"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Remove Pagination Controls */}
          </div>
        )}
        
        {/* Merge Confirmation Modal */}
        {showMergeConfirm && mergedOrder && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`w-full max-w-2xl rounded-xl shadow-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'} p-6`}>
              <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Confirm Order Merge
              </h3>
              
              <div className="space-y-4 mb-6">
                <p className={`${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  You are about to merge {selectedOrders.length} orders. This will create a new order that combines all products and payments.
                </p>
                
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                  <h4 className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Merge Summary:</h4>
                  <ul className="space-y-2">
                    <li className="flex justify-between">
                      <span className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Products:</span>
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{mergedOrder.products?.length || 0}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Amount:</span>
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{mergedOrder.grandTotal.toFixed(2)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Amount Paid:</span>
                      <span className="font-medium text-emerald-500">₹{mergedOrder.amountPaid.toFixed(2)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Balance Due:</span>
                      <span className={`font-medium ${mergedOrder.grandTotal - mergedOrder.amountPaid <= 0 ? 'text-sky-500' : 'text-amber-500'}`}>
                        ₹{(mergedOrder.grandTotal - mergedOrder.amountPaid).toFixed(2)}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Payment Status:</span>
                      <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${
                        mergedOrder.paymentStatus === 'cleared'
                          ? `${isDarkMode ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-100 text-sky-700'}`
                          : `${isDarkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700'}`
                      }`}>
                        {mergedOrder.paymentStatus === 'cleared' ? 'Paid' : 'Pending'}
                      </span>
                    </li>
                  </ul>
                </div>
                
                <div className={`${isDarkMode ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300' : 'bg-yellow-50 border-yellow-200 text-yellow-800'} p-3 rounded-lg border`}>
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm">
                      The original orders will remain unchanged. A new merged order will be created. You can access both the original and merged orders.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button 
                  onClick={cancelMerge}
                  disabled={mergeLoading}
                  className={`px-4 py-2 rounded-lg ${
                    isDarkMode 
                      ? 'bg-white/10 text-white hover:bg-white/20' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  } transition-colors`}
                >
                  Cancel
                </button>
                <button 
                  onClick={saveMergedOrder}
                  disabled={mergeLoading}
                  className={`px-4 py-2 rounded-lg flex items-center ${
                    isDarkMode 
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                      : 'bg-emerald-500 text-white hover:bg-emerald-600'
                  } transition-colors`}
                >
                  {mergeLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Confirm Merge'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && orderToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`w-full max-w-md rounded-xl shadow-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'} p-6`}>
              <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Confirm Delete Order
              </h3>
              
              <div className="space-y-4 mb-6">
                <p className={`${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Are you sure you want to delete this order? This action cannot be undone.
                </p>
                
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                  <h4 className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Order Details:</h4>
                  <ul className="space-y-2">
                    <li className="flex justify-between">
                      <span className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Order ID:</span>
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>#{orderToDelete.id.substring(0, 8)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Date:</span>
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatDate(orderToDelete.timestamp)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Amount:</span>
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{parseFloat(orderToDelete.grandTotal || 0).toFixed(2)}</span>
                    </li>
                  </ul>
                </div>
                
                <div className={`${isDarkMode ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-800'} p-3 rounded-lg border`}>
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm">
                      This will permanently delete the order and all its associated data.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button 
                  onClick={cancelDelete}
                  disabled={deleteLoading}
                  className={`px-4 py-2 rounded-lg ${
                    isDarkMode 
                      ? 'bg-white/10 text-white hover:bg-white/20' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  } transition-colors`}
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDeleteOrder}
                  disabled={deleteLoading}
                  className={`px-4 py-2 rounded-lg flex items-center ${
                    isDarkMode 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'bg-red-500 text-white hover:bg-red-600'
                  } transition-colors`}
                >
                  {deleteLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    'Delete Order'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientNameOrders; 