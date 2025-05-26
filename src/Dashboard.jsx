import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from './components/ThemeToggle';
import { useTheme } from './context/ThemeContext';
import { fetchAllClients } from './firebase/clientsFirebase';
import { 
  BarChart, Bar, PieChart, Pie, Cell, 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { 
  FiSearch, FiBell, FiCalendar, FiCheckSquare, FiTrendingUp, 
  FiUsers, FiDollarSign, FiDownload, FiActivity, FiClock, 
  FiAlertTriangle, FiCheckCircle, FiInfo, FiX
} from 'react-icons/fi';


// Utility functions
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

// Format date function to handle both client objects and timestamps
const formatDate = (data) => {
  if (!data) return 'N/A';
  
  // If data is a client object with orderDate or timestamp
  if (typeof data === 'object') {
    // Use orderDate if available, otherwise fall back to timestamp
    const dateValue = data.orderDate ? new Date(data.orderDate) : new Date(data.timestamp || Date.now());
    
    return dateValue.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
  } 
  
  // If data is a timestamp directly
  const date = new Date(data);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
};

// Component for stat card
const StatCard = ({ icon: Icon, title, value, color }) => {
  const { isDarkMode } = useTheme();
  
  return (
    <div className={`p-3 sm:p-4 md:p-5 rounded-xl ${
      isDarkMode 
        ? `bg-gradient-to-br from-gray-700 to-gray-800` 
        : `bg-gradient-to-br from-${color}-50 to-white`
    } flex items-center shadow-sm hover:shadow-md transition-all duration-300 border ${
      isDarkMode ? 'border-gray-700' : `border-${color}-100`
    }`}>
      <div className={`p-2 sm:p-2.5 rounded-full ${
        isDarkMode 
          ? `bg-${color}-900 bg-opacity-50` 
          : `bg-${color}-100`
      } mr-3 flex items-center justify-center`}>
        <Icon className={`h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 ${isDarkMode ? `text-${color}-400` : `text-${color}-600`}`} />
      </div>
      <div className="min-w-0">
        <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} truncate`}>{title}</p>
        <p className="text-sm sm:text-base md:text-lg font-bold mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
};

// Component for revenue chart
const RevenueChart = ({ data, isDarkMode }) => (
  <div className={`p-4 sm:p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} transition-all duration-300 hover:shadow-xl`}>
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
      <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-0">Monthly Revenue</h2>
      <div className={`px-3 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
        Last 6 months
      </div>
    </div>
    <div className="h-60 sm:h-72 md:h-80 lg:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data.total}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isDarkMode ? "#4f46e5" : "#4338ca"} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={isDarkMode ? "#4f46e5" : "#4338ca"} stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorSellRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isDarkMode ? "#3b82f6" : "#2563eb"} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={isDarkMode ? "#3b82f6" : "#2563eb"} stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorPurchaseRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isDarkMode ? "#8b5cf6" : "#7c3aed"} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={isDarkMode ? "#8b5cf6" : "#7c3aed"} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
          <XAxis 
            dataKey="name" 
            stroke={isDarkMode ? '#d1d5db' : '#6b7280'} 
            tick={{ fontSize: 10 }}
            axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
            height={50}
            tickMargin={8}
            angle={-15}
            textAnchor="end"
            minTickGap={0}
          />
          <YAxis 
            stroke={isDarkMode ? '#d1d5db' : '#6b7280'} 
            tickFormatter={(value) => formatCurrency(value).replace('₹', '')}
            tick={{ fontSize: 10 }}
            axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
            width={50}
          />
          <Tooltip 
            formatter={(value) => [formatCurrency(value), 'Amount']}
            contentStyle={{ 
              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
              color: isDarkMode ? '#ffffff' : '#000000',
              border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
            cursor={{ stroke: isDarkMode ? '#6b7280' : '#9ca3af', strokeWidth: 1 }}
            wrapperStyle={{ zIndex: 10 }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
            iconSize={8}
            verticalAlign="bottom"
            height={36}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            name="Total Revenue"
            stroke={isDarkMode ? "#6366f1" : "#4f46e5"} 
            fillOpacity={0.3}
            fill="url(#colorRevenue)"
            strokeWidth={2}
            activeDot={{ 
              r: 6, 
              stroke: isDarkMode ? '#818cf8' : '#4f46e5',
              strokeWidth: 2,
              fill: isDarkMode ? '#1f2937' : '#ffffff'
            }}
            animationDuration={1500}
            animationEasing="ease-out"
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            data={data.sell}
            name="Sell Revenue"
            stroke={isDarkMode ? "#3b82f6" : "#2563eb"} 
            fillOpacity={0.3}
            fill="url(#colorSellRevenue)"
            strokeWidth={2}
            activeDot={{ 
              r: 6, 
              stroke: isDarkMode ? '#60a5fa' : '#3b82f6',
              strokeWidth: 2,
              fill: isDarkMode ? '#1f2937' : '#ffffff'
            }}
            animationDuration={1500}
            animationEasing="ease-out"
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            data={data.purchase}
            name="Purchase Revenue"
            stroke={isDarkMode ? "#8b5cf6" : "#7c3aed"} 
            fillOpacity={0.3}
            fill="url(#colorPurchaseRevenue)"
            strokeWidth={2}
            activeDot={{ 
              r: 6, 
              stroke: isDarkMode ? '#a78bfa' : '#8b5cf6',
              strokeWidth: 2,
              fill: isDarkMode ? '#1f2937' : '#ffffff'
            }}
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// Component for payment status chart
const PaymentStatusChart = ({ clearedPayments, pendingPayments, sellPayments, purchasePayments, isDarkMode }) => {
  // State to track which tab is active
  const [activeTab, setActiveTab] = useState('total'); // 'total', 'sell', or 'purchase'
  
  // Calculate values based on active tab
  let cleared, pending, total;
  
  if (activeTab === 'sell') {
    cleared = sellPayments?.cleared || 0;
    pending = sellPayments?.pending || 0;
  } else if (activeTab === 'purchase') {
    cleared = purchasePayments?.cleared || 0;
    pending = purchasePayments?.pending || 0;
  } else {
    cleared = clearedPayments || 0;
    pending = pendingPayments || 0;
  }
  
  total = cleared + pending;
  const clearedPercentage = total > 0 ? Math.round((cleared / total) * 100) : 0;
  const pendingPercentage = total > 0 ? Math.round((pending / total) * 100) : 0;
  
  return (
    <div className={`p-4 sm:p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} transition-all duration-300 hover:shadow-xl`}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
        <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-0">Payment Status</h2>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800'}`}>
          {total} clients
        </div>
      </div>
      
      {/* Tabs for switching between total, sell, and purchase */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setActiveTab('total')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            activeTab === 'total' 
              ? isDarkMode 
                ? 'bg-gray-700 text-white' 
                : 'bg-purple-100 text-purple-800'
              : isDarkMode 
                ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveTab('sell')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            activeTab === 'sell' 
              ? isDarkMode 
                ? 'bg-blue-900/50 text-blue-200' 
                : 'bg-blue-100 text-blue-800'
              : isDarkMode 
                ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          Sell
        </button>
        <button
          onClick={() => setActiveTab('purchase')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            activeTab === 'purchase' 
              ? isDarkMode 
                ? 'bg-purple-900/50 text-purple-200' 
                : 'bg-purple-100 text-purple-800'
              : isDarkMode 
                ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          Purchase
        </button>
      </div>
      
      <div className="flex flex-col md:flex-row items-center">
        <div className="w-full md:w-3/5 h-48 sm:h-56 md:h-60">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: 'Cleared', value: cleared, color: isDarkMode ? '#4ade80' : '#10b981' },
                  { name: 'Pending', value: pending, color: isDarkMode ? '#facc15' : '#f59e0b' }
                ]}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
                animationDuration={1500}
                animationEasing="ease-out"
              >
                {[
                  { name: 'Cleared', value: cleared, color: isDarkMode ? '#4ade80' : '#10b981' },
                  { name: 'Pending', value: pending, color: isDarkMode ? '#facc15' : '#f59e0b' }
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke={isDarkMode ? '#374151' : '#f3f4f6'} strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => [`${value} clients`, name]}
                contentStyle={{ 
                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                  color: isDarkMode ? '#ffffff' : '#000000',
                  border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
                wrapperStyle={{ zIndex: 10 }}
              />
              <Legend
                verticalAlign="bottom" 
                height={36}
                iconSize={10}
                iconType="circle"
                layout="horizontal"
                wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="w-full md:w-2/5 mt-4 md:mt-0 space-y-4">
          <div className={`p-3 sm:p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                <span className="font-medium text-sm sm:text-base">Cleared</span>
              </div>
              <span className="font-bold text-sm sm:text-base">{clearedPercentage}%</span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full" 
                style={{ width: `${clearedPercentage}%` }}
              ></div>
            </div>
            <div className="mt-1 text-xs text-right text-gray-500 dark:text-gray-400">
              {cleared} clients
            </div>
          </div>
          
          <div className={`p-3 sm:p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                <span className="font-medium text-sm sm:text-base">Pending</span>
              </div>
              <span className="font-bold text-sm sm:text-base">{pendingPercentage}%</span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <div 
                className="h-full bg-yellow-500 rounded-full" 
                style={{ width: `${pendingPercentage}%` }}
              ></div>
            </div>
            <div className="mt-1 text-xs text-right text-gray-500 dark:text-gray-400">
              {pending} clients
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Prepare client growth data
const prepareClientGrowthData = (clients) => {
  const clientGrowth = {};
  const sellClientGrowth = {};
  const purchaseClientGrowth = {};
  const currentDate = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Initialize last 6 months with zero values
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentDate);
    d.setMonth(currentDate.getMonth() - i);
    const monthKey = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    clientGrowth[monthKey] = 0;
    sellClientGrowth[monthKey] = 0;
    purchaseClientGrowth[monthKey] = 0;
  }
  
  // Count clients by month of registration
  clients.forEach(client => {
    // Use orderDate if available, otherwise fall back to timestamp
    if (!client.orderDate && !client.timestamp) return;
    
    const date = client.orderDate ? new Date(client.orderDate) : new Date(client.timestamp);
    const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    
    // Only include if it's within the last 6 months
    if (clientGrowth.hasOwnProperty(monthKey)) {
      clientGrowth[monthKey] += 1;
      
      // Separate sell and purchase clients
      if (client.orderStatus === 'sell') {
        sellClientGrowth[monthKey] += 1;
      } else if (client.orderStatus === 'purchased') {
        purchaseClientGrowth[monthKey] += 1;
      }
    }
  });
  
  // Convert to cumulative growth
  let cumulativeClients = 0;
  let cumulativeSellClients = 0;
  let cumulativePurchaseClients = 0;
  
  const totalData = Object.entries(clientGrowth).map(([name, count]) => {
    cumulativeClients += count;
    return { name, clients: cumulativeClients };
  });
  
  const sellData = Object.entries(sellClientGrowth).map(([name, count]) => {
    cumulativeSellClients += count;
    return { name, clients: cumulativeSellClients };
  });
  
  const purchaseData = Object.entries(purchaseClientGrowth).map(([name, count]) => {
    cumulativePurchaseClients += count;
    return { name, clients: cumulativePurchaseClients };
  });
  
  return {
    total: totalData,
    sell: sellData,
    purchase: purchaseData
  };
};

// Component for client growth chart
const ClientGrowthChart = ({ data, isDarkMode }) => (
  <div className={`p-4 sm:p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} transition-all duration-300 hover:shadow-xl`}>
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
      <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-0">Client Growth</h2>
      <div className={`px-3 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'}`}>
        +{data.total.length > 0 ? data.total[data.total.length - 1].clients - (data.total[0].clients || 0) : 0} new
      </div>
    </div>
    <div className="h-60 sm:h-72 md:h-80 lg:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isDarkMode ? "#10b981" : "#059669"} stopOpacity={0.2}/>
              <stop offset="95%" stopColor={isDarkMode ? "#10b981" : "#059669"} stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorSellClients" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isDarkMode ? "#3b82f6" : "#2563eb"} stopOpacity={0.2}/>
              <stop offset="95%" stopColor={isDarkMode ? "#3b82f6" : "#2563eb"} stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorPurchaseClients" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isDarkMode ? "#ec4899" : "#db2777"} stopOpacity={0.2}/>
              <stop offset="95%" stopColor={isDarkMode ? "#ec4899" : "#db2777"} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
          <XAxis 
            dataKey="name" 
            stroke={isDarkMode ? '#d1d5db' : '#6b7280'} 
            tick={{ fontSize: 10 }}
            axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
            height={50}
            tickMargin={8}
            angle={-15}
            textAnchor="end"
            minTickGap={0}
          />
          <YAxis 
            stroke={isDarkMode ? '#d1d5db' : '#6b7280'} 
            tick={{ fontSize: 10 }}
            axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
            width={35}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
              color: isDarkMode ? '#ffffff' : '#000000',
              border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
            cursor={{ stroke: isDarkMode ? '#6b7280' : '#9ca3af', strokeWidth: 1 }}
            wrapperStyle={{ zIndex: 10 }}
          />
          <Legend 
            iconType="circle"
            iconSize={8}
            wrapperStyle={{
              paddingTop: 10,
              fontSize: 12
            }}
            verticalAlign="bottom"
            height={36}
          />
          <Line 
            type="monotone" 
            dataKey="clients" 
            name="Total Clients"
            data={data.total}
            stroke={isDarkMode ? "#10b981" : "#059669"} 
            activeDot={{ 
              r: 6, 
              stroke: isDarkMode ? '#34d399' : '#10b981',
              strokeWidth: 2,
              fill: isDarkMode ? '#1f2937' : '#ffffff'
            }}
            strokeWidth={3}
            dot={{ 
              r: 4, 
              strokeWidth: 2,
              fill: isDarkMode ? '#1f2937' : '#ffffff',
              stroke: isDarkMode ? '#10b981' : '#059669'
            }}
            animationDuration={1500}
            animationEasing="ease-out"
          />
          <Line 
            type="monotone" 
            dataKey="clients" 
            name="Sell Clients"
            data={data.sell}
            stroke={isDarkMode ? "#3b82f6" : "#2563eb"} 
            activeDot={{ 
              r: 6, 
              stroke: isDarkMode ? '#60a5fa' : '#3b82f6',
              strokeWidth: 2,
              fill: isDarkMode ? '#1f2937' : '#ffffff'
            }}
            strokeWidth={2}
            dot={{ 
              r: 4, 
              strokeWidth: 2,
              fill: isDarkMode ? '#1f2937' : '#ffffff',
              stroke: isDarkMode ? '#3b82f6' : '#2563eb'
            }}
            animationDuration={1500}
            animationEasing="ease-out"
          />
          <Line 
            type="monotone" 
            dataKey="clients" 
            name="Purchase Clients"
            data={data.purchase}
            stroke={isDarkMode ? "#ec4899" : "#db2777"} 
            activeDot={{ 
              r: 6, 
              stroke: isDarkMode ? '#f472b6' : '#ec4899',
              strokeWidth: 2,
              fill: isDarkMode ? '#1f2937' : '#ffffff'
            }}
            strokeWidth={2}
            dot={{ 
              r: 4, 
              strokeWidth: 2,
              fill: isDarkMode ? '#1f2937' : '#ffffff',
              stroke: isDarkMode ? '#ec4899' : '#db2777'
            }}
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// Component for performance metrics
const PerformanceMetrics = ({ metrics, isDarkMode }) => (
  <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-semibold">Performance Metrics</h2>
      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
        isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
      }`}>
        Last 30 days
      </span>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {metrics.map((metric, index) => (
        <div 
          key={index}
          className={`p-4 rounded-lg ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className={`p-2 rounded-full ${
                isDarkMode ? `bg-${metric.color}-900` : `bg-${metric.color}-100`
              } mr-3`}>
                <metric.icon className={`h-5 w-5 ${
                  isDarkMode ? `text-${metric.color}-400` : `text-${metric.color}-600`
                }`} />
              </div>
              <span className="font-medium">{metric.name}</span>
            </div>
            <span className={`flex items-center ${
              metric.trend > 0 
                ? 'text-green-500' 
                : metric.trend < 0 
                  ? 'text-red-500' 
                  : isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {metric.trend > 0 ? '+' : ''}{metric.trend}%
              {metric.trend > 0 ? 
                <FiTrendingUp className="ml-1" /> : 
                metric.trend < 0 ?  
                  <FiTrendingUp className="ml-1 transform rotate-180" /> : 
                  null
              }
            </span>
          </div>
          <p className="text-2xl font-bold">{metric.value}</p>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {metric.description}
          </p>
        </div>
      ))}
    </div>
  </div>
);

// Component for notification item
const NotificationItem = ({ notification, isDarkMode, onClose }) => {
  const getIconAndColor = (type) => {
    switch(type) {
      case 'success': 
        return { 
          icon: <FiCheckCircle className="h-5 w-5" />, 
          bgColor: isDarkMode ? 'bg-green-900 bg-opacity-50' : 'bg-green-100',
          textColor: isDarkMode ? 'text-green-300' : 'text-green-600'
        };
      case 'warning': 
        return { 
          icon: <FiAlertTriangle className="h-5 w-5" />, 
          bgColor: isDarkMode ? 'bg-yellow-900 bg-opacity-50' : 'bg-yellow-100',
          textColor: isDarkMode ? 'text-yellow-300' : 'text-yellow-600'
        };
      case 'info': 
      default:
        return { 
          icon: <FiInfo className="h-5 w-5" />, 
          bgColor: isDarkMode ? 'bg-blue-900 bg-opacity-50' : 'bg-blue-100',
          textColor: isDarkMode ? 'text-blue-300' : 'text-blue-600'
        };
    }
  };
  
  const { icon, bgColor, textColor } = getIconAndColor(notification.type);
  
  return (
    <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'} transition-colors duration-200`}>
      <div className="flex items-start">
        <div className={`flex-shrink-0 mr-3 p-2 rounded-full ${bgColor}`}>
          <div className={textColor}>
            {icon}
          </div>
        </div>
        <div className="flex-grow">
          <p className="font-medium">{notification.message}</p>
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1 flex items-center`}>
            <FiClock className="mr-1 h-3 w-3" /> {notification.time}
          </p>
        </div>
        {onClose && (
          <button 
            onClick={() => onClose(notification.id)}
            className={`ml-2 p-1.5 rounded-full ${
              isDarkMode 
                ? 'hover:bg-gray-600 text-gray-400 hover:text-gray-200' 
                : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
            } transition-colors duration-200`}
            aria-label="Close notification"
          >
            <FiX className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// Component for notifications dropdown
const NotificationsDropdown = ({ notifications, isDarkMode, onClose, onClearAll }) => (
  <div className={`absolute right-0 top-full mt-3 w-[calc(100vw-32px)] sm:w-96 rounded-xl shadow-xl overflow-hidden z-50 notification-dropdown ${
    isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
  } transform transition-all duration-300 origin-top-right`}>
    <div className="p-3 sm:p-4 border-b flex items-center justify-between">
      <div className="flex items-center">
        <FiBell className={`mr-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
        <h3 className="font-semibold text-base">Notifications</h3>
      </div>
      <div className="flex space-x-2">
        <button 
          onClick={onClearAll}
          className={`text-xs font-medium px-2 sm:px-3 py-1 rounded-lg ${
            isDarkMode 
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } transition-colors duration-200`}
        >
          Clear all
        </button>
      </div>
    </div>
    <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto">
      {notifications.length > 0 ? (
        notifications.map(notification => (
          <NotificationItem 
            key={notification.id} 
            notification={notification} 
            isDarkMode={isDarkMode} 
            onClose={onClose} 
          />
        ))
      ) : (
        <div className="p-6 sm:p-8 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
            <FiBell className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </div>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} font-medium`}>
            No new notifications
          </p>
          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mt-1`}>
            You're all caught up!
          </p>
        </div>
      )}
    </div>
  </div>
);

// Component for recent client card
const ClientCard = ({ client, isDarkMode }) => {
  const totalAmount = client.products?.reduce((total, product) => {
    return total + (product.price * product.count);
  }, 0) || 0;
  
  // Generate a consistent color based on client name
  const generateColor = (name) => {
    const colors = ['blue', 'green', 'purple', 'pink', 'yellow', 'indigo', 'red', 'teal'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };
  
  const clientColor = generateColor(client.clientName || 'Client');
  
  return (
    <div 
      className={`p-3 sm:p-4 rounded-xl ${
        isDarkMode 
          ? 'bg-gray-700 hover:bg-gray-600' 
          : 'bg-white hover:bg-gray-50'
      } transition duration-200 border ${
        isDarkMode ? 'border-gray-700' : 'border-gray-100'
      } shadow-sm hover:shadow-md`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full ${
            isDarkMode 
              ? `bg-${clientColor}-900 bg-opacity-50` 
              : `bg-${clientColor}-100`
          } flex items-center justify-center mr-3 border-2 ${
            isDarkMode 
              ? `border-${clientColor}-700` 
              : `border-${clientColor}-200`
          }`}>
            <span className={`text-sm sm:text-base md:text-lg font-bold ${
              isDarkMode 
                ? `text-${clientColor}-300` 
                : `text-${clientColor}-700`
            }`}>
              {client.clientName?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-sm sm:text-base truncate">{client.clientName}</h3>
            <div className="flex items-center mt-0.5 sm:mt-1">
              <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} flex items-center truncate`}>
                <FiCalendar className="mr-1 h-3 w-3 flex-shrink-0" /> 
                <span className="truncate">{formatDate(client)}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="text-right ml-2 flex-shrink-0">
          <p className="font-semibold text-sm sm:text-base md:text-lg">{formatCurrency(totalAmount)}</p>
          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium inline-block mt-1 ${
            client.paymentStatus === 'cleared' 
              ? isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800' 
              : isDarkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {client.paymentStatus === 'cleared' ? 'Cleared' : 'Pending'}
          </span>
        </div>
      </div>
    </div>
  );
};

// Component for recent activity section
const RecentActivity = ({ clients, isDarkMode }) => (
  <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'} lg:col-span-2`}>
    <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
    <div className="space-y-4">
      {clients.map((client) => (
        <ClientCard key={client.id} client={client} isDarkMode={isDarkMode} />
      ))}
    </div>
  </div>
);




// Get top products
const getTopProducts = (clients) => {
  const productCount = {};
  const sellProductCount = {};
  const purchaseProductCount = {};
  
  clients.forEach(client => {
    client.products?.forEach(product => {
      if (product.name) {
        // Track total products
        productCount[product.name] = (productCount[product.name] || 0) + product.count;
        
        // Track products by order type
        if (client.orderStatus === 'sell') {
          sellProductCount[product.name] = (sellProductCount[product.name] || 0) + product.count;
        } else if (client.orderStatus === 'purchased') {
          purchaseProductCount[product.name] = (purchaseProductCount[product.name] || 0) + product.count;
        }
      }
    });
  });
  
  // Convert to array format and sort by count
  const totalProducts = Object.entries(productCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
    
  const sellProducts = Object.entries(sellProductCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
    
  const purchaseProducts = Object.entries(purchaseProductCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  return {
    total: totalProducts,
    sell: sellProducts,
    purchase: purchaseProducts
  };
};

// Component for top products
const TopProducts = ({ products, isDarkMode }) => {
  // State to track which tab is active
  const [activeTab, setActiveTab] = useState('total'); // 'total', 'sell', or 'purchase'
  
  // Calculate total units for the active tab
  const activeProducts = products[activeTab] || [];
  const totalUnits = activeProducts.reduce((sum, product) => sum + product.count, 0);
  
  return (
    <div className={`p-4 sm:p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} transition-all duration-300 hover:shadow-xl`}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
        <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-0">Top Products</h2>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-indigo-900 text-indigo-200' : 'bg-indigo-100 text-indigo-800'}`}>
          {totalUnits} total units
        </div>
      </div>
      
      {/* Tabs for switching between total, sell, and purchase */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setActiveTab('total')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            activeTab === 'total' 
              ? isDarkMode 
                ? 'bg-gray-700 text-white' 
                : 'bg-indigo-100 text-indigo-800'
              : isDarkMode 
                ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveTab('sell')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            activeTab === 'sell' 
              ? isDarkMode 
                ? 'bg-blue-900/50 text-blue-200' 
                : 'bg-blue-100 text-blue-800'
              : isDarkMode 
                ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          Sell
        </button>
        <button
          onClick={() => setActiveTab('purchase')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'purchase' 
              ? isDarkMode 
                ? 'bg-purple-900/50 text-purple-200' 
                : 'bg-purple-100 text-purple-800'
              : isDarkMode 
                ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          Purchase
        </button>
      </div>
      
      <div className="space-y-4">
        {activeProducts.length > 0 ? (
          activeProducts.map((product, index) => {
            // Calculate percentage of total
            const percentage = totalUnits > 0 ? Math.round((product.count / totalUnits) * 100) : 0;
            
            // Generate color based on index and active tab
            const getColor = (idx, tab) => {
              if (tab === 'sell') return 'blue';
              if (tab === 'purchase') return 'purple';
              
              const colors = ['blue', 'green', 'purple', 'indigo', 'pink'];
              return colors[idx % colors.length];
            };
            
            const color = getColor(index, activeTab);
            
            return (
              <div 
                key={index}
                className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                } hover:shadow-md transition-all duration-300`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full ${
                      isDarkMode ? `bg-${color}-900 bg-opacity-50` : `bg-${color}-100`
                    } flex items-center justify-center mr-3 border ${
                      isDarkMode ? `border-${color}-800` : `border-${color}-200`
                    }`}>
                      <span className={`font-bold ${
                        isDarkMode ? `text-${color}-400` : `text-${color}-600`
                      }`}>
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">{product.name}</span>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {percentage}% of total
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isDarkMode 
                      ? `bg-${color}-900 bg-opacity-30 text-${color}-300` 
                      : `bg-${color}-100 text-${color}-800`
                  }`}>
                    {product.count} units
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full mt-2">
                  <div 
                    className={`h-full rounded-full ${
                      isDarkMode ? `bg-${color}-600` : `bg-${color}-500`
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              No products found for this category
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Component for daily revenue chart
const DailyRevenueChart = ({ data, isDarkMode }) => (
  <div className={`p-4 sm:p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} transition-all duration-300 hover:shadow-xl`}>
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
      <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-0">Daily Revenue</h2>
      <div className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center ${isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
        Last 7 days
      </div>
    </div>
    <div className="h-60 sm:h-72 md:h-80 lg:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data.total}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
          <XAxis 
            dataKey="day" 
            stroke={isDarkMode ? '#d1d5db' : '#6b7280'} 
            tick={{ fontSize: 10, fontWeight: 'normal' }}
            axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
            height={50}
            tickMargin={8}
          />
          <YAxis 
            stroke={isDarkMode ? '#d1d5db' : '#6b7280'} 
            tickFormatter={(value) => formatCurrency(value).replace('₹', '')}
            tick={{ fontSize: 10, fontWeight: 'normal' }}
            axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
            width={50}
          />
          <Tooltip 
            formatter={(value) => [formatCurrency(value), 'Revenue']}
            contentStyle={{ 
              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
              color: isDarkMode ? '#ffffff' : '#000000',
              border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
            cursor={{ fill: isDarkMode ? 'rgba(55, 65, 81, 0.4)' : 'rgba(243, 244, 246, 0.8)' }}
            wrapperStyle={{ zIndex: 10 }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
            iconSize={8}
            verticalAlign="bottom"
            height={36}
          />
          <Bar 
            dataKey="value" 
            name="Total Revenue"
            fill={isDarkMode ? "#6366f1" : "#4f46e5"}
            radius={[4, 4, 0, 0]}
            animationDuration={1500}
            animationEasing="ease-out"
            minPointSize={3}
          />
          <Bar 
            dataKey="value" 
            name="Sell Revenue"
            data={data.sell}
            fill={isDarkMode ? "#3b82f6" : "#2563eb"}
            radius={[4, 4, 0, 0]}
            animationDuration={1500}
            animationEasing="ease-out"
            minPointSize={3}
          />
          <Bar 
            dataKey="value" 
            name="Purchase Revenue"
            data={data.purchase}
            fill={isDarkMode ? "#8b5cf6" : "#7c3aed"}
            radius={[4, 4, 0, 0]}
            animationDuration={1500}
            animationEasing="ease-out"
            minPointSize={3}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// Component for yearly revenue chart
const YearlyRevenueChart = ({ data, isDarkMode }) => (
  <div className={`p-4 sm:p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} transition-all duration-300 hover:shadow-xl`}>
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
      <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-0">Yearly Revenue</h2>
      <div className={`px-3 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800'}`}>
        Last 3 years
      </div>
    </div>
    <div className="h-60 sm:h-72 md:h-80 lg:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data.total}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          barSize={20}
          barGap={2}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
          <XAxis 
            dataKey="year" 
            stroke={isDarkMode ? '#d1d5db' : '#6b7280'} 
            tick={{ fontSize: 12 }}
            axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
            height={50}
            tickMargin={8}
          />
          <YAxis 
            stroke={isDarkMode ? '#d1d5db' : '#6b7280'} 
            tickFormatter={(value) => formatCurrency(value).replace('₹', '')}
            tick={{ fontSize: 12 }}
            axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
            width={50}
          />
          <Tooltip 
            formatter={(value) => [formatCurrency(value), 'Revenue']}
            contentStyle={{ 
              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
              color: isDarkMode ? '#ffffff' : '#000000',
              border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
            wrapperStyle={{ zIndex: 10 }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
            iconSize={8}
            verticalAlign="bottom"
            height={36}
          />
          <Bar 
            dataKey="value" 
            name="Total Revenue"
            fill={isDarkMode ? "#a855f7" : "#8b5cf6"}
            radius={[4, 4, 0, 0]}
            animationDuration={1500}
            animationEasing="ease-out"
          />
          <Bar 
            dataKey="value" 
            name="Sell Revenue"
            data={data.sell}
            fill={isDarkMode ? "#3b82f6" : "#2563eb"}
            radius={[4, 4, 0, 0]}
            animationDuration={1500}
            animationEasing="ease-out"
          />
          <Bar 
            dataKey="value" 
            name="Purchase Revenue"
            data={data.purchase}
            fill={isDarkMode ? "#ec4899" : "#db2777"}
            radius={[4, 4, 0, 0]}
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// Main Dashboard component
const Dashboard = () => {
  const { isDarkMode } = useTheme();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'New client registered', time: '5 min ago', type: 'info' },
    { id: 2, message: 'Payment received from John Doe', time: '1 hour ago', type: 'success' },
    { id: 3, message: '3 pending payments need attention', time: '2 hours ago', type: 'warning' }
  ]);
  const [stats, setStats] = useState({
    totalClients: 0,
    pendingPayments: 0,
    clearedPayments: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    recentClients: [],
    monthlyData: [],
    dailyRevenue: [],
    yearlyRevenue: [],
    topProducts: [],
    clientGrowth: []
  });

  const handleBackClick = () => {
    navigate('/');
  };

  // Prepare monthly revenue data
  const prepareMonthlyData = (clients) => {
    const monthlyRevenue = {};
    const monthlySellRevenue = {};
    const monthlyPurchaseRevenue = {};
    const currentDate = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize last 6 months with zero values
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentDate);
      d.setMonth(currentDate.getMonth() - i);
      const monthKey = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthlyRevenue[monthKey] = 0;
      monthlySellRevenue[monthKey] = 0;
      monthlyPurchaseRevenue[monthKey] = 0;
    }
    
    // Populate with actual data
    clients.forEach(client => {
      // Use orderDate if available, otherwise fall back to timestamp
      if (!client.orderDate && !client.timestamp) return;
      
      const date = client.orderDate ? new Date(client.orderDate) : new Date(client.timestamp);
      const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      
      // Only include if it's within the last 6 months
      if (monthlyRevenue.hasOwnProperty(monthKey)) {
        const totalAmount = client.products?.reduce((total, product) => {
          return total + (product.price * product.count);
        }, 0) || 0;
        
        monthlyRevenue[monthKey] += totalAmount;
        
        // Separate sell and purchase data
        if (client.orderStatus === 'sell') {
          monthlySellRevenue[monthKey] += totalAmount;
        } else if (client.orderStatus === 'purchased') {
          monthlyPurchaseRevenue[monthKey] += totalAmount;
        }
      }
    });
    
    // Convert to array format for chart
    return {
      total: Object.entries(monthlyRevenue).map(([name, value]) => ({ name, value })),
      sell: Object.entries(monthlySellRevenue).map(([name, value]) => ({ name, value })),
      purchase: Object.entries(monthlyPurchaseRevenue).map(([name, value]) => ({ name, value }))
    };
  };

  // Prepare daily revenue data
  const prepareDailyData = (clients) => {
    const dailyRevenue = {};
    const dailySellRevenue = {};
    const dailyPurchaseRevenue = {};
    const currentDate = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Initialize last 7 days with zero values
    for (let i = 6; i >= 0; i--) {
      const d = new Date(currentDate);
      d.setDate(currentDate.getDate() - i);
      const dayKey = `${dayNames[d.getDay()]} ${d.getDate()}`;
      dailyRevenue[dayKey] = 0;
      dailySellRevenue[dayKey] = 0;
      dailyPurchaseRevenue[dayKey] = 0;
    }
    
    // Populate with actual data
    clients.forEach(client => {
      // Use orderDate if available, otherwise fall back to timestamp
      if (!client.orderDate && !client.timestamp) return;
      
      const date = client.orderDate ? new Date(client.orderDate) : new Date(client.timestamp);
      const today = new Date();
      
      // Check if the client date is within the last 7 days
      if ((today - date) <= (7 * 24 * 60 * 60 * 1000)) {
        const dayKey = `${dayNames[date.getDay()]} ${date.getDate()}`;
        
        if (dailyRevenue.hasOwnProperty(dayKey)) {
          const totalAmount = client.products?.reduce((total, product) => {
            return total + (product.price * product.count);
          }, 0) || 0;
          
          dailyRevenue[dayKey] += totalAmount;
          
          // Separate sell and purchase data
          if (client.orderStatus === 'sell') {
            dailySellRevenue[dayKey] += totalAmount;
          } else if (client.orderStatus === 'purchased') {
            dailyPurchaseRevenue[dayKey] += totalAmount;
          }
        }
      }
    });
    
    // Convert to array format for chart
    return {
      total: Object.entries(dailyRevenue).map(([day, value]) => ({ day, value })),
      sell: Object.entries(dailySellRevenue).map(([day, value]) => ({ day, value })),
      purchase: Object.entries(dailyPurchaseRevenue).map(([day, value]) => ({ day, value }))
    };
  };

  // Prepare yearly revenue data
  const prepareYearlyData = (clients) => {
    const yearlyRevenue = {};
    const yearlySellRevenue = {};
    const yearlyPurchaseRevenue = {};
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    // Initialize last 3 years with zero values
    for (let i = 2; i >= 0; i--) {
      const year = currentYear - i;
      yearlyRevenue[year.toString()] = 0;
      yearlySellRevenue[year.toString()] = 0;
      yearlyPurchaseRevenue[year.toString()] = 0;
    }
    
    // Populate with actual data
    clients.forEach(client => {
      // Use orderDate if available, otherwise fall back to timestamp
      if (!client.orderDate && !client.timestamp) return;
      
      const date = client.orderDate ? new Date(client.orderDate) : new Date(client.timestamp);
      const year = date.getFullYear().toString();
      
      // Only include if it's within the last 3 years
      if (yearlyRevenue.hasOwnProperty(year)) {
        const totalAmount = client.products?.reduce((total, product) => {
          return total + (product.price * product.count);
        }, 0) || 0;
        
        yearlyRevenue[year] += totalAmount;
        
        // Separate sell and purchase data
        if (client.orderStatus === 'sell') {
          yearlySellRevenue[year] += totalAmount;
        } else if (client.orderStatus === 'purchased') {
          yearlyPurchaseRevenue[year] += totalAmount;
        }
      }
    });
    
    // Convert to array format for chart
    return {
      total: Object.entries(yearlyRevenue).map(([year, value]) => ({ year, value })),
      sell: Object.entries(yearlySellRevenue).map(([year, value]) => ({ year, value })),
      purchase: Object.entries(yearlyPurchaseRevenue).map(([year, value]) => ({ year, value }))
    };
  };

  // Get top products
  const getTopProducts = (clients) => {
    const productCount = {};
    const sellProductCount = {};
    const purchaseProductCount = {};
    
    clients.forEach(client => {
      client.products?.forEach(product => {
        if (product.name) {
          // Track total products
          productCount[product.name] = (productCount[product.name] || 0) + product.count;
          
          // Track products by order type
          if (client.orderStatus === 'sell') {
            sellProductCount[product.name] = (sellProductCount[product.name] || 0) + product.count;
          } else if (client.orderStatus === 'purchased') {
            purchaseProductCount[product.name] = (purchaseProductCount[product.name] || 0) + product.count;
          }
        }
      });
    });
    
    // Convert to array format and sort by count
    const totalProducts = Object.entries(productCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
      
    const sellProducts = Object.entries(sellProductCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
      
    const purchaseProducts = Object.entries(purchaseProductCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      total: totalProducts,
      sell: sellProducts,
      purchase: purchaseProducts
    };
  };

  // Prepare client growth data
  const prepareClientGrowthData = (clients) => {
    const clientGrowth = {};
    const sellClientGrowth = {};
    const purchaseClientGrowth = {};
    const currentDate = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize last 6 months with zero values
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentDate);
      d.setMonth(currentDate.getMonth() - i);
      const monthKey = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      clientGrowth[monthKey] = 0;
      sellClientGrowth[monthKey] = 0;
      purchaseClientGrowth[monthKey] = 0;
    }
    
    // Count clients by month of registration
    clients.forEach(client => {
      // Use orderDate if available, otherwise fall back to timestamp
      if (!client.orderDate && !client.timestamp) return;
      
      const date = client.orderDate ? new Date(client.orderDate) : new Date(client.timestamp);
      const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      
      // Only include if it's within the last 6 months
      if (clientGrowth.hasOwnProperty(monthKey)) {
        clientGrowth[monthKey] += 1;
        
        // Separate sell and purchase clients
        if (client.orderStatus === 'sell') {
          sellClientGrowth[monthKey] += 1;
        } else if (client.orderStatus === 'purchased') {
          purchaseClientGrowth[monthKey] += 1;
        }
      }
    });
    
    // Convert to cumulative growth
    let cumulativeClients = 0;
    let cumulativeSellClients = 0;
    let cumulativePurchaseClients = 0;
    
    const totalData = Object.entries(clientGrowth).map(([name, count]) => {
      cumulativeClients += count;
      return { name, clients: cumulativeClients };
    });
    
    const sellData = Object.entries(sellClientGrowth).map(([name, count]) => {
      cumulativeSellClients += count;
      return { name, clients: cumulativeSellClients };
    });
    
    const purchaseData = Object.entries(purchaseClientGrowth).map(([name, count]) => {
      cumulativePurchaseClients += count;
      return { name, clients: cumulativePurchaseClients };
    });
    
    return {
      total: totalData,
      sell: sellData,
      purchase: purchaseData
    };
  };

  // Handle click outside notifications dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close notification
  const closeNotification = (id) => {
    setNotifications(notifications.filter(notification => notification.id !== id));
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Export dashboard data
  const exportData = (format) => {
    // Prepare data to export
    const data = {
      stats: {
        totalClients: stats.totalClients,
        totalRevenue: stats.totalRevenue,
        pendingRevenue: stats.pendingRevenue,
        clearedPayments: stats.clearedPayments,
        pendingPayments: stats.pendingPayments
      },
      clients: clients.map(client => ({
        id: client.id,
        name: client.clientName,
        timestamp: client.timestamp,
        paymentStatus: client.paymentStatus,
        totalAmount: client.products?.reduce((total, product) => {
          return total + (product.price * product.count);
        }, 0) || 0,
        amountPaid: client.amountPaid || 0
      })),
      monthlyRevenue: stats.monthlyData,
      dailyRevenue: stats.dailyRevenue,
      yearlyRevenue: stats.yearlyRevenue,
      topProducts: stats.topProducts
    };
    
    // Convert to selected format
    let content, filename, type;
    
    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      filename = 'dashboard-data.json';
      type = 'application/json';
    } else if (format === 'csv') {
      // Simple CSV conversion for client data
      const headers = ['ID', 'Name', 'Date', 'Status', 'Total Amount', 'Amount Paid'];
      const csvRows = [headers.join(',')];
      
      data.clients.forEach(client => {
        const row = [
          client.id,
          `"${client.name}"`,
          new Date(client.timestamp).toLocaleDateString(),
          client.paymentStatus,
          client.totalAmount,
          client.amountPaid
        ];
        csvRows.push(row.join(','));
      });
      
      content = csvRows.join('\n');
      filename = 'clients-data.csv';
      type = 'text/csv';
    }
    
    // Create and trigger download
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const fetchedClients = await fetchAllClients();
        setClients(fetchedClients);
        
        // Calculate statistics
        const nonMergedClients = fetchedClients.filter(client => !client.merged);
        const pendingClients = nonMergedClients.filter(client => client.paymentStatus !== 'cleared');
        const clearedClients = nonMergedClients.filter(client => client.paymentStatus === 'cleared');
        
        // Filter clients by order status
        const sellClients = nonMergedClients.filter(client => client.orderStatus === 'sell');
        const purchaseClients = nonMergedClients.filter(client => client.orderStatus === 'purchased');
        
        // Calculate payment status for sell clients
        const sellClearedClients = sellClients.filter(client => client.paymentStatus === 'cleared');
        const sellPendingClients = sellClients.filter(client => client.paymentStatus !== 'cleared');
        
        // Calculate payment status for purchase clients
        const purchaseClearedClients = purchaseClients.filter(client => client.paymentStatus === 'cleared');
        const purchasePendingClients = purchaseClients.filter(client => client.paymentStatus !== 'cleared');
        
        // Calculate sell orders statistics
        const sellOrdersTotal = sellClients.length;
        const sellOrdersAmount = sellClients.reduce((sum, client) => {
          const totalAmount = client.products?.reduce((total, product) => {
            return total + (product.price * product.count);
          }, 0) || 0;
          return sum + totalAmount;
        }, 0);
        const sellOrdersPaid = sellClients.reduce((sum, client) => sum + (client.amountPaid || 0), 0);
        const sellOrdersReceivable = sellOrdersAmount - sellOrdersPaid;
        
        // Calculate purchase orders statistics
        const purchaseOrdersTotal = purchaseClients.length;
        const purchaseOrdersAmount = purchaseClients.reduce((sum, client) => {
          const totalAmount = client.products?.reduce((total, product) => {
            return total + (product.price * product.count);
          }, 0) || 0;
          return sum + totalAmount;
        }, 0);
        const purchaseOrdersPaid = purchaseClients.reduce((sum, client) => sum + (client.amountPaid || 0), 0);
        const purchaseOrdersPayable = purchaseOrdersAmount - purchaseOrdersPaid;
        
        const totalRevenue = nonMergedClients.reduce((sum, client) => {
          const totalAmount = client.products?.reduce((total, product) => {
            return total + (product.price * product.count);
          }, 0) || 0;
          return sum + totalAmount;
        }, 0);
        
        const pendingRevenue = pendingClients.reduce((sum, client) => {
          const totalAmount = client.products?.reduce((total, product) => {
            return total + (product.price * product.count);
          }, 0) || 0;
          return sum + (totalAmount - (client.amountPaid || 0));
        }, 0);
        
        // Sort clients by timestamp (newest first) and take the first 5
        const sortedClients = [...nonMergedClients].sort((a, b) => {
          const dateA = a.orderDate ? new Date(a.orderDate).getTime() : (a.timestamp || 0);
          const dateB = b.orderDate ? new Date(b.orderDate).getTime() : (b.timestamp || 0);
          return dateB - dateA;
        });

        // Prepare monthly revenue data with sell/purchase separation
        const monthlyData = prepareMonthlyData(nonMergedClients);
        
        // Prepare daily revenue data with sell/purchase separation
        const dailyRevenue = prepareDailyData(nonMergedClients);
        
        // Prepare yearly revenue data with sell/purchase separation
        const yearlyRevenue = prepareYearlyData(nonMergedClients);
        
        // Prepare client growth data with sell/purchase separation
        const clientGrowth = prepareClientGrowthData(nonMergedClients);
        
        // Get top products with sell/purchase separation
        const topProducts = getTopProducts(nonMergedClients);
        
        
        setStats({
          totalClients: nonMergedClients.length,
          pendingPayments: pendingClients.length,
          clearedPayments: clearedClients.length,
          totalRevenue,
          pendingRevenue,
          recentClients: sortedClients.slice(0, 5),
          monthlyData,
          dailyRevenue,
          yearlyRevenue,
          topProducts,
          clientGrowth,
          // Add payment status data for sell and purchase
          paymentStatus: {
            sell: {
              cleared: sellClearedClients.length,
              pending: sellPendingClients.length
            },
            purchase: {
              cleared: purchaseClearedClients.length,
              pending: purchasePendingClients.length
            }
          },
          // Add new properties for sell and purchase orders
          sellOrders: {
            total: sellOrdersTotal,
            amount: sellOrdersAmount,
            paid: sellOrdersPaid,
            receivable: sellOrdersReceivable,
            cleared: sellClearedClients.length,
            pending: sellPendingClients.length
          },
          purchaseOrders: {
            total: purchaseOrdersTotal,
            amount: purchaseOrdersAmount,
            paid: purchaseOrdersPaid,
            payable: purchaseOrdersPayable,
            cleared: purchaseClearedClients.length,
            pending: purchasePendingClients.length
          }
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching clients:', err);
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    return clients.filter(client => 
      client.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phoneNumber?.includes(searchQuery)
    );
  }, [clients, searchQuery]);

  // Handle search input change
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  // Performance metrics data
  const performanceMetrics = [
    {
      name: 'Avg. Order Value',
      value: formatCurrency(stats.totalClients ? stats.totalRevenue / stats.totalClients : 0),
      trend: 12,
      description: 'Per client average',
      icon: FiDollarSign,
      color: 'green'
    },
    {
      name: 'Payment Time',
      value: '3.5 days',
      trend: -8,
      description: 'Average time to payment',
      icon: FiClock,
      color: 'blue'
    },
    {
      name: 'Conversion Rate',
      value: '68%',
      trend: 5,
      description: 'Leads to clients',
      icon: FiActivity,
      color: 'purple'
    },
    {
      name: 'Client Retention',
      value: '92%',
      trend: 3,
      description: 'Returning clients',
      icon: FiUsers,
      color: 'yellow'
    }
  ];

  if (loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'} p-6`}>
        <div className="container mx-auto">
          {/* Header skeleton */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <div className={`h-8 w-36 rounded-md ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} animate-pulse`}></div>
              <div className="flex space-x-3">
                <div className={`h-10 w-10 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} animate-pulse`}></div>
                <div className={`h-10 w-10 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} animate-pulse`}></div>
              </div>
            </div>
            
            {/* Stats skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`p-5 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} animate-pulse h-24`}></div>
              ))}
            </div>
          </div>
          
          {/* Daily and Monthly Charts skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} animate-pulse h-80`}></div>
            <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} animate-pulse h-80`}></div>
          </div>
          
          {/* Yearly and Client Growth Charts skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} animate-pulse h-80`}></div>
            <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} animate-pulse h-80`}></div>
          </div>
          
          {/* More skeletons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} animate-pulse h-80`}></div>
            <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} animate-pulse h-80`}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'} p-6`}>
        <div className="container mx-auto flex flex-col items-center justify-center h-full">
          <div className={`p-8 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg max-w-md w-full text-center`}>
            <div className="inline-flex items-center justify-center p-4 bg-red-100 dark:bg-red-900 dark:bg-opacity-20 rounded-full mb-4">
              <FiAlertTriangle className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Failed to Load Dashboard</h2>
            <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className={`px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center justify-center mx-auto`}
            >
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'} overflow-x-hidden`}>
      {/* Modern Header with Search and Notifications */}
      <header className={`py-3 sm:py-4 px-3 sm:px-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg sticky top-0 z-50 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleBackClick}
                  className={`p-1.5 sm:p-2 rounded-lg ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
                  aria-label="Back to clients"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 sm:h-5 sm:w-5 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>

                <h1 className={`text-base sm:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center`}>
                  <span className="bg-gradient-to-r from-emerald-500 to-teal-400 inline-block text-transparent bg-clip-text text-lg sm:text-xl font-bold">
                    <a href="/dashboard" className="bg-gradient-to-r from-emerald-500 ml-1 sm:ml-2 to-teal-400 inline-block text-transparent bg-clip-text text-lg sm:text-xl font-bold">
                    Dashboard
                    </a>
                    <span className={`ml-1 md:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-md ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                      {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </span>
                </h1>
              </div>
              
              {/* Mobile menu buttons */}
              <div className="flex items-center space-x-2 sm:hidden">
                <button 
                  className={`p-1.5 rounded-full ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600' 
                      : 'bg-gray-100 hover:bg-gray-200'
                  } transition-colors duration-200 flex items-center justify-center`}
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <FiBell className="h-4 w-4" />
                  {notifications.length > 0 && (
                    <span className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-3 h-3 text-[8px] flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </button>
                <ThemeToggle />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              <div className="relative w-full sm:max-w-xs">
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className={`w-full pl-8 sm:pl-10 pr-4 py-1.5 sm:py-2 rounded-lg ${
                    isDarkMode 
                      ? 'bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:border-blue-500' 
                      : 'bg-gray-100 text-gray-800 placeholder-gray-500 border border-gray-200 focus:border-blue-500'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 text-sm`}
                />
                <FiSearch className={`absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} h-3.5 w-3.5 sm:h-4 sm:w-4`} />
              </div>
              
              {/* Desktop menu buttons */}
              <div className="hidden sm:flex items-center space-x-4">
                <div className="relative">
                  <button 
                    className={`p-2 rounded-full ${
                      isDarkMode 
                        ? 'bg-gray-700 hover:bg-gray-600' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    } transition-colors duration-200 flex items-center justify-center`}
                    onClick={() => exportData('json')}
                    title="Export Data"
                  >
                    <FiDownload className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
                
                <div className="border-l h-8 mx-1 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}"></div>
                
                <ThemeToggle />
              </div>
            </div>
          </div>
          
          {/* Quick Stats Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-6 mt-3 sm:mt-4 md:mt-6">
            <StatCard 
              icon={FiUsers} 
              title="Total Clients" 
              value={stats.totalClients} 
              color="blue" 
            />
            
            <StatCard 
              icon={FiDollarSign} 
              title="Total Revenue" 
              value={formatCurrency(stats.totalRevenue)} 
              color="green" 
            />
            
            <StatCard 
              icon={FiTrendingUp} 
              title="Pending Revenue" 
              value={formatCurrency(stats.pendingRevenue)} 
              color="yellow" 
            />
            
            <StatCard 
              icon={FiCheckSquare} 
              title="Cleared Payments" 
              value={stats.clearedPayments} 
              color="purple" 
            />
          </div>
          
          {/* Order Type Summary Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 md:gap-6 mt-3 sm:mt-4 md:mt-6">
            {/* Sell Orders Summary Card */}
            <div className={`p-3 sm:p-4 md:p-5 rounded-xl ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'} border ${isDarkMode ? 'border-blue-800' : 'border-blue-100'}`}>
              <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 flex items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-2"></div>
                Sell Orders Summary
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                <div className={`${isDarkMode ? 'bg-blue-800/30' : 'bg-white'} rounded-xl p-2 sm:p-3 border ${isDarkMode ? 'border-blue-700' : 'border-blue-200'} shadow-sm`}>
                  <p className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>Total Orders</p>
                  <p className="text-sm sm:text-base md:text-lg font-bold mt-0.5 sm:mt-1">
                    {stats.sellOrders?.total || 0}
                  </p>
                </div>
                
                <div className={`${isDarkMode ? 'bg-blue-800/30' : 'bg-white'} rounded-xl p-2 sm:p-3 border ${isDarkMode ? 'border-blue-700' : 'border-blue-200'} shadow-sm`}>
                  <p className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>Total Amount</p>
                  <p className="text-sm sm:text-base md:text-lg font-bold mt-0.5 sm:mt-1 truncate">
                    {formatCurrency(stats.sellOrders?.amount || 0)}
                  </p>
                </div>
                
                <div className={`${isDarkMode ? 'bg-blue-800/30' : 'bg-white'} rounded-xl p-2 sm:p-3 border ${isDarkMode ? 'border-blue-700' : 'border-blue-200'} shadow-sm`}>
                  <p className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>Received</p>
                  <p className="text-sm sm:text-base md:text-lg font-bold mt-0.5 sm:mt-1 truncate text-emerald-500">
                    {formatCurrency(stats.sellOrders?.paid || 0)}
                  </p>
                </div>
                
                <div className={`${isDarkMode ? 'bg-blue-800/30' : 'bg-white'} rounded-xl p-2 sm:p-3 border ${isDarkMode ? 'border-blue-700' : 'border-blue-200'} shadow-sm`}>
                  <p className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>To Receive</p>
                  <p className="text-sm sm:text-base md:text-lg font-bold mt-0.5 sm:mt-1 truncate text-amber-500">
                    {formatCurrency(stats.sellOrders?.receivable || 0)}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Purchase Orders Summary Card */}
            <div className={`p-3 sm:p-4 md:p-5 rounded-xl ${isDarkMode ? 'bg-purple-900/20' : 'bg-purple-50'} border ${isDarkMode ? 'border-purple-800' : 'border-purple-100'}`}>
              <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 flex items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500 mr-2"></div>
                Purchase Orders Summary
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                <div className={`${isDarkMode ? 'bg-purple-800/30' : 'bg-white'} rounded-xl p-2 sm:p-3 border ${isDarkMode ? 'border-purple-700' : 'border-purple-200'} shadow-sm`}>
                  <p className={`text-xs ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>Total Orders</p>
                  <p className="text-sm sm:text-base md:text-lg font-bold mt-0.5 sm:mt-1">
                    {stats.purchaseOrders?.total || 0}
                  </p>
                </div>
                
                <div className={`${isDarkMode ? 'bg-purple-800/30' : 'bg-white'} rounded-xl p-2 sm:p-3 border ${isDarkMode ? 'border-purple-700' : 'border-purple-200'} shadow-sm`}>
                  <p className={`text-xs ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>Total Amount</p>
                  <p className="text-sm sm:text-base md:text-lg font-bold mt-0.5 sm:mt-1 truncate">
                    {formatCurrency(stats.purchaseOrders?.amount || 0)}
                  </p>
                </div>
                
                <div className={`${isDarkMode ? 'bg-purple-800/30' : 'bg-white'} rounded-xl p-2 sm:p-3 border ${isDarkMode ? 'border-purple-700' : 'border-purple-200'} shadow-sm`}>
                  <p className={`text-xs ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>Paid Amount</p>
                  <p className="text-sm sm:text-base md:text-lg font-bold mt-0.5 sm:mt-1 truncate text-emerald-500">
                    {formatCurrency(stats.purchaseOrders?.paid || 0)}
                  </p>
                </div>
                
                <div className={`${isDarkMode ? 'bg-purple-800/30' : 'bg-white'} rounded-xl p-2 sm:p-3 border ${isDarkMode ? 'border-purple-700' : 'border-purple-200'} shadow-sm`}>
                  <p className={`text-xs ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>To Pay</p>
                  <p className="text-sm sm:text-base md:text-lg font-bold mt-0.5 sm:mt-1 truncate text-amber-500">
                    {formatCurrency(stats.purchaseOrders?.payable || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-4 sm:py-6 md:py-8 px-3 sm:px-6">
        {/* Daily and Monthly Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 mb-4 sm:mb-6 md:mb-8">
          <DailyRevenueChart data={stats.dailyRevenue} isDarkMode={isDarkMode} />
          <RevenueChart data={stats.monthlyData} isDarkMode={isDarkMode} />
        </div>

        {/* Yearly Revenue and Client Growth */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 mb-4 sm:mb-6 md:mb-8">
          <YearlyRevenueChart data={stats.yearlyRevenue} isDarkMode={isDarkMode} />
          <ClientGrowthChart data={stats.clientGrowth} isDarkMode={isDarkMode} />
        </div>

        {/* Payment Status and Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 mb-4 sm:mb-6 md:mb-8">
          <PaymentStatusChart 
            clearedPayments={stats.clearedPayments} 
            pendingPayments={stats.pendingPayments}
            sellPayments={{
              cleared: stats.sellOrders?.cleared || 0,
              pending: stats.sellOrders?.pending || 0
            }}
            purchasePayments={{
              cleared: stats.purchaseOrders?.cleared || 0,
              pending: stats.purchaseOrders?.pending || 0
            }}
            isDarkMode={isDarkMode} 
          />
          <PerformanceMetrics metrics={performanceMetrics} isDarkMode={isDarkMode} />
        </div>

        {/* Recent Activity and Calendar Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 mb-4 sm:mb-6 md:mb-8">
          <div className="lg:col-span-2">
            <RecentActivity clients={stats.recentClients} isDarkMode={isDarkMode} />
          </div>

        </div>

        {/* Top Products */}
        <div className="grid grid-cols-1 gap-3 sm:gap-6 mb-4 sm:mb-6 md:mb-8">
          <TopProducts products={stats.topProducts} isDarkMode={isDarkMode} />
        </div>

        {/* Export Options */}
        <div className="mt-4 sm:mt-6 md:mt-8 flex flex-col sm:flex-row justify-center sm:justify-end space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            onClick={() => exportData('csv')}
            className={`px-4 sm:px-5 py-2 rounded-lg flex items-center justify-center ${
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600' 
                : 'bg-gray-200 hover:bg-gray-300'
            } transition duration-200`}
          >
            <FiDownload className="mr-2" />
            <span className="text-sm sm:text-base">Export as CSV</span>
          </button>
          <button
            onClick={() => exportData('json')}
            className={`px-4 sm:px-5 py-2 rounded-lg flex items-center justify-center ${
              isDarkMode 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white transition duration-200`}
          >
            <FiDownload className="mr-2" />
            <span className="text-sm sm:text-base">Export as JSON</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default Dashboard; 