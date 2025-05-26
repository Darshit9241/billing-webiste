import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { fetchAllClients } from '../firebase/clientsFirebase';
import { Link } from 'react-router-dom';

const NotificationsPage = () => {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('payments');
  const [notifications, setNotifications] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);

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
        
        setBestSellers(sortedClients.slice(0, 10)); // Show top 10 clients
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      
      <div className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Notifications
          </h1>
          <p className={`mt-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
            View all your important notifications in one place
          </p>
        </div>

        {/* Notification Tabs */}
        <div className={`flex border-b mb-6 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-3 px-6 font-medium text-sm relative ${
              activeTab === 'payments'
                ? isDarkMode
                  ? 'text-white border-b-2 border-emerald-500'
                  : 'text-gray-900 border-b-2 border-emerald-600'
                : isDarkMode
                  ? 'text-slate-400 hover:text-slate-300'
                  : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Payment Reminders
            {notifications.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                {notifications.length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('bestsellers')}
            className={`py-3 px-6 font-medium text-sm relative ${
              activeTab === 'bestsellers'
                ? isDarkMode
                  ? 'text-white border-b-2 border-emerald-500'
                  : 'text-gray-900 border-b-2 border-emerald-600'
                : isDarkMode
                  ? 'text-slate-400 hover:text-slate-300'
                  : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Top Clients
            {bestSellers.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-blue-100 bg-blue-600 rounded-full">
                {bestSellers.length}
              </span>
            )}
          </button>
        </div>

        {/* Notification Content */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              <span className={`ml-3 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>Loading notifications...</span>
            </div>
          ) : activeTab === 'payments' ? (
            notifications.length > 0 ? (
              <div>
                <div className={`px-6 py-4 ${isDarkMode ? 'bg-slate-700 text-white' : 'bg-gray-50 text-gray-900'} border-b ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
                  <h2 className="font-medium">Clients with Pending Payments</h2>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>
                    These clients have payments pending for 20 or more days
                  </p>
                </div>
                
                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                  {notifications.map(client => (
                    <div key={client.id} className={`p-6 ${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'} transition-colors`}>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                        <div className="mb-4 sm:mb-0">
                          <Link 
                            to={`/order/${client.id}`}
                            className={`text-lg font-medium ${isDarkMode ? 'text-white hover:text-emerald-400' : 'text-gray-900 hover:text-emerald-600'}`}
                          >
                            {client.clientName || 'Unnamed Client'}
                          </Link>
                          <div className="mt-1 flex flex-wrap gap-x-4">
                            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                              Order Date: {formatDate(client)}
                            </p>
                            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                              Order ID: {client.id.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:items-end">
                          <div className="bg-red-100 text-red-800 text-xs font-medium px-3 py-1 rounded-full dark:bg-red-900/30 dark:text-red-300">
                            {calculateDaysOverdue(client)} days overdue
                          </div>
                          <p className={`text-lg font-medium mt-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            ₹{typeof client.grandTotal === 'number' ? client.grandTotal.toFixed(2) : '0.00'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                          to={`/order/${client.id}`}
                          className={`px-4 py-2 text-sm font-medium rounded-md ${
                            isDarkMode 
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                              : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                          }`}
                        >
                          View Order Details
                        </Link>
                        <button
                          className={`px-4 py-2 text-sm font-medium rounded-md ${
                            isDarkMode 
                              ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                              : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                          }`}
                        >
                          Send Payment Reminder
                        </button>
                        <button
                          className={`px-4 py-2 text-sm font-medium rounded-md ${
                            isDarkMode 
                              ? 'bg-slate-600 hover:bg-slate-700 text-white' 
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                          }`}
                        >
                          Mark as Paid
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-16 w-16 mx-auto mb-4 ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className={`text-lg font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  No Pending Payments
                </h3>
                <p className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  All your clients are up to date with their payments
                </p>
              </div>
            )
          ) : (
            bestSellers.length > 0 ? (
              <div>
                <div className={`px-6 py-4 ${isDarkMode ? 'bg-slate-700 text-white' : 'bg-gray-50 text-gray-900'} border-b ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
                  <h2 className="font-medium">Top Performing Clients</h2>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>
                    These are your highest value clients based on order total
                  </p>
                </div>
                
                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                  {bestSellers.map((client, index) => (
                    <div key={client.id} className={`p-6 ${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'} transition-colors`}>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                        <div className="mb-4 sm:mb-0 flex items-center">
                          <div className={`w-10 h-10 flex items-center justify-center rounded-full mr-4 ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                            index === 1 ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                            index === 2 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <Link 
                              to={`/order/${client.id}`}
                              className={`text-lg font-medium ${isDarkMode ? 'text-white hover:text-emerald-400' : 'text-gray-900 hover:text-emerald-600'}`}
                            >
                              {client.clientName || 'Unnamed Client'}
                            </Link>
                            <div className="mt-1 flex flex-wrap gap-x-4">
                              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                Last Order: {formatDate(client)}
                              </p>
                              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                Client ID: {client.id.slice(0, 8)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:items-end">
                          <span className={`text-xs px-3 py-1 rounded-full ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                            index < 3 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          }`}>
                            {index === 0 ? 'Top Client' : index < 3 ? 'Premium Client' : 'High Value'}
                          </span>
                          <p className={`text-lg font-medium mt-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            ₹{typeof client.grandTotal === 'number' ? client.grandTotal.toFixed(2) : '0.00'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                          to={`/order/${client.id}`}
                          className={`px-4 py-2 text-sm font-medium rounded-md ${
                            isDarkMode 
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                              : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                          }`}
                        >
                          View Client Details
                        </Link>
                        <button
                          className={`px-4 py-2 text-sm font-medium rounded-md ${
                            isDarkMode 
                              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                              : 'bg-blue-100 hover:bg-blue-200 text-blue-800'
                          }`}
                        >
                          Contact Client
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-16 w-16 mx-auto mb-4 ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className={`text-lg font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  No Client Data
                </h3>
                <p className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  There are no clients in the system yet
                </p>
              </div>
            )
          )}
        </div>
      </div>
      
    </div>
  );
};

export default NotificationsPage; 