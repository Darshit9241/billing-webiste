import React, { useEffect, useState } from 'react';
import { useTheme } from './context/ThemeContext';
import { fetchAllClients } from './firebase/clientsFirebase';
import { BsCurrencyRupee, BsArrowLeft, BsCalendar3 } from 'react-icons/bs';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

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
      <div className="max-w-5xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              className={`p-2.5 rounded-xl hover:bg-opacity-10 ${
                isDarkMode ? 'hover:bg-white' : 'hover:bg-gray-900'
              } transition-all duration-200`}
            >
              <BsArrowLeft className={`text-2xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`} />
            </motion.button>
            <div>
              <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} tracking-tight`}>
                Daily Orders
              </h1>
            </div>
          </div>
        </motion.div>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-xl mb-6 shadow-sm border border-red-100 dark:border-red-800"
          >
            {error}
          </motion.div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 dark:border-emerald-800"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-emerald-500 absolute top-0 left-0"></div>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {!selectedDate ? (
              <motion.div 
                key="dates"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 divide-y divide-gray-100 dark:divide-slate-700"
              >
                <div className="flex items-center gap-3 mb-6">
                  <BsCalendar3 className="text-2xl text-emerald-500" />
                  <h2 className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">Orders by Date</h2>
                </div>
                <ul className="space-y-3">
                  {dateKeys.map((date) => (
                    <motion.li 
                      key={date}
                      whileHover={{ scale: 1.01, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}
                      whileTap={{ scale: 0.99 }}
                      className="py-4 flex items-center justify-between rounded-xl px-4 cursor-pointer transition-all duration-200"
                      onClick={() => setSelectedDate(date)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          isDarkMode ? 'bg-slate-700' : 'bg-emerald-50'
                        }`}>
                          <span className={`text-sm font-medium ${
                            isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                          }`}>
                            {new Date(date).getDate()}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-800 dark:text-white">{formatDate(date)}</span>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {ordersByDate[date].length} order{ordersByDate[date].length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm px-4 py-1.5 rounded-full ${
                        isDarkMode ? 'bg-slate-700 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        ₹{ordersByDate[date].reduce((sum, client) => sum + (client.grandTotal || 0), 0).toFixed(2)}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ) : (
              <motion.div 
                key="orders"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                      Orders for {formatDate(selectedDate)}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {ordersByDate[selectedDate].length} orders • Total: ₹
                      {ordersByDate[selectedDate].reduce((sum, client) => sum + (client.grandTotal || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedDate(null)} 
                    className="text-sm px-4 py-2 bg-emerald-50 dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-100 dark:hover:bg-slate-600 transition-colors duration-200"
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
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
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
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default DailyOrders; 