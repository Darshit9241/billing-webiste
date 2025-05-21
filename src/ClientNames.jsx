import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAllClients } from './firebase/clientsFirebase';
import { useTheme } from './context/ThemeContext';
import ThemeToggle from './components/ThemeToggle';

const ClientNames = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clientsData, setClientsData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredClients, setFilteredClients] = useState([]);
  
  // New state variables for enhanced functionality
  const [sortField, setSortField] = useState('clientName');
  const [sortDirection, setSortDirection] = useState('asc');
  const [viewMode, setViewMode] = useState(() => {
    // Initialize from localStorage or default to 'card'
    return localStorage.getItem('clientsViewMode') || 'card';
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  useEffect(() => {
    fetchClientNames();
  }, []);
  
  // Save view mode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('clientsViewMode', viewMode);
  }, [viewMode]);
  
  // Combined filtering and sorting effect
  useEffect(() => {
    let result = [...clientsData];
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(client => 
        client.clientName.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'clientName':
          comparison = a.clientName.localeCompare(b.clientName);
          break;
        case 'orderCount':
          comparison = a.orderCount - b.orderCount;
          break;
        case 'totalAmount':
          comparison = a.totalAmount - b.totalAmount;
          break;
        case 'pendingAmount':
          comparison = a.pendingAmount - b.pendingAmount;
          break;
        case 'lastOrderDate':
          comparison = new Date(a.lastOrderDate) - new Date(b.lastOrderDate);
          break;
        default:
          comparison = a.clientName.localeCompare(b.clientName);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    setFilteredClients(result);
    // Reset to first page when filters/sort change
    setCurrentPage(1);
  }, [searchQuery, clientsData, sortField, sortDirection]);
  
  const fetchClientNames = async () => {
    setLoading(true);
    try {
      const allClients = await fetchAllClients();
      
      // Group by client name and count orders
      const clientMap = new Map();
      
      allClients.forEach(client => {
        if (!client.clientName) return;
        
        const name = client.clientName.trim();
        if (!name) return;
        
        if (clientMap.has(name)) {
          const existing = clientMap.get(name);
          existing.orderCount += 1;
          existing.totalAmount += parseFloat(client.grandTotal || 0);
          existing.pendingAmount += 
            (client.paymentStatus !== 'cleared') 
              ? Math.max(0, parseFloat(client.grandTotal || 0) - parseFloat(client.amountPaid || 0)) 
              : 0;
          // Add client ID to client IDs array
          existing.clientIds.push(client.id);
          
          if (client.timestamp > existing.lastOrderDate) {
            existing.lastOrderDate = client.timestamp;
          }
        } else {
          clientMap.set(name, {
            clientName: name,
            orderCount: 1,
            totalAmount: parseFloat(client.grandTotal || 0),
            pendingAmount: 
              (client.paymentStatus !== 'cleared') 
                ? Math.max(0, parseFloat(client.grandTotal || 0) - parseFloat(client.amountPaid || 0)) 
                : 0,
            lastOrderDate: client.timestamp,
            clientIds: [client.id]
          });
        }
      });
      
      // Convert Map to array and sort by name
      const clientArray = Array.from(clientMap.values());
      clientArray.sort((a, b) => a.clientName.localeCompare(b.clientName));
      
      setClientsData(clientArray);
      setFilteredClients(clientArray);
      
    } catch (err) {
      console.error("Error fetching client names:", err);
      setError("Failed to load client data. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate paginated clients
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredClients.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredClients, currentPage, itemsPerPage]);
  
  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredClients.length / itemsPerPage);
  }, [filteredClients, itemsPerPage]);
  
  const handleClientClick = (clientName) => {
    navigate(`/client-name/${encodeURIComponent(clientName)}`);
  };
  
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeZone: 'Asia/Kolkata'
    });
  };
  
  const handleBackClick = () => {
    navigate('/clients');
  };

  // Sorting handler
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, set default to ascending
      setSortField(field);
      setSortDirection('asc');
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
  const SortButton = ({ field, label, currentSort, direction, onClick, isDarkMode }) => {
    const isActive = currentSort === field;
    
    return (
      <button
        onClick={() => onClick(field)}
        className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center space-x-1 ${
          isActive 
            ? `${isDarkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`
            : `${isDarkMode ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
        } transition-colors`}
      >
        <span>{label}</span>
        {isActive && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <div className={`min-h-screen ${isDarkMode ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-gray-100 to-white'} py-4 sm:py-8 px-3 sm:px-6 lg:px-8 transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleBackClick}
                className={`p-1.5 sm:p-2 rounded-lg ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
                aria-label="Back to clients"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 sm:h-5 sm:w-5 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              
              <h1 className={`text-base sm:text-lg md:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center`}>
                <span className="bg-gradient-to-r from-emerald-500 to-teal-400 inline-block text-transparent bg-clip-text font-bold">
                  Client Directory
                </span>
              </h1>
            </div>
            
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              {/* View mode toggle */}
              <div className={`p-1 rounded-lg flex ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                <button 
                  onClick={() => setViewMode('card')} 
                  className={`p-1 sm:p-1.5 rounded-md ${viewMode === 'card' ? (isDarkMode ? 'bg-slate-700' : 'bg-white shadow-sm') : ''}`}
                  aria-label="Card view"
                  title="Card view"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 sm:h-5 sm:w-5 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button 
                  onClick={() => setViewMode('compact')} 
                  className={`p-1 sm:p-1.5 rounded-md ${viewMode === 'compact' ? (isDarkMode ? 'bg-slate-700' : 'bg-white shadow-sm') : ''}`}
                  aria-label="Compact view"
                  title="Compact view"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 sm:h-5 sm:w-5 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
              
              <ThemeToggle />
            </div>
          </div>
        </div>
        
        {/* Search and Sort Controls */}
        <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
          {/* Search bar */}
          <div className="relative">
            <div className={`absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 ${isDarkMode ? 'bg-white/5' : 'bg-white'} border ${isDarkMode ? 'border-white/10' : 'border-gray-200'} rounded-xl ${isDarkMode ? 'text-white placeholder-slate-400' : 'text-gray-900 placeholder-gray-400'} focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 shadow-sm text-sm sm:text-base`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                aria-label="Clear search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 sm:h-5 sm:w-5 ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Sort controls */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <SortButton 
              field="clientName" 
              label="Name" 
              currentSort={sortField} 
              direction={sortDirection} 
              onClick={handleSort} 
              isDarkMode={isDarkMode} 
            />
            <SortButton 
              field="orderCount" 
              label="Orders" 
              currentSort={sortField} 
              direction={sortDirection} 
              onClick={handleSort} 
              isDarkMode={isDarkMode} 
            />
            <SortButton 
              field="totalAmount" 
              label="Total Value" 
              currentSort={sortField} 
              direction={sortDirection} 
              onClick={handleSort} 
              isDarkMode={isDarkMode} 
            />
            <SortButton 
              field="pendingAmount" 
              label="Pending" 
              currentSort={sortField} 
              direction={sortDirection} 
              onClick={handleSort} 
              isDarkMode={isDarkMode} 
            />
            <SortButton 
              field="lastOrderDate" 
              label="Last Order" 
              currentSort={sortField} 
              direction={sortDirection} 
              onClick={handleSort} 
              isDarkMode={isDarkMode} 
            />
          </div>
        </div>
        
        {/* Stats Summary */}
        <div className="mb-4 sm:mb-6">
          <div className={`backdrop-blur-md ${isDarkMode ? 'bg-white/5' : 'bg-white'} rounded-xl border ${isDarkMode ? 'border-white/10' : 'border-gray-200'} shadow-md p-3 sm:p-5`}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 sm:gap-4">
              <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-xl p-2 sm:p-4 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Clients</p>
                <p className={`text-lg sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{clientsData.length}</p>
              </div>
              
              <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-xl p-2 sm:p-4 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Orders</p>
                <p className={`text-lg sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {clientsData.reduce((sum, client) => sum + client.orderCount, 0)}
                </p>
              </div>
              
              <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-xl p-2 sm:p-4 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Value</p>
                <p className={`text-lg sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  ₹{clientsData.reduce((sum, client) => sum + client.totalAmount, 0).toFixed(2)}
                </p>
              </div>
              
              <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-xl p-2 sm:p-4 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Pending Amount</p>
                <p className={`text-lg sm:text-2xl font-bold text-amber-500`}>
                  ₹{clientsData.reduce((sum, client) => sum + client.pendingAmount, 0).toFixed(2)}
                </p>
              </div>
              
              <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-xl p-2 sm:p-4 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Found</p>
                <p className={`text-lg sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {filteredClients.length}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="bg-red-900/50 border-l-4 border-red-500 text-red-100 p-3 sm:p-4 mb-4 sm:mb-6 rounded-lg animate-pulse backdrop-blur-sm shadow-xl">
            <div className="flex">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm sm:text-base">{error}</span>
            </div>
          </div>
        )}
        
        {/* Loading state */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-8 sm:py-12">
            <div className="relative mb-4">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-t-4 border-b-4 border-emerald-500 animate-spin"></div>
              <div className="absolute top-0 left-0 h-16 w-16 sm:h-20 sm:w-20 rounded-full border-r-4 border-teal-300 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <div className="text-center">
              <p className="text-base sm:text-lg text-slate-300 font-medium mb-2">Loading clients...</p>
              <div className={`inline-block h-1.5 w-24 sm:w-32 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}>
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 animate-pulse" 
                  style={{ width: '70%' }}
                ></div>
              </div>
            </div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-10 sm:py-16 bg-white/5 rounded-xl border border-white/10 shadow-xl backdrop-blur-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-slate-600 opacity-50 mb-3 sm:mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2 sm:mb-3">No clients found</h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto mb-4 sm:mb-6 px-4">
              {searchQuery ? `No clients found matching "${searchQuery}".` : "There are no clients in the database yet."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg shadow-lg hover:shadow-emerald-500/30 text-sm sm:text-base"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Create First Order
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Client List in Card or Compact View */}
            {viewMode === 'card' ? (
              <div className="space-y-3 sm:space-y-4">
                {paginatedClients.map((client) => (
                  <div 
                    key={client.clientName} 
                    onClick={() => handleClientClick(client.clientName)}
                    className={`backdrop-blur-md ${isDarkMode ? 'bg-white/10' : 'bg-white'} rounded-xl shadow-xl overflow-hidden border ${isDarkMode ? 'border-white/10' : 'border-gray-200'} hover:shadow-emerald-500/10 transition-all duration-300 cursor-pointer`}
                  >
                    <div className="p-3 sm:p-5">
                      <div className="flex flex-col gap-3">
                        <div>
                          <h3 className={`font-semibold text-base sm:text-lg md:text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'} hover:text-emerald-500 transition-colors`}>
                            {client.clientName}
                          </h3>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} mt-1`}>
                            Last order: {formatDate(client.lastOrderDate)}
                          </p>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                          <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-lg py-1 sm:py-1.5 px-2 sm:px-3 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Orders</p>
                            <p className={`font-medium text-center ${isDarkMode ? 'text-white' : 'text-gray-900'} text-sm sm:text-base`}>{client.orderCount}</p>
                          </div>
                          
                          <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-lg py-1 sm:py-1.5 px-2 sm:px-3 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Value</p>
                            <p className={`font-medium text-emerald-500 text-sm sm:text-base`}>₹{client.totalAmount.toFixed(2)}</p>
                          </div>
                          
                          {client.pendingAmount > 0 && (
                            <div className={`${isDarkMode ? 'bg-amber-500/10' : 'bg-amber-50'} rounded-lg py-1 sm:py-1.5 px-2 sm:px-3 border ${isDarkMode ? 'border-amber-500/30' : 'border-amber-200'}`}>
                              <p className={`text-xs ${isDarkMode ? 'text-amber-300' : 'text-amber-600'}`}>Pending</p>
                              <p className={`font-medium text-amber-500 text-sm sm:text-base`}>₹{client.pendingAmount.toFixed(2)}</p>
                            </div>
                          )}
                        </div>
                      </div>
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
                        <th scope="col" className={`px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>Client Name</th>
                        <th scope="col" className={`px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>Orders</th>
                        <th scope="col" className={`px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>Total Value</th>
                        <th scope="col" className={`px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>Pending</th>
                        <th scope="col" className={`px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wider`}>Last Order</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-white/10' : 'divide-gray-200'}`}>
                      {paginatedClients.map((client, index) => (
                        <tr 
                          key={client.clientName} 
                          onClick={() => handleClientClick(client.clientName)}
                          className={`${index % 2 === 0 ? (isDarkMode ? 'bg-white/5' : 'bg-white') : (isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50')} cursor-pointer hover:bg-emerald-500/10`}
                        >
                          <td className={`px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{client.clientName}</td>
                          <td className={`px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-center ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{client.orderCount}</td>
                          <td className={`px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-center text-emerald-500 font-medium`}>₹{client.totalAmount.toFixed(2)}</td>
                          <td className={`px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-center ${client.pendingAmount > 0 ? 'text-amber-500 font-medium' : (isDarkMode ? 'text-slate-500' : 'text-gray-500')}`}>
                            {client.pendingAmount > 0 ? `₹${client.pendingAmount.toFixed(2)}` : '-'}
                          </td>
                          <td className={`px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-right ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{formatDate(client.lastOrderDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} order-2 sm:order-1 text-center sm:text-left`}>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredClients.length)} of {filteredClients.length} clients
                </div>
                
                <div className="flex justify-center space-x-1 order-1 sm:order-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className={`p-1.5 sm:p-2 rounded-lg ${
                      currentPage === 1 
                        ? (isDarkMode ? 'bg-white/5 text-slate-600' : 'bg-gray-100 text-gray-400') 
                        : (isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                    } transition-colors`}
                    aria-label="Previous page"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-xs sm:text-sm ${
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
                    className={`p-1.5 sm:p-2 rounded-lg ${
                      currentPage === totalPages 
                        ? (isDarkMode ? 'bg-white/5 text-slate-600' : 'bg-gray-100 text-gray-400') 
                        : (isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                    } transition-colors`}
                    aria-label="Next page"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

export default ClientNames; 