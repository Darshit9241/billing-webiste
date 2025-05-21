import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './components/ThemeToggle';
import { useTheme } from './context/ThemeContext';
import { fetchAllClients } from './firebase/clientsFirebase';
import { 
  BarChart, Bar, PieChart, Pie, Cell, 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { FiSearch, FiBell, FiCalendar, FiCheckSquare, FiTrendingUp, FiUsers, FiDollarSign } from 'react-icons/fi';

// Utility functions
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

// Component for stat card
const StatCard = ({ icon: Icon, title, value, color }) => {
  const { isDarkMode } = useTheme();
  
  return (
    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : `bg-${color}-50`} flex items-center`}>
      <div className={`p-3 rounded-full ${isDarkMode ? `bg-${color}-900` : `bg-${color}-100`} mr-4`}>
        <Icon className={`h-6 w-6 ${isDarkMode ? `text-${color}-400` : `text-${color}-600`}`} />
      </div>
      <div>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{title}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
};

// Component for revenue chart
const RevenueChart = ({ data, isDarkMode }) => (
  <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
    <h2 className="text-xl font-semibold mb-4">Revenue Trend</h2>
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={isDarkMode ? "#3b82f6" : "#2563eb"} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={isDarkMode ? "#3b82f6" : "#2563eb"} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
        <XAxis dataKey="name" stroke={isDarkMode ? '#d1d5db' : '#6b7280'} />
        <YAxis stroke={isDarkMode ? '#d1d5db' : '#6b7280'} tickFormatter={(value) => formatCurrency(value).replace('₹', '')} />
        <Tooltip 
          formatter={(value) => [formatCurrency(value), 'Amount']}
          contentStyle={{ 
            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
            color: isDarkMode ? '#ffffff' : '#000000',
            border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`
          }} 
        />
        <Area 
          type="monotone" 
          dataKey="value" 
          stroke={isDarkMode ? "#3b82f6" : "#2563eb"} 
          fillOpacity={1} 
          fill="url(#colorRevenue)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

