import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { fetchAllClients } from '../firebase/clientsFirebase';
import { Link } from 'react-router-dom';

const Notifications = () => {
  const { isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [activeTab, setActiveTab] = useState('payments');
  const [loading, setLoading] = useState(true);
  const notificationRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch clients with pending payments
        const clients = await fetchAllClients();
        
        // Filter clients with pending payments older than 20 days
        const currentDate = new Date();
        const pendingNotifications = clients.filter(client => {
          // Skip if payment is cleared
          if (client.paymentStatus === 'cleared') return false;
          
          // Get the date from orderDate or timestamp
          const orderDate = client.orderDate 
            ? new Date(client.orderDate) 
            : client.timestamp 
              ? new Date(client.timestamp) 
              : null;
              
          if (!orderDate) return false;
          
          // Calculate days difference
          const diffTime = currentDate - orderDate;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // Return true if payment is pending for 20 or more days
          return diffDays >= 20;
        });
        
        setNotifications(pendingNotifications);
        
        // Calculate best seller clients based on total order value
        const sortedClients = [...clients].sort((a, b) => {
          const totalA = typeof a.grandTotal === 'number' ? a.grandTotal : 0;
          const totalB = typeof b.grandTotal === 'number' ? b.grandTotal : 0;
          return totalB - totalA;
        });
        
        setBestSellers(sortedClients.slice(0, 5));
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Refresh data every hour
    const intervalId = setInterval(fetchData, 3600000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Handle clicks outside the notification popup to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    // Add event listener when popup is open
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Clean up event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const formatDate = (client) => {
    // Use orderDate if available, otherwise fall back to timestamp
    const dateValue = client.orderDate 
      ? new Date(client.orderDate) 
      : new Date(client.timestamp || Date.now());
    
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    };
    
    return dateValue.toLocaleString('en-IN', options);
  };

  const calculateDaysOverdue = (client) => {
    const currentDate = new Date();
    const orderDate = client.orderDate 
      ? new Date(client.orderDate) 
      : client.timestamp 
        ? new Date(client.timestamp) 
        : null;
        
    if (!orderDate) return 0;
    
    const diffTime = currentDate - orderDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const toggleNotifications = (e) => {
    e.stopPropagation(); // Prevent event bubbling
    setIsOpen(!isOpen);
  };

  // Get total notification count across all categories
  const getTotalNotificationCount = () => {
    return notifications.length + (bestSellers.length > 0 ? 1 : 0);
  };

  return (
    <div className="static sm:relative" ref={notificationRef}>
      {/* Notification Bell Icon with Animation */}
      <button
        onClick={toggleNotifications}
        className={`relative p-2 rounded-lg ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-200'} transition-colors`}
        aria-label="Notifications"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-5 w-5 ${isDarkMode ? 'text-white' : 'text-gray-700'} ${notifications.length > 0 ? 'animate-bell' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
          />
        </svg>
        
        {/* Notification Badge */}
        {getTotalNotificationCount() > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {getTotalNotificationCount()}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className={`fixed sm:absolute right-0 sm:right-0 top-16 sm:top-auto left-4 sm:left-auto sm:mt-2 w-[calc(100%-2rem)] sm:w-80 ${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-xl z-[9999] border ${isDarkMode ? 'border-slate-700' : 'border-gray-200'} overflow-hidden notification-popup`}
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        >
          <div className={`p-4 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'} border-b ${isDarkMode ? 'border-slate-600' : 'border-gray-200'} sticky top-0 z-10`}>
            <div className="flex justify-between items-center">
              <div>
                <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Notifications
                </h3>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>
                  {activeTab === 'payments' ? 'Payments pending for 20+ days' : 'Top performing clients'}
                </p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className={`p-1 rounded-full ${isDarkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-200'} transition-colors`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Notification Tabs */}
          <div className={`grid grid-cols-2 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'} border-b`}>
            <button 
              onClick={() => setActiveTab('payments')}
              className={`py-2 text-xs font-medium relative ${
                activeTab === 'payments' 
                  ? isDarkMode 
                    ? 'text-white' 
                    : 'text-gray-900' 
                  : isDarkMode 
                    ? 'text-slate-400' 
                    : 'text-gray-500'
              }`}
            >
              Payments
              {notifications.length > 0 && (
                <span className="absolute top-0 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              )}
              {activeTab === 'payments' && (
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${isDarkMode ? 'bg-emerald-500' : 'bg-emerald-600'}`}></div>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('bestsellers')}
              className={`py-2 text-xs font-medium relative ${
                activeTab === 'bestsellers' 
                  ? isDarkMode 
                    ? 'text-white' 
                    : 'text-gray-900' 
                  : isDarkMode 
                    ? 'text-slate-400' 
                    : 'text-gray-500'
              }`}
            >
              Best Clients
              {bestSellers.length > 0 && (
                <span className="absolute top-0 right-1 h-2 w-2 bg-blue-500 rounded-full"></span>
              )}
              {activeTab === 'bestsellers' && (
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${isDarkMode ? 'bg-emerald-500' : 'bg-emerald-600'}`}></div>
              )}
            </button>
          </div>
          
          <div className="max-h-[50vh] sm:max-h-72 overflow-y-auto hide-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
                <span className={`ml-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>Loading...</span>
              </div>
            ) : activeTab === 'payments' ? (
              notifications.length > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                  {notifications.map(client => (
                    <Link 
                      key={client.id} 
                      to={`/order/${client.id}`}
                      className={`block p-4 hover:${isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'} transition-colors`}
                      onClick={() => setIsOpen(false)} // Close popup when clicking a notification
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className={`font-medium text-left ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {client.clientName || 'Unnamed Client'}
                          </p>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} mt-1`}>
                            Order Date: {formatDate(client)}
                          </p>
                        </div>
                        <div className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-red-900/30 dark:text-red-300">
                          {calculateDaysOverdue(client)} days overdue
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <p className={`text-xs ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          Amount: ₹{typeof client.grandTotal === 'number' ? client.grandTotal.toFixed(2) : '0.00'}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800'}`}>
                          Payment Pending
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 mx-auto mb-2 ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    No pending payments over 20 days
                  </p>
                </div>
              )
            ) : (
              bestSellers.length > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                  {bestSellers.map((client, index) => (
                    <Link 
                      key={client.id} 
                      to={`/order/${client.id}`}
                      className={`block p-4 hover:${isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'} transition-colors`}
                      onClick={() => setIsOpen(false)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          <div className={`w-6 h-6 flex items-center justify-center rounded-full mr-2 ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                            index === 1 ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                            index === 2 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className={`font-medium text-left ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {client.clientName || 'Unnamed Client'}
                            </p>
                            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} mt-1`}>
                              Last Order: {formatDate(client)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <p className={`text-xs ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          Total: ₹{typeof client.grandTotal === 'number' ? client.grandTotal.toFixed(2) : '0.00'}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {index === 0 ? 'Top Client' : 'High Value'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 mx-auto mb-2 ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    No client data available
                  </p>
                </div>
              )
            )}
          </div>
          
          <div className={`p-3 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'} border-t ${isDarkMode ? 'border-slate-600' : 'border-gray-200'} sticky bottom-0 z-10`}>
            <div className="grid gap-2">
              <Link
                to="/notifications"
                className={`text-center py-2 px-3 rounded-lg text-xs font-medium ${isDarkMode ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-amber-100 hover:bg-amber-200 text-amber-800'} transition-colors`}
                onClick={() => setIsOpen(false)} // Close popup when clicking the link
              >
                All Notifications
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications; 