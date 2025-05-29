import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAllClients } from './firebase/clientsFirebase';
import { useTheme } from './context/ThemeContext';
import ThemeToggle from './components/ThemeToggle';
import { BsCurrencyRupee, BsSearch, BsFilter, BsChevronDown, BsCalendar, BsQuestionCircle } from 'react-icons/bs';

const CustomDropdown = ({ label, options, value, onChange, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const { isDarkMode } = useTheme();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-4 py-2 rounded-lg ${
          isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
        } transition-colors duration-200`}
      >
        <div className="flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          <span>{options.find(opt => opt.value === value)?.label || label}</span>
        </div>
        <BsChevronDown className={`transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className={`absolute z-10 mt-1 w-full rounded-lg shadow-lg ${
          isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200'
        }`}>
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`px-4 py-2 cursor-pointer ${
                value === option.value 
                  ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800' 
                  : isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'
              } ${isDarkMode ? 'border-gray-600' : 'border-gray-100'} ${
                option.value !== options[options.length - 1].value ? 'border-b' : ''
              }`}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const DateRangePicker = ({ startDate, endDate, onStartDateChange, onEndDateChange, onClear }) => {
  const { isDarkMode } = useTheme();
  
  return (
    <div className={`flex flex-col p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
      <div className="flex items-center mb-2">
        <BsCalendar className="mr-2" />
        <span className="text-sm font-medium">Date Range</span>
      </div>
      <div className="flex space-x-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className={`px-3 py-2 rounded-lg text-sm ${isDarkMode ? 'bg-gray-600 text-white border-gray-500' : 'bg-white border-gray-300'} border`}
          placeholder="From"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className={`px-3 py-2 rounded-lg text-sm ${isDarkMode ? 'bg-gray-600 text-white border-gray-500' : 'bg-white border-gray-300'} border`}
          placeholder="To"
        />
        {(startDate || endDate) && (
          <button 
            onClick={onClear}
            className={`px-2 rounded-lg ${isDarkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

const AllPaymentHistory = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState('desc');
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, cleared
  const [orderTypeFilter, setOrderTypeFilter] = useState('all'); // all, sell, purchase
  const [showFilters, setShowFilters] = useState(false);
  const [showSearchHelp, setShowSearchHelp] = useState(false);
  const [searchMode, setSearchMode] = useState('all'); // all, client, date, amount
  
  useEffect(() => {
    fetchAllOrders();
  }, []);
  
  const fetchAllOrders = async () => {
    setLoading(true);
    try {
      const allClients = await fetchAllClients();
      setOrders(allClients);
      
      // Calculate totals
      let total = 0;
      let pending = 0;
      let paid = 0;
      
      allClients.forEach(order => {
        const grandTotal = parseFloat(order.grandTotal) || 0;
        const amountPaid = parseFloat(order.amountPaid) || 0;
        
        total += grandTotal;
        paid += amountPaid;
        pending += Math.max(0, grandTotal - amountPaid);
      });
      
      setTotalAmount(total);
      setPaidAmount(paid);
      setPendingAmount(pending);
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Failed to load orders. Please try again.');
      setLoading(false);
    }
  };
  
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  const handleSearchModeChange = (mode) => {
    setSearchMode(mode);
    // Clear search term when changing modes for better UX
    if (mode !== searchMode) {
      setSearchTerm('');
    }
  };
  
  const handleDateFilterChange = (field, value) => {
    setDateFilter(prev => ({ ...prev, [field]: value }));
  };
  
  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter({ startDate: '', endDate: '' });
    setStatusFilter('all');
    setOrderTypeFilter('all');
    setSearchMode('all');
  };
  
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'timestamp' ? 'desc' : 'asc');
    }
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateForSearch = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Check if a string matches date format DD/MM/YYYY or DD/MM
  const isDateSearch = (term) => {
    // Match patterns like DD/MM/YYYY, D/M/YYYY, DD/M/YYYY, D/MM/YYYY
    const fullDateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    // Match patterns like DD/MM, D/M, DD/M, D/MM
    const shortDateRegex = /^(\d{1,2})\/(\d{1,2})$/;
    
    return fullDateRegex.test(term) || shortDateRegex.test(term);
  };

  // Parse date string in DD/MM/YYYY or DD/MM format to Date object
  const parseDateString = (dateStr) => {
    const parts = dateStr.split('/').map(part => parseInt(part, 10));
    
    if (parts.length === 3) {
      // DD/MM/YYYY format
      const [day, month, year] = parts;
      // Month is 0-indexed in JavaScript Date
      return new Date(year, month - 1, day);
    } else if (parts.length === 2) {
      // DD/MM format - use current year
      const [day, month] = parts;
      const currentYear = new Date().getFullYear();
      return new Date(currentYear, month - 1, day);
    }
    
    return null;
  };

  // Check if a value is a valid number for amount search
  const isAmountSearch = (term) => {
    return /^[\d.,]+$/.test(term);
  };
  
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];
    
    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();

      // Filter based on search mode
      if (searchMode === 'date' || (searchMode === 'all' && isDateSearch(term))) {
        const searchDate = parseDateString(term);
        if (searchDate) {
          filtered = filtered.filter(order => {
            if (!order.orderDate && !order.timestamp) return false;
            
            const orderDate = new Date(order.orderDate || order.timestamp);
            
            // For DD/MM format (without year), only compare month and day
            if (term.split('/').length === 2) {
              return (
                orderDate.getMonth() === searchDate.getMonth() &&
                orderDate.getDate() === searchDate.getDate()
              );
            }
            
            // For DD/MM/YYYY format, compare year, month and day
            return (
              orderDate.getFullYear() === searchDate.getFullYear() &&
              orderDate.getMonth() === searchDate.getMonth() &&
              orderDate.getDate() === searchDate.getDate()
            );
          });
        }
      } else if (searchMode === 'amount' || (searchMode === 'all' && isAmountSearch(term))) {
        // Search by amount - convert term to number for comparison
        const searchAmount = parseFloat(term.replace(/,/g, ''));
        if (!isNaN(searchAmount)) {
          filtered = filtered.filter(order => {
            const grandTotal = parseFloat(order.grandTotal) || 0;
            const amountPaid = parseFloat(order.amountPaid) || 0;
            const balanceDue = grandTotal - amountPaid;
            
            // Check if any amount matches or is close to the search term
            return (
              Math.abs(grandTotal - searchAmount) < 0.01 ||
              Math.abs(amountPaid - searchAmount) < 0.01 ||
              Math.abs(balanceDue - searchAmount) < 0.01
            );
          });
        }
      } else if (searchMode === 'client' || searchMode === 'all') {
        // Search by client info
        filtered = filtered.filter(order => 
          (order.clientName && order.clientName.toLowerCase().includes(term)) ||
          (order.clientPhone && order.clientPhone.includes(term)) ||
          (order.clientGst && order.clientGst.toLowerCase().includes(term)) ||
          // Also check if formatted date contains the search term
          (searchMode === 'all' && order.orderDate && formatDateForSearch(order.orderDate).includes(term)) ||
          (searchMode === 'all' && order.timestamp && formatDateForSearch(order.timestamp).includes(term))
        );
      }
    }
    
    // Apply date filter
    if (dateFilter.startDate || dateFilter.endDate) {
      filtered = filtered.filter(order => {
        const orderDate = order.timestamp || order.orderDate;
        if (!orderDate) return false;
        
        const orderDateTime = new Date(orderDate).getTime();
        
        if (dateFilter.startDate && dateFilter.endDate) {
          const startDate = new Date(dateFilter.startDate).setHours(0, 0, 0, 0);
          const endDate = new Date(dateFilter.endDate).setHours(23, 59, 59, 999);
          return orderDateTime >= startDate && orderDateTime <= endDate;
        } else if (dateFilter.startDate) {
          const startDate = new Date(dateFilter.startDate).setHours(0, 0, 0, 0);
          return orderDateTime >= startDate;
        } else if (dateFilter.endDate) {
          const endDate = new Date(dateFilter.endDate).setHours(23, 59, 59, 999);
          return orderDateTime <= endDate;
        }
        
        return true;
      });
    }
    
    // Apply payment status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.paymentStatus === statusFilter);
    }
    
    // Apply order type filter
    if (orderTypeFilter !== 'all') {
      filtered = filtered.filter(order => order.orderStatus === orderTypeFilter);
    }
    
    return filtered;
  }, [orders, searchTerm, dateFilter, statusFilter, orderTypeFilter, searchMode]);
  
  const sortedOrders = useMemo(() => {
    if (!filteredOrders.length) return [];
    
    return [...filteredOrders].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'timestamp':
          comparison = new Date(a.orderDate || a.timestamp) - new Date(b.orderDate || b.timestamp);
          break;
        case 'clientName':
          comparison = (a.clientName || '').localeCompare(b.clientName || '');
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
        default:
          comparison = new Date(a.orderDate || a.timestamp) - new Date(b.orderDate || b.timestamp);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredOrders, sortField, sortDirection]);
  
  const handleOrderClick = (orderId) => {
    navigate(`/order/${orderId}`);
  };
  
  // Status options for dropdown
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'cleared', label: 'Cleared' }
  ];
  
  // Order type options for dropdown
  const orderTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'sell', label: 'Sell' },
    { value: 'purchase', label: 'Purchase' }
  ];

  // Search mode options
  const searchModeOptions = [
    { value: 'all', label: 'All Fields' },
    { value: 'client', label: 'Client Info' },
    { value: 'date', label: 'Date' },
    { value: 'amount', label: 'Amount' }
  ];
  
  // SortButton Component
  const SortButton = ({ field, label, currentSort, direction, onClick }) => {
    return (
      <button
        onClick={() => onClick(field)}
        className={`flex items-center space-x-1 ${currentSort === field ? 'text-blue-600 font-medium' : isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
      >
        <span>{label}</span>
        {currentSort === field && (
          <span>
            {direction === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </button>
    );
  };

  // Search help tooltip
  const SearchHelpTooltip = () => (
    <div className={`absolute right-0 top-full mt-2 p-3 rounded-lg shadow-lg z-20 w-72 ${
      isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <h4 className="font-medium mb-2">Search Tips:</h4>
      <ul className="text-sm space-y-1">
        <li>• Search by client name, phone, or GST</li>
        <li>• Search by date:</li>
        <li className="pl-4">- Full date: DD/MM/YYYY (15/06/2023)</li>
        <li className="pl-4">- Short date: DD/MM (15/06)</li>
        <li>• Search by amount: 1000 or 1,000</li>
        <li className="pt-1 text-xs text-gray-500">Use the search type selector for more precise results</li>
      </ul>
    </div>
  );
  
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">All Orders and Payment History</h1>
          <ThemeToggle />
        </div>
        
        {error && (
          <div className={`p-4 mb-6 rounded-lg ${isDarkMode ? 'bg-red-900/50 text-red-100' : 'bg-red-100 text-red-700'}`}>
            {error}
          </div>
        )}
        
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md transition-all duration-300 hover:shadow-lg`}>
            <h3 className="text-lg font-medium mb-2">Total Amount</h3>
            <p className="text-2xl font-bold flex items-center justify-center">
              <BsCurrencyRupee className="text-blue-500" />
              {totalAmount.toFixed(2)}
            </p>
          </div>
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md transition-all duration-300 hover:shadow-lg`}>
            <h3 className="text-lg font-medium mb-2">Amount Paid</h3>
            <p className="text-2xl font-bold text-green-500 flex items-center justify-center">
              <BsCurrencyRupee />
              {paidAmount.toFixed(2)}
            </p>
          </div>
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md transition-all duration-300 hover:shadow-lg`}>
            <h3 className="text-lg font-medium mb-2">Balance Due</h3>
            <p className="text-2xl font-bold text-red-500 flex items-center justify-center">
              <BsCurrencyRupee />
              {pendingAmount.toFixed(2)}
            </p>
          </div>
        </div>
        
        <div className={`p-4 mb-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md transition-all duration-300`}>
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-grow">
                <div className="flex flex-col md:flex-row gap-2 w-full">
                  <div className="w-full md:w-3/4 relative">
                    <input
                      type="text"
                      placeholder={
                        searchMode === 'date' ? "Search dates (DD/MM or DD/MM/YYYY)" :
                        searchMode === 'amount' ? "Search by amount (e.g., 1000)" :
                        searchMode === 'client' ? "Search client name, phone, GST" :
                        "Search clients, dates, amounts..."
                      }
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className={`pl-10 pr-10 py-2 rounded-lg w-full ${isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-100 border-gray-200'} border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200`}
                    />
                    <BsSearch className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <div className="absolute right-3 top-2.5">
                      <button 
                        onClick={() => setShowSearchHelp(!showSearchHelp)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <BsQuestionCircle className="h-5 w-5" />
                      </button>
                    </div>
                    {showSearchHelp && <SearchHelpTooltip />}
                  </div>
                  
                  <div className="w-full md:w-1/4">
                    <CustomDropdown
                      label="Search in"
                      options={searchModeOptions}
                      value={searchMode}
                      onChange={handleSearchModeChange}
                    />
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center px-4 py-2 rounded-lg ${
                  isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-blue-100 hover:bg-blue-200 text-blue-800'
                } transition-colors duration-200 whitespace-nowrap`}
              >
                <BsFilter className="mr-2" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
            </div>
            
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 animate-fadeIn">
                <CustomDropdown
                  label="Payment Status"
                  options={statusOptions}
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value)}
                  icon={<span className={`inline-block w-3 h-3 rounded-full ${
                    statusFilter === 'cleared' ? 'bg-green-500' : statusFilter === 'pending' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`} />}
                />
                
                <CustomDropdown
                  label="Order Type"
                  options={orderTypeOptions}
                  value={orderTypeFilter}
                  onChange={(value) => setOrderTypeFilter(value)}
                />
                
                <DateRangePicker
                  startDate={dateFilter.startDate}
                  endDate={dateFilter.endDate}
                  onStartDateChange={(value) => handleDateFilterChange('startDate', value)}
                  onEndDateChange={(value) => handleDateFilterChange('endDate', value)}
                  onClear={() => setDateFilter({ startDate: '', endDate: '' })}
                />
                
                {(searchTerm || statusFilter !== 'all' || orderTypeFilter !== 'all' || dateFilter.startDate || dateFilter.endDate) && (
                  <button
                    onClick={clearFilters}
                    className={`md:col-span-3 px-4 py-2 rounded-lg ${
                      isDarkMode 
                        ? 'bg-red-900 hover:bg-red-800 text-white' 
                        : 'bg-red-100 hover:bg-red-200 text-red-800'
                    } transition-colors duration-200`}
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="mb-2 flex justify-between items-center">
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Found {sortedOrders.length} {sortedOrders.length === 1 ? 'order' : 'orders'}
          </p>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className={`rounded-lg shadow-md overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      <SortButton
                        field="timestamp"
                        label="Date"
                        currentSort={sortField}
                        direction={sortDirection}
                        onClick={handleSort}
                      />
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      <SortButton
                        field="clientName"
                        label="Client"
                        currentSort={sortField}
                        direction={sortDirection}
                        onClick={handleSort}
                      />
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                      <SortButton
                        field="grandTotal"
                        label="Total"
                        currentSort={sortField}
                        direction={sortDirection}
                        onClick={handleSort}
                      />
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                      <SortButton
                        field="amountPaid"
                        label="Paid"
                        currentSort={sortField}
                        direction={sortDirection}
                        onClick={handleSort}
                      />
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                      <SortButton
                        field="balanceDue"
                        label="Balance"
                        currentSort={sortField}
                        direction={sortDirection}
                        onClick={handleSort}
                      />
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                      <SortButton
                        field="paymentStatus"
                        label="Status"
                        currentSort={sortField}
                        direction={sortDirection}
                        onClick={handleSort}
                      />
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                      Payments
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {sortedOrders.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-sm">
                        <div className="flex flex-col items-center justify-center">
                          <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2a10 10 0 110 20 10 10 0 010-20z" />
                          </svg>
                          <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>No orders found</p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Try adjusting your search or filter criteria</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedOrders.map((order) => {
                      const balanceDue = (parseFloat(order.grandTotal) || 0) - (parseFloat(order.amountPaid) || 0);
                      return (
                        <tr 
                          key={order.id} 
                          className={`${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} cursor-pointer transition-colors duration-150`}
                          onClick={() => handleOrderClick(order.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-left">
                            {formatDate(order.orderDate || order.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-left">
                            {order.clientName}
                            {order.merged && (
                              <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isDarkMode ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800'}`}>
                                Merged
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-left">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              order.orderStatus === 'sell' 
                                ? isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                                : isDarkMode ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {order.orderStatus === 'sell' ? 'Sell' : 'Purchase'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-left">
                            <span className="flex items-center">
                              <BsCurrencyRupee />
                              {(parseFloat(order.grandTotal) || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-500">
                            <span className="flex items-center">
                              <BsCurrencyRupee />
                              {(parseFloat(order.amountPaid) || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            <span className={`flex items-center ${balanceDue <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              <BsCurrencyRupee />
                              {Math.abs(balanceDue).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-left">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              order.paymentStatus === 'cleared'
                                ? isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
                                : isDarkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {order.paymentStatus === 'cleared' ? 'Paid' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-block">
                              {order.paymentHistory && order.paymentHistory.length > 0 ? (
                                <span className={`flex items-center justify-center ${
                                  isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                                } text-xs font-medium px-2.5 py-0.5 rounded-full`}>
                                  {order.paymentHistory.length}
                                </span>
                              ) : (
                                <span className={`flex items-center justify-center ${
                                  isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-800'
                                } text-xs font-medium px-2.5 py-0.5 rounded-full`}>
                                  0
                                </span>
                              )}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllPaymentHistory; 