// Component for payment status chart
const PaymentStatusChart = ({ clearedPayments, pendingPayments, isDarkMode }) => (
  <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
    <h2 className="text-xl font-semibold mb-4">Payment Status</h2>
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={[
            { name: 'Cleared', value: clearedPayments },
            { name: 'Pending', value: pendingPayments }
          ]}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          fill="#8884d8"
          paddingAngle={5}
          dataKey="value"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        >
          <Cell fill={isDarkMode ? '#4ade80' : '#10b981'} />
          <Cell fill={isDarkMode ? '#facc15' : '#f59e0b'} />
        </Pie>
        <Tooltip formatter={(value) => [`${value} clients`, 'Count']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

// Component for recent client card
const ClientCard = ({ client, isDarkMode }) => {
  const totalAmount = client.products?.reduce((total, product) => {
    return total + (product.price * product.count);
  }, 0) || 0;
  
  return (
    <div 
      className={`p-4 rounded-lg ${
        isDarkMode 
          ? 'bg-gray-700 hover:bg-gray-600' 
          : 'bg-gray-50 hover:bg-gray-100'
      } transition duration-200`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-full ${
            isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
          } flex items-center justify-center mr-4`}>
            <span className="text-lg font-semibold">
              {client.clientName?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-medium">{client.clientName}</h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {formatDate(client.timestamp)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-medium">{formatCurrency(totalAmount)}</p>
          <span className={`px-2 py-1 rounded-full text-xs ${
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

// Component for calendar events
const CalendarEvents = ({ isDarkMode }) => (
  <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
    <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
    <div className="space-y-4">
      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
        <div className="flex items-center">
          <FiCalendar className={`h-5 w-5 mr-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          <div>
            <p className="font-medium">Client Meeting</p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Today, 2:00 PM
            </p>
          </div>
        </div>
      </div>
      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-green-50'}`}>
        <div className="flex items-center">
          <FiCalendar className={`h-5 w-5 mr-3 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
          <div>
            <p className="font-medium">Payment Due</p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Tomorrow, 10:00 AM
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Component for quick action button
const ActionButton = ({ to, icon: Icon, color, text, isDarkMode }) => (
  <Link 
    to={to} 
    className={`p-4 rounded-lg ${
      isDarkMode 
        ? 'bg-gray-700 hover:bg-gray-600' 
        : 'bg-gray-50 hover:bg-gray-100'
    } flex items-center transition duration-200`}
  >
    <div className={`p-3 rounded-full ${
      isDarkMode ? `bg-${color}-900` : `bg-${color}-100`
    } mr-3`}>
      <Icon className={`h-5 w-5 ${isDarkMode ? `text-${color}-400` : `text-${color}-600`}`} />
    </div>
    <span>{text}</span>
  </Link>
);

// Component for quick actions section
const QuickActions = ({ isDarkMode }) => (
  <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
    <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
    <div className="grid grid-cols-2 gap-4">
      <ActionButton to="/" icon={FiUsers} color="blue" text="Add Client" isDarkMode={isDarkMode} />
      <ActionButton to="/products" icon={FiDollarSign} color="green" text="Add Product" isDarkMode={isDarkMode} />
      <ActionButton to="/reports" icon={FiTrendingUp} color="purple" text="View Reports" isDarkMode={isDarkMode} />
      <ActionButton to="/settings" icon={FiCheckSquare} color="yellow" text="Settings" isDarkMode={isDarkMode} />
    </div>
  </div>
);

// Component for top products
const TopProducts = ({ products, isDarkMode }) => (
  <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
    <h2 className="text-xl font-semibold mb-4">Top Products</h2>
    <div className="space-y-4">
      {products.map((product, index) => (
        <div 
          key={index}
          className={`p-4 rounded-lg ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
          } flex items-center justify-between`}
        >
          <div className="flex items-center">
            <span className={`w-8 h-8 rounded-full ${
              isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
            } flex items-center justify-center mr-3`}>
              {index + 1}
            </span>
            <span className="font-medium">{product.name}</span>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm ${
            isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
          }`}>
            {product.count} units
          </span>
        </div>
      ))}
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
    topProducts: []
  });

  // Prepare monthly revenue data
  const prepareMonthlyData = (clients) => {
    const monthlyRevenue = {};
    const currentDate = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize last 6 months with zero values
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentDate);
      d.setMonth(currentDate.getMonth() - i);
      const monthKey = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthlyRevenue[monthKey] = 0;
    }
    
    // Populate with actual data
    clients.forEach(client => {
      if (!client.timestamp) return;
      
      const date = new Date(client.timestamp);
      const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      
      // Only include if it's within the last 6 months
      if (monthlyRevenue.hasOwnProperty(monthKey)) {
        const totalAmount = client.products?.reduce((total, product) => {
          return total + (product.price * product.count);
        }, 0) || 0;
        
        monthlyRevenue[monthKey] += totalAmount;
      }
    });
    
    // Convert to array format for chart
    return Object.entries(monthlyRevenue).map(([name, value]) => ({ name, value }));
  };

  // Get top products
  const getTopProducts = (clients) => {
    const productCount = {};
    clients.forEach(client => {
      client.products?.forEach(product => {
        if (product.name) {
          productCount[product.name] = (productCount[product.name] || 0) + product.count;
        }
      });
    });
    return Object.entries(productCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
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
          return (b.timestamp || 0) - (a.timestamp || 0);
        });

        // Prepare monthly revenue data
        const monthlyData = prepareMonthlyData(nonMergedClients);
        
        setStats({
          totalClients: nonMergedClients.length,
          pendingPayments: pendingClients.length,
          clearedPayments: clearedClients.length,
          totalRevenue,
          pendingRevenue,
          recentClients: sortedClients.slice(0, 5),
          monthlyData,
          topProducts: getTopProducts(nonMergedClients)
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

  if (loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'} p-4`}>
        <div className="flex justify-center items-center h-full">
          <div className="animate-pulse-custom text-xl">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'} p-4`}>
        <div className="flex justify-center items-center h-full">
          <div className="text-red-500 text-xl">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>
      {/* Modern Header with Search and Notifications */}
      <header className={`p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md sticky top-0 z-50`}>
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className={`pl-10 pr-4 py-2 rounded-lg ${
                    isDarkMode 
                      ? 'bg-gray-700 text-white placeholder-gray-400' 
                      : 'bg-gray-100 text-gray-800 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <FiSearch className={`absolute left-3 top-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              </div>
              <div className="relative">
                <button className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                  <FiBell className="h-6 w-6" />
                  {notifications.length > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </button>
              </div>
              <ThemeToggle />
            </div>
          </div>
          
          {/* Quick Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-6 px-4">
        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <RevenueChart data={stats.monthlyData} isDarkMode={isDarkMode} />
          <PaymentStatusChart 
            clearedPayments={stats.clearedPayments} 
            pendingPayments={stats.pendingPayments} 
            isDarkMode={isDarkMode} 
          />
        </div>

        {/* Recent Activity and Calendar Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <RecentActivity clients={stats.recentClients} isDarkMode={isDarkMode} />
          <CalendarEvents isDarkMode={isDarkMode} />
        </div>

        {/* Quick Actions and Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QuickActions isDarkMode={isDarkMode} />
          <TopProducts products={stats.topProducts} isDarkMode={isDarkMode} />
        </div>
      </main>
    </div>
  );
};

export default Dashboard; 