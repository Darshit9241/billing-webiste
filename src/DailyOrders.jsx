import React, { useEffect, useState } from 'react';
import { useTheme } from './context/ThemeContext';
import { fetchAllClients } from './firebase/clientsFirebase';
import { BsCurrencyRupee, BsArrowLeft } from 'react-icons/bs';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
};

const getDateKey = (client) => {
  // Use orderDate if available, else fallback to timestamp
  if (client.orderDate) return client.orderDate;
  const d = new Date(client.timestamp || Date.now());
  // Format as YYYY-MM-DD
  return d.toISOString().split('T')[0];
};

const DailyOrders = () => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ordersByDate, setOrdersByDate] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [allClients, setAllClients] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchAllClients();
        setAllClients(data);
        // Group by date
        const grouped = {};
        data.forEach((client) => {
          const key = getDateKey(client);
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(client);
        });
        setOrdersByDate(grouped);
      } catch (err) {
        setError('Failed to load orders.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Get sorted date keys (descending)
  const dateKeys = Object.keys(ordersByDate).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'} py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200`}>
      <div className="max-w-4xl mx-auto">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-3xl font-bold mb-8 ${isDarkMode ? 'text-white' : 'text-gray-900'} tracking-tight flex items-center gap-3`}
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className={`p-2 rounded-full hover:bg-opacity-10 ${isDarkMode ? 'hover:bg-white' : 'hover:bg-gray-900'} transition-colors duration-200`}
          >
            <BsArrowLeft className={`text-2xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`} />
          </motion.button>
          Daily Orders Overview
        </motion.h1>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-100 text-red-700 p-4 rounded-lg mb-6 shadow-sm"
          >
            {error}
          </motion.div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          <>
            {!selectedDate ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 divide-y divide-gray-200 dark:divide-slate-700"
              >
                <h2 className="text-xl font-semibold mb-6 text-emerald-600 dark:text-emerald-400">Orders by Date</h2>
                <ul className="space-y-2">
                  {dateKeys.map((date) => (
                    <motion.li 
                      key={date}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="py-4 flex items-center justify-between hover:bg-emerald-50 dark:hover:bg-slate-700/30 rounded-xl px-4 cursor-pointer transition-all duration-200"
                      onClick={() => setSelectedDate(date)}
                    >
                      <span className="font-medium text-gray-800 dark:text-white">{formatDate(date)}</span>
                      <span className="text-sm bg-emerald-100 dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full">
                        {ordersByDate[date].length} order{ordersByDate[date].length !== 1 ? 's' : ''}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                    Orders for {formatDate(selectedDate)}
                  </h2>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDate(null)} 
                    className="text-sm px-4 py-2 bg-emerald-100 dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 dark:hover:bg-slate-600 transition-colors duration-200"
                  >
                    Back to Dates
                  </motion.button>
                </div>
                <ul className="space-y-3">
                  {ordersByDate[selectedDate].map((client) => (
                    <motion.li 
                      key={client.id}
                      whileHover={{ scale: 1.01 }}
                      className="py-4 px-4 bg-gray-50 dark:bg-slate-700/30 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <span className="font-medium text-gray-800 dark:text-white">{client.clientName || 'Unnamed Client'}</span>
                        <span className="ml-2 text-xs text-gray-500 dark:text-slate-400">ID: {client.id}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 sm:mt-0">
                        <span className="text-sm font-medium text-gray-700 dark:text-slate-300 flex items-center">
                          <BsCurrencyRupee className="mr-1" />
                          {(client.grandTotal || 0).toFixed(2)}
                        </span>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => navigate(`/order/${client.id}`)} 
                          className="text-sm px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors duration-200"
                        >
                          View Order
                        </motion.button>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DailyOrders; 