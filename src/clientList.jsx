import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import ThemeToggle from './components/ThemeToggle';
import { useTheme } from './context/ThemeContext';
import { fetchAllClients, deleteClient, clearClientPayment, updateClient } from './firebase/clientsFirebase';
import { BsCurrencyRupee } from "react-icons/bs";

// Custom CSS for animations
const customStyles = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {F
  animation: fadeIn 0.3s ease-out forwards;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
.animate-pulse-custom {
  animation: pulse 2s ease-in-out infinite;
}

/* Date pulse animation */
@keyframes datePulse {
  0% { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(217, 119, 6, 0); }
  100% { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0); }
}
.date-pulse {
  animation: datePulse 1s ease-out;
}

/* Custom scrollbar styles */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
`;

const ClientList = () => {
  const { isDarkMode } = useTheme();
  const [savedClients, setSavedClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all'); // Add order status filter
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingClient, setEditingClient] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);
  const [viewMode, setViewMode] = useState('card'); // Add this new state for view mode
  const [showMergedOnly, setShowMergedOnly] = useState(false); // Add state for merged cards filter
  const [copiedField, setCopiedField] = useState(null); // Add state for copied field
  const navigate = useNavigate();
  const location = useLocation();

  // New state for merge functionality 
  const [selectedClientsForMerge, setSelectedClientsForMerge] = useState([]);
  const [showMergeButton, setShowMergeButton] = useState(true); // Changed from false to true
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergedClient, setMergedClient] = useState(null);
  // New state to track if merge mode is active
  const [mergeMode, setMergeMode] = useState(false);

  const [showModalDelete, setShowDeleteModal] = useState(false);
  const [selectedDeleteClientId, setSelectedDeleteClientId] = useState(null);

  const [editFormData, setEditFormData] = useState({
    clientName: '',
    clientAddress: '',
    clientPhone: '',
    clientGst: '',
    amountPaid: '',
    paymentStatus: 'pending',
    orderStatus: 'sell', // Add order status to initial state
    products: [],
    paymentHistory: []
  });
  const [editingProduct, setEditingProduct] = useState(null);
  const [productFormData, setProductFormData] = useState({
    name: '',
    price: 0,
    count: 1,
    timestamp: Date.now() // Add timestamp to the form data
  });
  const [activeTab, setActiveTab] = useState('general');
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newPayment, setNewPayment] = useState('');
  const [showPaymentStatusDropdown, setShowPaymentStatusDropdown] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [showDeletePaymentModal, setShowDeletePaymentModal] = useState(false);
  const [selectedPaymentIndex, setSelectedPaymentIndex] = useState(null);

  // Add these new state variables for product deletion confirmation
  const [showDeleteProductModal, setShowDeleteProductModal] = useState(false);
  const [selectedProductIndex, setSelectedProductIndex] = useState(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [dateSearchActive, setDateSearchActive] = useState(false);

  const [paymentDate, setPaymentDate] = useState('');

  const [showProductsModal, setShowProductsModal] = useState(false);
  const [selectedProductsClient, setSelectedProductsClient] = useState(null);

  // Function to update URL query parameters
  const updateUrlParams = (params) => {
    const searchParams = new URLSearchParams(location.search);

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        searchParams.set(key, value);
      } else {
        searchParams.delete(key);
      }
    });

    navigate({
      pathname: location.pathname,
      search: searchParams.toString()
    }, { replace: true });
  };

  // Function to read URL query parameters
  const getUrlParams = () => {
    const searchParams = new URLSearchParams(location.search);
    return {
      search: searchParams.get('search') || '',
      filter: searchParams.get('filter') || 'all',
      orderStatus: searchParams.get('orderStatus') || 'all',
      startDate: searchParams.get('startDate') || '',
      endDate: searchParams.get('endDate') || '',
      dateFilter: searchParams.get('dateFilter') === 'true',
      viewMode: searchParams.get('viewMode') || 'card',
      mergedOnly: searchParams.get('mergedOnly') === 'true'
    };
  };

  useEffect(() => {
    // Fetch clients from API when component mounts
    fetchClients();

    // Load filters and search query from URL params
    const params = getUrlParams();
    setSearchQuery(params.search);
    setActiveFilter(params.filter);
    setOrderStatusFilter(params.orderStatus);
    setStartDate(params.startDate);
    setEndDate(params.endDate);
    setIsDateFilterActive(params.dateFilter);

    // Get view mode from localStorage, fall back to URL param, then default to 'card'
    const savedViewMode = localStorage.getItem('viewMode');
    setViewMode(savedViewMode || params.viewMode || 'card');

    setShowMergedOnly(params.mergedOnly);

    // Add window resize listener for responsive behavior
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Apply filters when savedClients or activeFilter changes
    applyFilters();
  }, [savedClients, activeFilter, orderStatusFilter, searchQuery, startDate, endDate, isDateFilterActive, showMergedOnly]);

  // Update URL when filters or search change
  useEffect(() => {
    updateUrlParams({
      search: searchQuery,
      filter: activeFilter !== 'all' ? activeFilter : null,
      orderStatus: orderStatusFilter !== 'all' ? orderStatusFilter : null,
      startDate: isDateFilterActive ? startDate : null,
      endDate: isDateFilterActive ? endDate : null,
      dateFilter: isDateFilterActive ? 'true' : null,
      viewMode: viewMode !== 'card' ? viewMode : null,
      mergedOnly: showMergedOnly ? 'true' : null
    });
  }, [searchQuery, activeFilter, orderStatusFilter, startDate, endDate, isDateFilterActive, viewMode, showMergedOnly]);

  const applyFilters = () => {
    let filtered = savedClients;

    // Default behavior: exclude merged cards unless specifically requested
    if (!showMergedOnly) {
      filtered = filtered.filter(client => !client.merged);
    } else {
      // When "Merged Only" filter is active, only show merged cards
      filtered = filtered.filter(client => client.merged === true);
    }

    // First filter by payment status
    if (activeFilter === 'pending') {
      filtered = filtered.filter(client => client.paymentStatus !== 'cleared');
    } else if (activeFilter === 'cleared') {
      filtered = filtered.filter(client => client.paymentStatus === 'cleared');
    }

    // Filter by order status
    if (orderStatusFilter === 'sell') {
      filtered = filtered.filter(client => client.orderStatus === 'sell');
    } else if (orderStatusFilter === 'purchased') {
      filtered = filtered.filter(client => client.orderStatus === 'purchased');
    }

    // Apply date range filter if active
    if (isDateFilterActive && startDate && endDate) {
      const startDateTime = new Date(startDate).setHours(0, 0, 0, 0);
      const endDateTime = new Date(endDate).setHours(23, 59, 59, 999);

      filtered = filtered.filter(client => {
        // Use orderDate if available, otherwise fall back to timestamp
        const dateValue = client.orderDate ? new Date(client.orderDate).getTime() :
          client.timestamp ? new Date(client.timestamp).getTime() : Date.now();
        return dateValue >= startDateTime && dateValue <= endDateTime;
      });
    }

    // Then apply search query if it exists
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();

      // Check if the query matches a date in DD/MM/YYYY or DD/MM format
      const dateRegex = /^(\d{2})\/(\d{2})(?:\/(\d{4}))?$/;
      const dateMatch = query.match(dateRegex);

      // Check if the query matches status keywords
      const isPendingSearch = query === 'pending';
      const isClearedSearch = query === 'cleared' || query === 'paid';
      const isSellSearch = query === 'sell';
      const isPurchasedSearch = query === 'purchased' || query === 'purchase';

      if (isPendingSearch) {
        // Filter for pending payment status
        filtered = filtered.filter(client => client.paymentStatus !== 'cleared');
      } else if (isClearedSearch) {
        // Filter for cleared payment status
        filtered = filtered.filter(client => client.paymentStatus === 'cleared');
      } else if (isSellSearch) {
        // Filter for sell order status
        filtered = filtered.filter(client => client.orderStatus === 'sell');
      } else if (isPurchasedSearch) {
        // Filter for purchased order status
        filtered = filtered.filter(client => client.orderStatus === 'purchased');
      } else if (dateMatch) {
        const [_, day, month, year] = dateMatch;
        const currentYear = new Date().getFullYear();
        const searchYear = year || currentYear;
        const searchDate = new Date(`${searchYear}-${month}-${day}`);
        const searchDateStart = searchDate.setHours(0, 0, 0, 0);
        const searchDateEnd = searchDate.setHours(23, 59, 59, 999);

        filtered = filtered.filter(client => {
          // Use orderDate if available, otherwise fall back to timestamp
          const dateValue = client.orderDate ? new Date(client.orderDate).getTime() :
            client.timestamp ? new Date(client.timestamp).getTime() : Date.now();
          return dateValue >= searchDateStart && dateValue <= searchDateEnd;
        });
      } else {
        // Regular search for other fields
        filtered = filtered.filter(client =>
          (client.id && client.id.toLowerCase().includes(query)) ||
          (client.clientName && client.clientName.toLowerCase().includes(query)) ||
          (client.clientGst && client.clientGst.toLowerCase().includes(query))
        );
      }
    }

    // Sort clients by orderDate (or timestamp) in descending order (newest first)
    filtered.sort((a, b) => {
      // Get date values for both clients, preferring orderDate over timestamp
      const dateA = a.orderDate ? new Date(a.orderDate).getTime() :
        a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const dateB = b.orderDate ? new Date(b.orderDate).getTime() :
        b.timestamp ? new Date(b.timestamp).getTime() : 0;

      // Sort in descending order (newest first)
      return dateB - dateA;
    });

    setFilteredClients(filtered);
    // setShowMergeButton(filtered.length > 1 && searchQuery.trim() !== '');
  };

  // Toggle client selection for merge
  const toggleClientSelection = (clientId) => {
    if (selectedClientsForMerge.includes(clientId)) {
      setSelectedClientsForMerge(selectedClientsForMerge.filter(id => id !== clientId));
    } else {
      setSelectedClientsForMerge([...selectedClientsForMerge, clientId]);
    }
  };

  // Add a function to toggle merge mode
  const toggleMergeMode = () => {
    const newMergeMode = !mergeMode;
    setMergeMode(newMergeMode);

    // Clear selections when exiting merge mode
    if (!newMergeMode) {
      setSelectedClientsForMerge([]);
    }
  };

  // Handle merge button click
  const handleMergeButtonClick = () => {
    if (selectedClientsForMerge.length < 2) {
      setError('Please select at least two clients to merge');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Get the selected clients from filtered clients
    const clientsToMerge = filteredClients.filter(client =>
      selectedClientsForMerge.includes(client.id)
    );

    // Create a merged client object
    const mergedClientData = createMergedClient(clientsToMerge);
    setMergedClient(mergedClientData);
    setShowMergeModal(true);
  };

  // Create merged client from selected clients
  const createMergedClient = (clients) => {
    // Use the first client as the base
    const baseClient = { ...clients[0] };

    // Initialize merged values
    let allProducts = [...(baseClient.products || [])];
    let totalGrandTotal = baseClient.grandTotal || 0;
    let totalAmountPaid = baseClient.amountPaid || 0;
    let allPaymentHistory = [...(baseClient.paymentHistory || [])];

    // Combine data from all other selected clients
    for (let i = 1; i < clients.length; i++) {
      const client = clients[i];

      // Merge products
      if (client.products && client.products.length > 0) {
        allProducts = [...allProducts, ...client.products];
      }

      // Sum up the financial data
      totalGrandTotal += client.grandTotal || 0;
      totalAmountPaid += client.amountPaid || 0;

      // Merge payment history
      if (client.paymentHistory && client.paymentHistory.length > 0) {
        allPaymentHistory = [...allPaymentHistory, ...client.paymentHistory];
      }
    }

    // Sort payment history by date
    allPaymentHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Create the merged client
    const mergedClient = {
      ...baseClient,
      clientName: `Merged: ${baseClient.clientName || 'Clients'}`,
      products: allProducts,
      grandTotal: totalGrandTotal,
      amountPaid: totalAmountPaid,
      paymentHistory: allPaymentHistory,
      paymentStatus: totalAmountPaid >= totalGrandTotal ? 'cleared' : 'pending',
      orderStatus: baseClient.orderStatus || 'sell', // Preserve order status from base client
      merged: true,
      mergedFrom: clients.map(c => c.id),
      timestamp: Date.now()
    };

    return mergedClient;
  };

  // Save the merged client
  const saveMergedClient = async () => {
    try {
      setLoading(true);

      // Create a new client with the merged data
      const mergedClientWithId = {
        ...mergedClient,
        id: `merged_${Date.now()}`
      };

      // Save to Firebase
      await updateClient(mergedClientWithId);

      // Update local state
      setSavedClients([...savedClients, mergedClientWithId]);

      // Reset merge state
      setSelectedClientsForMerge([]);
      setShowMergeModal(false);
      setMergedClient(null);
      setSearchQuery('');

      // Show success message
      setError('Clients successfully merged!');
      setTimeout(() => setError(''), 3000);
    } catch (err) {
      setError(`Failed to save merged client: ${err.message}`);
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAllClients();

      // Sort clients by orderDate or timestamp (newest first) before saving
      data.sort((a, b) => {
        // Get date values for both clients, preferring orderDate over timestamp
        const dateA = a.orderDate ? new Date(a.orderDate).getTime() :
          a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const dateB = b.orderDate ? new Date(b.orderDate).getTime() :
          b.timestamp ? new Date(b.timestamp).getTime() : 0;

        // Sort in descending order (newest first)
        return dateB - dateA;
      });

      setSavedClients(data);
    } catch (err) {
      console.error("Error in fetchClients:", err);
      setError(`Error loading client orders: ${err.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Update the formatDate function to handle orderDate or timestamp
  const formatDate = (client) => {
    // Use orderDate if available, otherwise fall back to timestamp
    const dateValue = client.orderDate ? new Date(client.orderDate) : new Date(client.timestamp || Date.now());

    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    };

    return dateValue.toLocaleString('en-IN', options);
  };

  const deleteOrder = async (id) => {
    try {
      await deleteClient(id);

      // Update the UI by removing the deleted order
      setSavedClients(savedClients.filter(client => client.id !== id));
    } catch (err) {
      setError('Failed to delete order. Please try again.');
      console.error(err);

      // Clear error after 3 seconds
      setTimeout(() => setError(''), 3000);
    }
  };
  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setIsDateFilterActive(false);
  };

  const applyDateFilter = () => {
    if (startDate && endDate) {
      setIsDateFilterActive(true);
      applyFilters(); // Add this line to trigger filter application
    } else {
      setError('Please select both start and end dates');
      setTimeout(() => setError(''), 3000);
    }
  };

  const clearOrderPayment = async (id) => {
    try {
      // Find the client to update
      const clientToUpdate = savedClients.find(client => client.id === id);
      if (!clientToUpdate) return;

      const updatedClient = await clearClientPayment(clientToUpdate);

      // Update the UI with the updated order
      setSavedClients(savedClients.map(client =>
        client.id === id ? updatedClient : client
      ));
    } catch (err) {
      setError('Failed to clear order payment. Please try again.');
      console.error(err);

      // Clear error after 3 seconds
      setTimeout(() => setError(''), 3000);
    }
  };

  const deleteAllOrders = async () => {
    setLoading(true);
    let hasError = false;

    try {
      // Delete each order one by one
      const deletePromises = savedClients.map(async (client) => {
        try {
          await deleteClient(client.id);
          return true;
        } catch (err) {
          console.error(`Error deleting order ${client.id}:`, err);
          hasError = true;
          return false;
        }
      });

      await Promise.all(deletePromises);

      if (hasError) {
        setError('Some orders could not be deleted. Please refresh and try again.');
      } else {
        // Clear the clients list
        setSavedClients([]);
        setFilteredClients([]);
      }
    } catch (err) {
      setError('Failed to delete all orders. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
      // Clear error after 3 seconds if there was one
      if (hasError) {
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const handleDeleteAllClick = () => {
    setShowPasswordModal(true);
    setPassword('');
    setPasswordError('');
  };

  const handlePasswordSubmit = () => {
    if (password === '1278') {
      setShowPasswordModal(false);
      deleteAllOrders();
    } else {
      setPasswordError('Incorrect password. Please try again.');
    }
  };

  const editClient = (client) => {
    setEditingClient(client);
    setEditFormData({
      clientName: client.clientName || '',
      clientAddress: client.clientAddress || '',
      clientPhone: client.clientPhone || '',
      clientGst: client.clientGst || '',
      amountPaid: client.amountPaid || '',
      paymentStatus: client.paymentStatus || 'pending',
      orderStatus: client.orderStatus || 'sell',
      products: client.products || [],
      paymentHistory: client.paymentHistory || [],
      timestamp: client.timestamp || Date.now(),
      orderDate: client.orderDate || new Date(client.timestamp || Date.now()).toISOString().split('T')[0]
    });
    setActiveTab('general');
  };

  const closeEditForm = () => {
    setEditingClient(null);
    setEditFormData({
      clientName: '',
      clientAddress: '',
      clientPhone: '',
      clientGst: '',
      amountPaid: '',
      paymentStatus: 'pending',
      orderStatus: 'sell', // Reset order status
      products: [],
      paymentHistory: [],
      timestamp: Date.now() // Reset timestamp
    });
    setEditingProduct(null);
    setProductFormData({
      name: '',
      price: 0,
      count: 1,
      timestamp: Date.now() // Add timestamp to the form data
    });
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    // For numeric fields, convert to number
    if (name === 'amountPaid') {
      const newAmountPaid = value === '' ? '' : parseFloat(value) || 0;
      const currentAmountPaid = parseFloat(editFormData.amountPaid) || 0;

      // If this is a new payment (greater than current amount)
      if (newAmountPaid > currentAmountPaid) {
        // Create a payment entry for the difference
        const paymentEntry = {
          amount: newAmountPaid - currentAmountPaid,
          date: Date.now()
        };

        setEditFormData({
          ...editFormData,
          [name]: newAmountPaid,
          // If amount paid equals grand total, automatically set payment status to cleared
          paymentStatus: newAmountPaid >= (editingClient?.grandTotal || 0) ? 'cleared' : 'pending',
          // Add the payment to history
          paymentHistory: [...(editFormData.paymentHistory || []), paymentEntry]
        });
      } else {
        setEditFormData({
          ...editFormData,
          [name]: newAmountPaid,
          // If amount paid equals grand total, automatically set payment status to cleared
          paymentStatus: newAmountPaid >= (editingClient?.grandTotal || 0) ? 'cleared' : 'pending'
        });
      }
    } else {
      setEditFormData({ ...editFormData, [name]: value });
    }
  };

  // Product-related functions
  const editProduct = (product, index) => {
    setEditingProduct({ ...product, index });
    setProductFormData({
      name: product.name || '',
      price: product.price || 0,
      count: product.count || 1,
      discount: product.discount || 0,
      timestamp: product.timestamp || Date.now() // Capture existing timestamp or set current time
    });
  };

  const cancelProductEdit = () => {
    setEditingProduct(null);
    setProductFormData({
      name: '',
      price: 0,
      count: 1,
      discount: 0,
      timestamp: Date.now() // Add timestamp to the form data
    });
  };

  const handleProductFormChange = (e) => {
    const { name, value } = e.target;
    if (name === 'price' || name === 'count') {
      setProductFormData({
        ...productFormData,
        [name]: parseFloat(value)
      });
    } else {
      setProductFormData({
        ...productFormData,
        [name]: value
      });
    }
  };


  const saveProductChanges = () => {
    if (!editingProduct) return;

    const updatedProducts = [...editFormData.products];
    const currentTime = Date.now();

    // Ensure numeric values for price, count and discount
    const price = parseFloat(productFormData.price || 0);
    const count = parseFloat(productFormData.count || 0);
    const discount = parseFloat(productFormData.discount || 0);

    // Calculate subtotal
    const subtotal = parseFloat((price * count).toFixed(2));
    
    // Calculate total with discount (if any)
    const discountAmount = discount > 0 ? parseFloat((subtotal * (discount / 100)).toFixed(2)) : 0;
    const total = parseFloat((subtotal - discountAmount).toFixed(2));

    updatedProducts[editingProduct.index] = {
      ...editingProduct,
      name: productFormData.name,
      price: price,
      count: count,
      discount: discount,
      subtotal: subtotal,
      discountAmount: discountAmount,
      total: total,
      timestamp: productFormData.timestamp || currentTime // Use the timestamp from form data
    };

    // Recalculate the grand total accounting for discounts
    const grandTotal = parseFloat(updatedProducts.reduce((total, product) => {
      return total + (product.total || 0);
    }, 0).toFixed(2));

    // Handle amount paid and payment status consistency
    let amountPaid = parseFloat(editFormData.amountPaid) || 0;
    let paymentStatus = editFormData.paymentStatus;

    if (grandTotal < amountPaid) {
      // If there are no products or grandTotal is 0, reset amount paid
      if (updatedProducts.length === 0 || grandTotal === 0) {
        amountPaid = 0;
        paymentStatus = 'pending';
      } else {
        // Otherwise, cap the amount paid at the grand total
        amountPaid = grandTotal;
        paymentStatus = 'cleared';
      }
    } else if (grandTotal === amountPaid && grandTotal > 0) {
      paymentStatus = 'cleared';
    } else {
      paymentStatus = 'pending';
    }

    setEditFormData({
      ...editFormData,
      products: updatedProducts,
      grandTotal: grandTotal,
      amountPaid: amountPaid,
      paymentStatus: paymentStatus
    });

    // Reset product form
    cancelProductEdit();
  };

  const deleteProduct = (index) => {
    const updatedProducts = [...editFormData.products];
    updatedProducts.splice(index, 1);

    // Recalculate the grand total accounting for discounts
    const grandTotal = parseFloat(updatedProducts.reduce((total, product) => {
      return total + (product.total || 0);
    }, 0).toFixed(2));

    // If the grand total is now less than the amount paid, adjust the amount paid
    let amountPaid = parseFloat(editFormData.amountPaid) || 0;
    let paymentStatus = editFormData.paymentStatus;

    if (grandTotal < amountPaid) {
      // If there are no products or grandTotal is 0, reset amount paid
      if (updatedProducts.length === 0 || grandTotal === 0) {
        amountPaid = 0;
        paymentStatus = 'pending';
      } else {
        // Otherwise, cap the amount paid at the grand total
        amountPaid = grandTotal;
        paymentStatus = 'cleared';
      }
    } else if (grandTotal === amountPaid && grandTotal > 0) {
      paymentStatus = 'cleared';
    } else {
      paymentStatus = 'pending';
    }

    setEditFormData({
      ...editFormData,
      products: updatedProducts,
      grandTotal: grandTotal,
      amountPaid: amountPaid,
      paymentStatus: paymentStatus
    });

    // Close the modal after deletion
    setShowDeleteProductModal(false);
    setSelectedProductIndex(null);
  };

  const addNewProduct = () => {
    setEditingProduct({
      name: '',
      price: 0,
      count: 1,
      discount: 0,
      total: 0, // Initialize with zero total
      index: editFormData.products.length,
      timestamp: Date.now() // Add timestamp for new products
    });
    setProductFormData({
      name: '',
      price: '',
      count: '',
      discount: 0
    });
  };

  const addNewPayment = () => {
    if (!newPayment || parseFloat(newPayment) <= 0) return;

    const paymentAmount = parseFloat(newPayment);
    // Use the provided date or current date if not provided
    const paymentTimestamp = paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString();

    if (editingPayment !== null) {
      // Update existing payment
      const updatedPaymentHistory = [...editFormData.paymentHistory];
      const oldAmount = parseFloat(updatedPaymentHistory[editingPayment].amount) || 0;
      updatedPaymentHistory[editingPayment] = {
        amount: paymentAmount,
        date: paymentTimestamp
      };

      // Recalculate total paid amount by subtracting the old amount and adding the new amount
      const totalPaid = parseFloat(editFormData.amountPaid) || 0;
      const newTotalPaid = totalPaid - oldAmount + paymentAmount;

      setEditFormData({
        ...editFormData,
        amountPaid: newTotalPaid,
        paymentHistory: updatedPaymentHistory,
        paymentStatus: newTotalPaid >= (editingClient?.grandTotal || 0) ? 'cleared' : 'pending'
      });

      setEditingPayment(null);
    } else {
      // Create new payment entry
      const paymentEntry = {
        amount: paymentAmount,
        date: paymentTimestamp
      };

      // Calculate new total paid amount
      const previousPaid = parseFloat(editFormData.amountPaid) || 0;
      const newTotalPaid = previousPaid + paymentAmount;

      // Update payment history and total amount
      setEditFormData({
        ...editFormData,
        amountPaid: newTotalPaid,
        paymentHistory: [...(editFormData.paymentHistory || []), paymentEntry],
        // If new total equals or exceeds grand total, set payment status to cleared
        paymentStatus: newTotalPaid >= (editingClient?.grandTotal || 0) ? 'cleared' : 'pending'
      });
    }

    // Close modal and reset new payment input
    setShowPaymentModal(false);
    setNewPayment('');
    setPaymentDate('');
  };

  const editPaymentEntry = (index) => {
    if (editFormData.paymentHistory && editFormData.paymentHistory[index]) {
      const payment = editFormData.paymentHistory[index];
      setNewPayment(payment.amount.toString());

      // Format the date for the datetime-local input
      const paymentDateTime = new Date(payment.date);
      const formattedDate = paymentDateTime.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
      setPaymentDate(formattedDate);

      setEditingPayment(index);
      setShowPaymentModal(true);
    }
  };

  const deletePaymentEntry = () => {
    if (selectedPaymentIndex === null || !editFormData.paymentHistory) return;

    // Get the payment amount to be deleted
    const paymentToDelete = editFormData.paymentHistory[selectedPaymentIndex];
    const amountToRemove = parseFloat(paymentToDelete.amount) || 0;

    // Remove payment from history
    const updatedPaymentHistory = [...editFormData.paymentHistory];
    updatedPaymentHistory.splice(selectedPaymentIndex, 1);

    // Recalculate total paid amount
    const previousPaid = parseFloat(editFormData.amountPaid) || 0;
    const newTotalPaid = Math.max(0, previousPaid - amountToRemove); // Ensure it's not negative

    // Update state
    setEditFormData({
      ...editFormData,
      amountPaid: newTotalPaid,
      paymentHistory: updatedPaymentHistory,
      paymentStatus: newTotalPaid >= (editingClient?.grandTotal || 0) ? 'cleared' : 'pending'
    });

    setShowDeletePaymentModal(false);
    setSelectedPaymentIndex(null);
  };
  const handleBackClick = () => {
    // Reset all filters
    setSearchQuery('');
    setActiveFilter('all');
    setOrderStatusFilter('all');
    setStartDate('');
    setEndDate('');
    setIsDateFilterActive(false);
    setShowMergedOnly(false);

    // Update URL to remove all query parameters
    navigate(location.pathname, { replace: true });

    // Refresh client data
    fetchClients();
  };

  const saveClientChanges = async (e) => {
    e.preventDefault();

    const grandTotal = parseFloat(editFormData.products.reduce((total, product) => {
      // Use the calculated total property which already accounts for discounts
      return total + (product.total || 0);
    }, 0).toFixed(2));

    try {
      const updatedClient = {
        id: editingClient.id,
        clientName: editFormData.clientName,
        clientAddress: editFormData.clientAddress,
        clientPhone: editFormData.clientPhone,
        clientGst: editFormData.clientGst,
        products: editFormData.products,
        grandTotal: grandTotal,
        paymentStatus: editFormData.paymentStatus,
        orderStatus: editFormData.orderStatus,
        amountPaid: parseFloat(editFormData.amountPaid) || 0,
        paymentHistory: editFormData.paymentHistory || [],
        timestamp: editFormData.timestamp,
        orderDate: editFormData.orderDate, // Save the order date
        // Preserve any merged data if it exists
        merged: editingClient.merged || false,
        mergedFrom: editingClient.mergedFrom || []
      };

      await updateClient(updatedClient);

      // Update the client in the local state
      setSavedClients(savedClients.map(client =>
        client.id === editingClient.id ? updatedClient : client
      ));

      // Close the edit form
      closeEditForm();
    } catch (err) {
      setError('Failed to update client. Please try again.');
      console.error(err);

      // Clear error after 3 seconds
      setTimeout(() => setError(''), 3000);
    }
  };

  // Update the setSearchQuery function to also update URL
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Check for date format in DD/MM/YYYY
    const dateRegex = /^(\d{2})\/(\d{2})(?:\/(\d{4}))?$/;
    const dateMatch = value.match(dateRegex);

    if (dateMatch) {
      // If it's a valid date format, show a visual indicator or hint
      const [_, day, month, year] = dateMatch;
      const currentYear = new Date().getFullYear();
      const searchYear = year || currentYear;

      // Validate date
      const searchDate = new Date(`${searchYear}-${month}-${day}`);

      // If valid date, apply date filter automatically
      if (!isNaN(searchDate.getTime())) {
        setDateSearchActive(true);

        // Provide visual feedback - pulse the border briefly
        const input = document.activeElement;
        if (input.tagName === 'INPUT') {
          // Add a temporary pulse class
          input.classList.add('date-pulse');

          // Remove the class after animation completes
          setTimeout(() => {
            input.classList.remove('date-pulse');
          }, 1000);
        }
      } else {
        setDateSearchActive(false);
      }
    } else {
      setDateSearchActive(false);
    }
  };

  // Add a function to clear the search query
  const clearSearchQuery = () => {
    setSearchQuery('');
    setSelectedClientsForMerge([]);
    setDateSearchActive(false);
  };

  // Add a function to toggle merged only filter
  const toggleMergedOnly = () => {
    setShowMergedOnly(!showMergedOnly);
  };

  // Add a function to clear merged only filter
  const clearMergedOnly = () => {
    setShowMergedOnly(false);
  };

  // Add a function to set view mode
  const setViewModeWithUpdate = (mode) => {
    setViewMode(mode);
    localStorage.setItem('viewMode', mode);
  };

  // Add this function after the toggleMergedOnly or clearMergedOnly function
  const countNonMergedClients = () => {
    return savedClients.filter(client => !client.merged).length;
  };

  // Add this function to count non-merged clients with specific status
  const countNonMergedClientsWithStatus = (status) => {
    if (status === 'pending') {
      return savedClients.filter(client => !client.merged && client.paymentStatus !== 'cleared').length;
    } else if (status === 'cleared') {
      return savedClients.filter(client => !client.merged && client.paymentStatus === 'cleared').length;
    } else if (status === 'sell') {
      return savedClients.filter(client => !client.merged && client.orderStatus === 'sell').length;
    } else if (status === 'purchased') {
      return savedClients.filter(client => !client.merged && client.orderStatus === 'purchased').length;
    }
    return 0;
  };

  // Add copy to clipboard function
  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  // Add useEffect to handle body scrolling when modal is open
  useEffect(() => {
    if (showProductsModal) {
      // Prevent scrolling on the body when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable scrolling when modal is closed
      document.body.style.overflow = 'auto';
    }
    
    // Cleanup function to ensure body scrolling is re-enabled when component unmounts
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showProductsModal]);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-gray-100 to-white'} py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200`}>
      {/* Inject custom styles */}
      <style>{customStyles}</style>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 sm:p-8 transition-all">
            <div className="flex items-center space-x-3 mb-5">
              <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Confirm Payment</h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to mark this payment as cleared?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearOrderPayment(selectedClientId);
                  setShowModal(false);
                }}
                className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}




      {showModalDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-hidden">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 sm:p-8 transition-all max-h-[90vh] overflow-y-auto">
            <div className="flex items-center space-x-3 mb-5">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Delete Confirmation</h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to delete this order? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteOrder(selectedDeleteClientId);
                  setShowDeleteModal(false);
                }}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}


      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`backdrop-blur-md mb-6`}>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            {/* Logo and Title Section */}
            <div className="flex items-center justify-between w-full sm:w-auto">
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleBackClick}
                  className={`p-2 rounded-lg ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
                  aria-label="Back to clients"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>

                <h1 className={`text-lg sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center`}>
                  <span className="bg-gradient-to-r from-emerald-500 to-teal-400 inline-block text-transparent bg-clip-text text-xl sm:text-2xl font-bold">
                    <a href="/clients" className="bg-gradient-to-r from-emerald-500 to-teal-400 inline-block text-transparent bg-clip-text text-xl font-bold">
                      ORDERS
                    </a>
                  </span>
                </h1>
              </div>

              {/* Mobile View Controls */}
              <div className="flex items-center gap-2 sm:hidden">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => navigate(`/all-clients`)}
                    className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} ${isDarkMode ? 'text-white' : 'text-gray-700'} relative group`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-10">
                      View Client List
                    </div>
                  </button>
                  <button
                    onClick={() => navigate(`/all-client-orders`)}
                    className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} ${isDarkMode ? 'text-white' : 'text-gray-700'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M9 8h6m2-6H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setIsInfoOpen(!isInfoOpen)}
                    className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} ${isDarkMode ? 'text-white' : 'text-gray-700'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewModeWithUpdate('list')}
                    className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list'
                      ? (isDarkMode ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700')
                      : (isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200')} ${isDarkMode ? 'text-white' : 'text-gray-700'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewModeWithUpdate('card')}
                    className={`p-1.5 rounded-lg transition-colors${viewMode === 'card'
                      ? (isDarkMode ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700')
                      : (isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200')} ${isDarkMode ? 'text-white' : 'text-gray-700'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop View Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/all-clients`)}
                  className={`p-2 rounded-lg ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} transition-colors hidden sm:flex relative group`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-10">
                    View Client List
                  </div>
                </button>
                <button
                  onClick={() => setIsInfoOpen(!isInfoOpen)}
                  className={`p-2 rounded-lg ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} transition-colors hidden sm:flex`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button
                  onClick={() => navigate(`/all-client-orders`)}
                  className={`p-2 rounded-lg ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} transition-colors hidden sm:flex`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M9 8h6m2-6H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2z" />
                  </svg>
                </button>
                <div className="hidden md:flex">
                  <ThemeToggle />
                </div>
              </div>
              {/* View Mode Toggle - Desktop */}
              <div className="hidden sm:flex items-center gap-1">
                <button
                  onClick={() => setViewModeWithUpdate('list')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'list'
                    ? (isDarkMode ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700')
                    : (isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200')} ${isDarkMode ? 'text-white' : 'text-gray-700'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewModeWithUpdate('card')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'card'
                    ? (isDarkMode ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700')
                    : (isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200')} ${isDarkMode ? 'text-white' : 'text-gray-700'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
              </div>

              {/* Action Buttons Group */}
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {isDateFilterActive && !isSmallScreen && (
                  <div className={`px-3 py-1.5 ${isDarkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700'} rounded-lg text-xs flex items-center`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                    <button
                      onClick={clearDateFilter}
                      className="ml-2 text-amber-800 hover:text-amber-900"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                {savedClients.length > 0 && (
                  <button
                    onClick={handleDeleteAllClick}
                    className="flex items-center justify-center px-4 py-2.5 bg-red-500/90 hover:bg-red-600 text-white rounded-xl shadow-lg hover:shadow-red-500/30 transition-all duration-200 font-medium text-sm sm:text-base"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
                <Link
                  to="/"
                  className="flex items-center justify-center px-4 py-2.5 bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl shadow-lg hover:shadow-emerald-500/30 transition-all duration-200 font-medium text-sm sm:text-base"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  New Order
                </Link>
              </div>
            </div>
          </div>

          {isInfoOpen && (
            <div className="mb-6 animate-fadeIn">
              {/* Stats Dropdown Button */}
              <button
                onClick={() => setIsStatsOpen(!isStatsOpen)}
                className={`w-full flex items-center justify-between p-4 rounded-t-lg ${isStatsOpen ? `${isDarkMode ? 'bg-emerald-500/80' : 'bg-emerald-500'} text-white` : `${isDarkMode ? 'bg-white/5' : 'bg-white'} ${isDarkMode ? 'text-white' : 'text-gray-900'}`} ${!isStatsOpen ? 'rounded-b-lg' : ''} border ${isStatsOpen ? (isDarkMode ? 'border-emerald-600' : 'border-emerald-600') : (isDarkMode ? 'border-white/10' : 'border-gray-200')} mb-3 transition-all duration-200 shadow-sm`}
              >
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                  <span className="font-medium">Statistics Overview</span>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 transform transition-transform duration-200 ${isStatsOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Stats Content */}
              {isStatsOpen && (
                <div className={`backdrop-blur-md ${isDarkMode ? 'bg-black/40' : 'bg-white/95'} rounded-b-xl shadow-lg p-4 mb-4 border ${isDarkMode ? 'border-emerald-600/40' : 'border-emerald-100'} border-t-0 animate-fadeIn`}>
                  {/* Date Range Filter */}
                  <div className={`mb-4 p-3 ${isDarkMode ? 'bg-white/5' : 'bg-emerald-50'} rounded-lg border ${isDarkMode ? 'border-white/10' : 'border-emerald-100'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Date Range Filter</h3>
                      <div className="flex items-center">
                        <button
                          onClick={() => {
                            setIsDateFilterActive(!isDateFilterActive);
                            if (!isDateFilterActive && (!startDate || !endDate)) {
                              // Set default dates if none selected
                              const today = new Date();
                              const thirtyDaysAgo = new Date();
                              thirtyDaysAgo.setDate(today.getDate() - 30);

                              setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
                              setEndDate(today.toISOString().split('T')[0]);
                            }
                          }}
                          className={`relative inline-flex flex-shrink-0 h-5 w-10 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none ${isDateFilterActive ? 'bg-emerald-500' : isDarkMode ? 'bg-slate-600' : 'bg-gray-200'}`}
                        >
                          <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${isDateFilterActive ? 'translate-x-5' : 'translate-x-0'}`}></span>
                        </button>
                        <span className={`ml-2 text-xs ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                          {isDateFilterActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-600'} mb-1`}>Start Date</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className={`w-full rounded-lg ${isDarkMode ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'} border text-sm focus:ring-emerald-500 focus:border-emerald-500 p-2`}
                        />
                      </div>
                      <div>
                        <label className={`block text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-600'} mb-1`}>End Date</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className={`w-full rounded-lg ${isDarkMode ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'} border text-sm focus:ring-emerald-500 focus:border-emerald-500 p-2`}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-3">
                      <button
                        onClick={clearDateFilter}
                        className={`px-3 py-1 text-xs rounded-lg ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
                      >
                        Reset
                      </button>
                      <button
                        onClick={applyDateFilter}
                        disabled={!startDate || !endDate}
                        className={`px-3 py-1 text-xs rounded-lg ${startDate && endDate ? 'bg-emerald-500 text-white hover:bg-emerald-600' : isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-500'} transition-colors`}
                      >
                        Apply Filter
                      </button>
                    </div>
                  </div>

                  {/* Update Statistics to reflect filtered data */}
                  <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-4 md:gap-3">
                    <div className={`${isDarkMode ? 'bg-white/5' : 'bg-white'} backdrop-blur-md rounded-xl p-3 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'} shadow-sm flex items-center`}>
                      <div className="flex-1">
                        <p className={`text-[11px] sm:text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Orders</p>
                        <p className={`text-lg sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mt-0.5 sm:mt-1`}>{filteredClients.length}</p>
                        <p className={`text-[9px] sm:text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                          {isDateFilterActive ? `From ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}` : 'All time'}
                        </p>
                      </div>
                    </div>

                    <div className={`${isDarkMode ? 'bg-white/5' : 'bg-white'} backdrop-blur-md rounded-xl p-3 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'} shadow-sm flex items-center`}>
                      <div className="flex-1">
                        <p className={`text-[11px] sm:text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Amount</p>
                        <p className={`text-lg sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mt-0.5 sm:mt-1 truncate flex items-center justify-center`}><BsCurrencyRupee />{filteredClients.reduce((total, client) => total + (client.grandTotal || 0), 0).toFixed(2)}</p>
                        <p className={`text-[9px] sm:text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Order value</p>
                      </div>
                    </div>

                    <div className={`${isDarkMode ? 'bg-white/5' : 'bg-white'} backdrop-blur-md rounded-xl p-2.5 sm:p-4 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'} shadow-sm transform transition-all hover:scale-105`}>
                    <p className={`text-[11px] sm:text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Received Payments</p>
                      <p className="text-lg sm:text-2xl font-bold text-emerald-500 mt-0.5 sm:mt-1 truncate flex items-center justify-center"><BsCurrencyRupee />{filteredClients.reduce((total, client) => total + (client.amountPaid || 0), 0).toFixed(2)}</p>
                      <p className={`text-[9px] sm:text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Order value</p>
                    </div>

                    <div className={`${isDarkMode ? 'bg-white/5' : 'bg-white'} backdrop-blur-md rounded-xl p-2.5 sm:p-4 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'} shadow-sm`}>
                      <p className={`text-[11px] sm:text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Pending</p>
                      <p className="text-lg sm:text-2xl font-bold text-amber-500 mt-0.5 sm:mt-1 truncate flex items-center justify-center"><BsCurrencyRupee />{filteredClients.reduce((total, client) => {
                        const grandTotal = typeof client.grandTotal === 'number' ? client.grandTotal : 0;
                        const amountPaid = typeof client.amountPaid === 'number' ? client.amountPaid : 0;
                        const pendingAmount = grandTotal - amountPaid;
                        return total + pendingAmount; // Include negative balances as well
                      }, 0).toFixed(2)}</p>
                      <p className={`text-[9px] sm:text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Balance due</p>
                    </div>
                  </div>

                  {/* Order Type Statistics (Sell vs Purchased) */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sell Orders Stats */}
                    <div className={`${isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50'} rounded-xl p-4 border ${isDarkMode ? 'border-blue-500/30' : 'border-blue-100'}`}>
                      <div className="flex items-center mb-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                        <h3 className={`text-sm font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>Sell Orders</h3>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                          {filteredClients.filter(client => client.orderStatus === 'sell').length} orders
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className={`${isDarkMode ? 'bg-white/5' : 'bg-white'} p-2 rounded-lg border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total</p>
                          <p className="text-sm font-bold text-blue-500 mt-0.5 flex items-center">
                            <BsCurrencyRupee className="text-xs" />
                            {filteredClients
                              .filter(client => client.orderStatus === 'sell')
                              .reduce((total, client) => total + (client.grandTotal || 0), 0)
                              .toFixed(2)}
                          </p>
                        </div>
                        <div className={`${isDarkMode ? 'bg-white/5' : 'bg-white'} p-2 rounded-lg border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Received</p>
                          <p className="text-sm font-bold text-emerald-500 mt-0.5 flex items-center">
                            <BsCurrencyRupee className="text-xs" />
                            {filteredClients
                              .filter(client => client.orderStatus === 'sell')
                              .reduce((total, client) => total + (client.amountPaid || 0), 0)
                              .toFixed(2)}
                          </p>
                        </div>
                        <div className={`${isDarkMode ? 'bg-white/5' : 'bg-white'} p-2 rounded-lg border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Pending</p>
                          <p className="text-sm font-bold text-amber-500 mt-0.5 flex items-center">
                            <BsCurrencyRupee className="text-xs" />
                            {filteredClients
                              .filter(client => client.orderStatus === 'sell')
                              .reduce((total, client) => {
                                const grandTotal = typeof client.grandTotal === 'number' ? client.grandTotal : 0;
                                const amountPaid = typeof client.amountPaid === 'number' ? client.amountPaid : 0;
                                return total + (grandTotal - amountPaid);
                              }, 0)
                              .toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Purchased Orders Stats */}
                    <div className={`${isDarkMode ? 'bg-purple-500/10' : 'bg-purple-50'} rounded-xl p-4 border ${isDarkMode ? 'border-purple-500/30' : 'border-purple-100'}`}>
                      <div className="flex items-center mb-3">
                        <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
                        <h3 className={`text-sm font-medium ${isDarkMode ? 'text-purple-300' : 'text-purple-800'}`}>Purchased Orders</h3>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-800'}`}>
                          {filteredClients.filter(client => client.orderStatus === 'purchased').length} orders
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className={`${isDarkMode ? 'bg-white/5' : 'bg-white'} p-2 rounded-lg border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total</p>
                          <p className="text-sm font-bold text-purple-500 mt-0.5 flex items-center">
                            <BsCurrencyRupee className="text-xs" />
                            {filteredClients
                              .filter(client => client.orderStatus === 'purchased')
                              .reduce((total, client) => total + (client.grandTotal || 0), 0)
                              .toFixed(2)}
                          </p>
                        </div>
                        <div className={`${isDarkMode ? 'bg-white/5' : 'bg-white'} p-2 rounded-lg border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Paid</p>
                          <p className="text-sm font-bold text-emerald-500 mt-0.5 flex items-center">
                            <BsCurrencyRupee className="text-xs" />
                            {filteredClients
                              .filter(client => client.orderStatus === 'purchased')
                              .reduce((total, client) => total + (client.amountPaid || 0), 0)
                              .toFixed(2)}
                          </p>
                        </div>
                        <div className={`${isDarkMode ? 'bg-white/5' : 'bg-white'} p-2 rounded-lg border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Pending</p>
                          <p className="text-sm font-bold text-amber-500 mt-0.5 flex items-center">
                            <BsCurrencyRupee className="text-xs" />
                            {filteredClients
                              .filter(client => client.orderStatus === 'purchased')
                              .reduce((total, client) => {
                                const grandTotal = typeof client.grandTotal === 'number' ? client.grandTotal : 0;
                                const amountPaid = typeof client.amountPaid === 'number' ? client.amountPaid : 0;
                                return total + (grandTotal - amountPaid);
                              }, 0)
                              .toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                </div>
              )}

              {/* Filters Dropdown Button */}
              <button
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className={`w-full flex items-center justify-between p-4 rounded-t-lg ${isFiltersOpen ? `${isDarkMode ? 'bg-amber-500/80' : 'bg-amber-500'} text-white` : `${isDarkMode ? 'bg-white/5' : 'bg-white'} ${isDarkMode ? 'text-white' : 'text-gray-900'}`} ${!isFiltersOpen ? 'rounded-b-lg' : ''} border ${isFiltersOpen ? (isDarkMode ? 'border-amber-600' : 'border-amber-600') : (isDarkMode ? 'border-white/10' : 'border-gray-200')} mb-3 transition-all duration-200 shadow-sm`}
              >
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">
                    {activeFilter === 'all' ? 'All Orders' : activeFilter === 'pending' ? 'Order filter' : 'Cleared Orders'}
                  </span>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 transform transition-transform duration-200 ${isFiltersOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Filters Content */}
              {isFiltersOpen && (
                <div className={`backdrop-blur-md ${isDarkMode ? 'bg-black/40' : 'bg-white/95'} rounded-b-xl shadow-lg p-4 mb-4 border ${isDarkMode ? 'border-amber-600/40' : 'border-amber-100'} border-t-0 animate-fadeIn`}>
                  <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          setActiveFilter('all');
                          setIsInfoOpen(false);
                        }}
                        className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${activeFilter === 'all'
                          ? `${isDarkMode ? 'bg-emerald-500' : 'bg-emerald-600'} text-white shadow-md shadow-emerald-500/20`
                          : `${isDarkMode ? 'bg-white/5' : 'bg-white'} ${isDarkMode ? 'text-slate-300' : 'text-gray-700'} border ${isDarkMode ? 'border-white/10' : 'border-gray-200'} hover:${isDarkMode ? 'bg-white/10' : 'bg-gray-50'}`
                          }`}
                      >
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full ${activeFilter === 'all' ? 'bg-white' : 'bg-emerald-500'} mr-2`}></div>
                          <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>All Orders Status</span>
                        </div>
                        <span className={`text-sm ${isDarkMode ? 'text-white/80' : 'text-gray-600'} bg-black/10 px-2 py-0.5 rounded-full`}>{countNonMergedClients()}</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveFilter('pending');
                          setIsInfoOpen(false);
                        }}
                        className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${activeFilter === 'pending'
                          ? `${isDarkMode ? 'bg-amber-500' : 'bg-amber-600'} text-white shadow-md shadow-amber-500/20`
                          : `${isDarkMode ? 'bg-white/5' : 'bg-white'} ${isDarkMode ? 'text-slate-300' : 'text-gray-700'} border ${isDarkMode ? 'border-white/10' : 'border-gray-200'} hover:${isDarkMode ? 'bg-white/10' : 'bg-gray-50'}`
                          }`}
                      >
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full ${activeFilter === 'pending' ? 'bg-white' : 'bg-amber-500'} mr-2`}></div>
                          <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Pending</span>
                        </div>
                        <span className={`text-sm ${isDarkMode ? 'text-white/80' : 'text-gray-600'} bg-black/10 px-2 py-0.5 rounded-full`}>{countNonMergedClientsWithStatus('pending')}</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveFilter('cleared');
                          setIsInfoOpen(false);
                        }}
                        className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${activeFilter === 'cleared'
                          ? `${isDarkMode ? 'bg-sky-500' : 'bg-sky-600'} text-white shadow-md shadow-sky-500/20`
                          : `${isDarkMode ? 'bg-white/5' : 'bg-white'} ${isDarkMode ? 'text-slate-300' : 'text-gray-700'} border ${isDarkMode ? 'border-white/10' : 'border-gray-200'} hover:${isDarkMode ? 'bg-white/10' : 'bg-gray-50'}`
                          }`}
                      >
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full ${activeFilter === 'cleared' ? 'bg-white' : 'bg-sky-500'} mr-2`}></div>
                          <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Cleared</span>
                        </div>
                        <span className={`text-sm ${isDarkMode ? 'text-white/80' : 'text-gray-600'} bg-black/10 px-2 py-0.5 rounded-full`}>{countNonMergedClientsWithStatus('cleared')}</span>
                      </button>
                    </div>

                    {/* Order Status Filter Section */}
                    <div className={`mt-4 pt-4 md:mt-0 md:pt-0 border-t md:border-t-0 ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                      <div className="space-y-3">
                        <button
                          onClick={() => {
                            setOrderStatusFilter('all');
                            setIsInfoOpen(false);
                          }}
                          className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${orderStatusFilter === 'all'
                            ? `${isDarkMode ? 'bg-emerald-500' : 'bg-emerald-600'} text-white shadow-md shadow-emerald-500/20`
                            : `${isDarkMode ? 'bg-white/5' : 'bg-white'} ${isDarkMode ? 'text-slate-300' : 'text-gray-700'} border ${isDarkMode ? 'border-white/10' : 'border-gray-200'} hover:${isDarkMode ? 'bg-white/10' : 'bg-gray-50'}`
                            }`}
                        >
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${orderStatusFilter === 'all' ? 'bg-white' : 'bg-emerald-500'} mr-2`}></div>
                            <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>All Types</span>
                          </div>
                          <span className={`text-sm ${isDarkMode ? 'text-white/80' : 'text-gray-600'} bg-black/10 px-2 py-0.5 rounded-full`}>{countNonMergedClients()}</span>
                        </button>
                        <button
                          onClick={() => {
                            setOrderStatusFilter('sell');
                            setIsInfoOpen(false);
                          }}
                          className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${orderStatusFilter === 'sell'
                            ? `${isDarkMode ? 'bg-blue-500' : 'bg-blue-600'} text-white shadow-md shadow-blue-500/20`
                            : `${isDarkMode ? 'bg-white/5' : 'bg-white'} ${isDarkMode ? 'text-slate-300' : 'text-gray-700'} border ${isDarkMode ? 'border-white/10' : 'border-gray-200'} hover:${isDarkMode ? 'bg-white/10' : 'bg-gray-50'}`
                            }`}
                        >
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${orderStatusFilter === 'sell' ? 'bg-white' : 'bg-blue-500'} mr-2`}></div>
                            <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Sell</span>
                          </div>
                          <span className={`text-sm ${isDarkMode ? 'text-white/80' : 'text-gray-600'} bg-black/10 px-2 py-0.5 rounded-full`}>{countNonMergedClientsWithStatus('sell')}</span>
                        </button>
                        <button
                          onClick={() => {
                            setOrderStatusFilter('purchased');
                            setIsInfoOpen(false);
                          }}
                          className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${orderStatusFilter === 'purchased'
                            ? `${isDarkMode ? 'bg-purple-500' : 'bg-purple-600'} text-white shadow-md shadow-purple-500/20`
                            : `${isDarkMode ? 'bg-white/5' : 'bg-white'} ${isDarkMode ? 'text-slate-300' : 'text-gray-700'} border ${isDarkMode ? 'border-white/10' : 'border-gray-200'} hover:${isDarkMode ? 'bg-white/10' : 'bg-gray-50'}`
                            }`}
                        >
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${orderStatusFilter === 'purchased' ? 'bg-white' : 'bg-purple-500'} mr-2`}></div>
                            <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Purchased</span>
                          </div>
                          <span className={`text-sm ${isDarkMode ? 'text-white/80' : 'text-gray-600'} bg-black/10 px-2 py-0.5 rounded-full`}>{countNonMergedClientsWithStatus('purchased')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {isDateFilterActive && isSmallScreen && (
            <div className={`px-3 my-2 py-1.5 ${isDarkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700'} rounded-lg text-xs flex items-center`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
              <button
                onClick={clearDateFilter}
                className="ml-2 text-amber-800 hover:text-amber-900"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Search bar with improved design */}
          <div className="mb-6">
            <div className="relative">
              <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder={mergeMode ? "clients to merge" : "Search by name, ID, GST or date (DD/MM/YYYY - searches order date & timestamp)"}
                value={searchQuery}
                onChange={handleSearchChange}
                className={`w-full pl-10 pr-24 py-3 ${isDarkMode ? 'bg-white/5' : 'bg-white'} border ${dateSearchActive ? (isDarkMode ? 'border-amber-500/70' : 'border-amber-400') : mergeMode ? (isDarkMode ? 'border-emerald-500/70' : 'border-emerald-400') : (isDarkMode ? 'border-white/10' : 'border-gray-200')} rounded-xl ${isDarkMode ? 'text-white placeholder-slate-400' : 'text-gray-900 placeholder-gray-400'} focus:outline-none focus:ring-2 ${dateSearchActive ? 'focus:ring-amber-500/50 focus:border-amber-500' : mergeMode ? 'focus:ring-emerald-500/50 focus:border-emerald-500' : 'focus:ring-emerald-500/50 focus:border-emerald-500'} shadow-sm transition-colors`}
              />
              {/* Date format hint */}
              <div className="absolute top-full left-0 mt-1 flex items-center">
                {mergeMode ? (
                  <span className={`text-xs flex items-center ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                    Merge Mode: Select clients to merge ({selectedClientsForMerge.length} selected)
                  </span>
                ) : (
                  <span className={`text-xs flex items-center ${dateSearchActive ? (isDarkMode ? 'text-amber-400' : 'text-amber-600') : 'text-slate-400'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {dateSearchActive ? 'Date filter active (searches order date & timestamp)' : 'Date format: DD/MM/YYYY'}
                  </span>
                )}
              </div>
              {/* Merge buttons */}
              <div className="absolute inset-y-0 right-1 flex items-center">
                <button
                  onClick={toggleMergeMode}
                  className={`mr-1 px-2 py-1.5 rounded-md text-xs font-medium ${mergeMode
                    ? `${isDarkMode ? 'bg-emerald-500/80 text-white' : 'bg-emerald-100 text-emerald-700'}`
                    : `${isDarkMode ? 'bg-white/10 text-slate-300 hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                    } transition-colors`}
                >
                  {mergeMode ? 'Exit' : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>}
                </button>

                {mergeMode && (
                  <button
                    onClick={() => {
                      const allSelected = filteredClients.every(client =>
                        selectedClientsForMerge.includes(client.id)
                      );

                      if (allSelected) {
                        setSelectedClientsForMerge([]);
                      } else {
                        setSelectedClientsForMerge(filteredClients.map(client => client.id));
                      }
                    }}
                    className={`mr-1 px-2 py-1 rounded-md text-xs font-medium ${filteredClients.length > 0 && filteredClients.every(client => selectedClientsForMerge.includes(client.id))
                      ? `${isDarkMode ? 'bg-emerald-500/80 text-white' : 'bg-emerald-100 text-emerald-700'}`
                      : `${isDarkMode ? 'bg-white/10 text-slate-300 hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                      } transition-colors`}
                  >
                    {filteredClients.length > 0 && filteredClients.every(client => selectedClientsForMerge.includes(client.id))
                      ? 'Deselect'
                      : 'Select All'}
                  </button>
                )}

                {mergeMode && selectedClientsForMerge.length >= 2 && (
                  <button
                    onClick={handleMergeButtonClick}
                    className={`flex items-center px-2 py-1.5 rounded-md text-xs font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 transition-colors`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                    <span className="hidden xs:inline">Merge</span> ({selectedClientsForMerge.length})
                  </button>
                )}
              </div>
              {/* {searchQuery && (
                <button
                  onClick={clearSearchQuery}
                  className={`absolute inset-y-0 ${mergeMode ? 'right-28' : 'right-8'} flex items-center pr-3`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )} */}
            </div>
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

        {/* Active Filter Indicator */}
        {showMergedOnly && (
          <div className="bg-purple-900/30 border-l-4 border-purple-500 text-purple-100 p-4 mb-6 rounded-lg backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 flex-shrink-0 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <div>
                  <h3 className="font-medium">Showing Merged Cards Only</h3>
                  <p className="text-sm mt-0.5 text-purple-300">Displaying {filteredClients.length} merged card{filteredClients.length !== 1 ? 's' : ''} out of {savedClients.filter(client => client.merged === true).length} total merged cards</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs py-1.5 px-3 bg-purple-500/20 rounded-lg border border-purple-500/30">
                  <span className="font-medium">{Math.round((filteredClients.length / savedClients.length) * 100)}%</span> of total orders
                </div>
                <button
                  onClick={clearMergedOnly}
                  className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-sm flex items-center transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear Filter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Selection info panel - Show when search has results */}
        {/* {showMergeButton && filteredClients.length > 0 && (
          <div className={`mb-6 p-4 rounded-xl ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'} shadow-sm animate-fadeIn`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <div>
                  <h3 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {filteredClients.length} {filteredClients.length === 1 ? 'result' : 'results'} found
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {selectedClientsForMerge.length} of {filteredClients.length} selected for merging
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const allSelected = filteredClients.every(client =>
                      selectedClientsForMerge.includes(client.id)
                    );

                    if (allSelected) {
                      setSelectedClientsForMerge([]);
                    } else {
                      setSelectedClientsForMerge(filteredClients.map(client => client.id));
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filteredClients.every(client => selectedClientsForMerge.includes(client.id))
                    ? `${isDarkMode ? 'bg-emerald-500/80 text-white' : 'bg-emerald-100 text-emerald-800'}`
                    : `${isDarkMode ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-800'}`
                    } transition-colors flex items-center`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {filteredClients.every(client => selectedClientsForMerge.includes(client.id)) ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    )}
                  </svg>
                  {filteredClients.every(client => selectedClientsForMerge.includes(client.id))
                    ? 'Deselect All'
                    : 'Select All'}
                </button>

                {selectedClientsForMerge.length >= 2 && (
                  <button
                    onClick={handleMergeButtonClick}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white transition-colors flex items-center shadow-sm`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                    Merge {selectedClientsForMerge.length} Clients
                  </button>
                )}
              </div>
            </div>
          </div>
        )} */}

        {/* Edit Client Modal */}
        {editingClient && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden">
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-700 overflow-hidden my-4 max-h-[90vh] flex flex-col">
              <div className="p-5 bg-gradient-to-r from-slate-700 to-slate-800 border-b border-slate-600/30 sticky top-0 z-10">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-lg text-white">Edit Client Order</h3>
                  <button
                    onClick={closeEditForm}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Tabs for General Info and Products */}
              <div className="flex border-b border-slate-700 z-10 bg-slate-800">
                <button
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${activeTab === 'general'
                    ? 'bg-white/5 text-white border-b-2 border-emerald-500'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  onClick={() => setActiveTab('general')}
                >
                  <div className="flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    General Info
                  </div>
                </button>
                <button
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${activeTab === 'products'
                    ? 'bg-white/5 text-white border-b-2 border-emerald-500'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  onClick={() => setActiveTab('products')}
                >
                  <div className="flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Products</p>
                    {editFormData.products && editFormData.products.some(p => p.discount > 0) && (
                      <div className="ml-2 bg-red-500/20 p-1 rounded-full" title="Contains discounted products">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              </div>

              <form onSubmit={saveClientChanges} className="overflow-y-auto flex-1 custom-scrollbar">
                {activeTab === 'general' ? (
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Client Name</label>
                      <input
                        type="text"
                        name="clientName"
                        value={editFormData.clientName}
                        onChange={handleEditInputChange}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Client Address</label>
                      <input
                        type="text"
                        name="clientAddress"
                        value={editFormData.clientAddress}
                        onChange={handleEditInputChange}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Client Phone</label>
                      <input
                        type="text"
                        name="clientPhone"
                        value={editFormData.clientPhone}
                        onChange={handleEditInputChange}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">GST Number</label>
                      <input
                        type="text"
                        name="clientGst"
                        value={editFormData.clientGst}
                        onChange={handleEditInputChange}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                      />
                    </div>

                    {/* Add order date/timestamp field */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Order Date</label>
                      <input
                        type="date"
                        name="orderDate"
                        value={editFormData.orderDate || ''}
                        onChange={(e) => {
                          const newOrderDate = e.target.value;

                          // Update both orderDate and timestamp for backward compatibility
                          const localDate = new Date(newOrderDate + 'T00:00:00');
                          const newTimestamp = localDate.getTime();

                          // Update the form data
                          setEditFormData({
                            ...editFormData,
                            orderDate: newOrderDate,
                            timestamp: newTimestamp
                          });
                        }}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Amount Paid (₹)
                        <span className="text-xs text-slate-500 ml-2">
                          Total: ₹{editFormData.products.reduce((total, product) =>
                            total + (parseFloat(product.price) || 0) * (parseFloat(product.count) || 0), 0).toFixed(2)}
                        </span>
                      </label>
                      <div className="flex space-x-2 items-center">
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-slate-400">₹</span>
                          </div>
                          <input
                            type="number"
                            name="amountPaid"
                            value={editFormData.amountPaid}
                            onChange={handleEditInputChange}
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full pl-8 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                            readOnly
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowPaymentModal(true)}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors flex items-center justify-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Payment History Section */}
                    {editFormData.paymentHistory && editFormData.paymentHistory.length > 0 && (
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-sm font-medium text-slate-300 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                            </svg>
                            Payment History
                          </h4>
                          <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full">
                            {editFormData.paymentHistory.length} {editFormData.paymentHistory.length === 1 ? 'entry' : 'entries'}
                          </span>
                        </div>
                        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                          <div className="relative">
                            <div className="bg-white/10 sticky top-0 z-10">
                              <table className="w-full">
                                <thead>
                                  <tr>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-300">Date</th>
                                    <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-300">Amount</th>
                                    <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-300">Actions</th>
                                  </tr>
                                </thead>
                              </table>
                            </div>
                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                              <table className="w-full">
                                <tbody className="divide-y divide-white/5">
                                  {editFormData.paymentHistory.map((payment, index) => (
                                    <tr key={index} className="text-white text-left hover:bg-white/5 transition-colors">
                                      <td className="px-4 py-3 text-xs text-slate-300">
                                        {new Date(payment.date).toLocaleString('en-IN', {
                                          dateStyle: 'medium',
                                          timeStyle: 'short',
                                          timeZone: 'Asia/Kolkata',
                                          hour12: true
                                        })}
                                      </td>
                                      <td className="px-4 py-3 text-right text-xs font-medium text-emerald-500">
                                        ₹{parseFloat(payment.amount).toFixed(2)}
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end items-center space-x-3">
                                          <button
                                            type="button"
                                            onClick={() => editPaymentEntry(index)}
                                            className="p-1.5 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 rounded-lg transition-colors"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedPaymentIndex(index);
                                              setShowDeletePaymentModal(true);
                                            }}
                                            className="p-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col md:flex-row md:gap-10">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Payment Status</label>
                        <div className="flex items-center space-x-4">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="radio"
                            className="sr-only peer"
                            name="paymentStatus"
                            value="pending"
                            checked={editFormData.paymentStatus === 'pending'}
                            onChange={() => setEditFormData({ ...editFormData, paymentStatus: 'pending' })}
                          />
                          <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600 relative"></div>
                          <span className="ml-2 text-sm text-slate-300">Pending</span>
                        </label>

                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="radio"
                            className="sr-only peer"
                            name="paymentStatus"
                            value="cleared"
                            checked={editFormData.paymentStatus === 'cleared'}
                            onChange={() => setEditFormData({ ...editFormData, paymentStatus: 'cleared' })}
                          />
                          <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sky-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600 relative"></div>
                          <span className="ml-2 text-sm text-slate-300">Cleared</span>
                        </label>
                      </div>
                      <div className="mt-2 flex items-center">
                        <span className={`px-2 py-1 text-xs rounded-md ${editFormData.paymentStatus === 'pending'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          }`}>
                          {editFormData.paymentStatus === 'pending' ? '⏳ Pending' : '✓ Cleared'}
                        </span>
                      </div>
                    </div>

                    {/* Order Status field */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Order Status</label>
                      <div className="flex items-center space-x-4">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="radio"
                            className="sr-only peer"
                            name="orderStatus"
                            value="sell"
                            checked={editFormData.orderStatus === 'sell'}
                            onChange={() => setEditFormData({ ...editFormData, orderStatus: 'sell' })}
                          />
                          <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 relative"></div>
                          <span className="ml-2 text-sm text-slate-300">Sell</span>
                        </label>

                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="radio"
                            className="sr-only peer"
                            name="orderStatus"
                            value="purchased"
                            checked={editFormData.orderStatus === 'purchased'}
                            onChange={() => setEditFormData({ ...editFormData, orderStatus: 'purchased' })}
                          />
                          <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 relative"></div>
                          <span className="ml-2 text-sm text-slate-300">Purchased</span>
                        </label>
                      </div>
                      <div className="mt-2 flex items-center">
                        <span className={`px-2 py-1 text-xs rounded-md ${editFormData.orderStatus === 'sell'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}>
                          {editFormData.orderStatus === 'sell' ? '📤 Sell' : '📥 Purchased'}
                        </span>
                      </div>
                    </div>
                    </div>

                  </div>
                ) : (
                  <div className="p-5">
                    {/* Product editing interface */}
                    {editingProduct ? (
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-4 animate-fadeIn">
                        <h4 className="text-white font-medium mb-3 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          {editingProduct.index !== undefined && editingProduct.name
                            ? `Edit Product: ${editingProduct.name}`
                            : 'Add New Product'}
                        </h4>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Product Name</label>
                            <input
                              type="text"
                              name="name"
                              value={productFormData.name}
                              onChange={handleProductFormChange}
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                              placeholder="Enter product name"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1">Quantity</label>
                              <input
                                type="number"
                                name="count"
                                value={productFormData.count}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Prevent negative values
                                  if (parseFloat(value) < 0) return;

                                  setProductFormData({
                                    ...productFormData,
                                    count: parseFloat(value)
                                  });
                                }}
                                min="0"
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1">Price (₹)</label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <span className="text-slate-400 text-sm">₹</span>
                                </div>
                                <input
                                  type="number"
                                  name="price"
                                  value={productFormData.price}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    // Prevent negative values
                                    if (parseFloat(value) < 0) return;

                                    setProductFormData({
                                      ...productFormData,
                                      price: parseFloat(value)
                                    });
                                  }}
                                  min="0"
                                  step="0.01"
                                  className="w-full pl-7 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Add Discount Field */}
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Discount (%)</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                <span className="text-slate-400 text-sm">%</span>
                              </div>
                              <input
                                type="number"
                                name="discount"
                                value={productFormData.discount || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Prevent negative values and cap at 100%
                                  if (parseFloat(value) < 0) return;
                                  if (parseFloat(value) > 100) return;

                                  setProductFormData({
                                    ...productFormData,
                                    discount: value === '' ? '' : parseFloat(value)
                                  });
                                }}
                                min="0"
                                max="100"
                                step="0.01"
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                                placeholder="0"
                              />
                            </div>
                          </div>

                          {/* Preview total with discount */}
                          {(productFormData.count > 0 && productFormData.price > 0) && (
                            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-300">Subtotal:</span>
                                <span className="text-sm text-slate-300 flex items-center">
                                  <BsCurrencyRupee />{(productFormData.count * productFormData.price).toFixed(2)}
                                </span>
                              </div>
                              {productFormData.discount > 0 && (
                                <div className="flex justify-between items-center mt-1">
                                  <span className="text-sm text-red-400">Discount ({productFormData.discount}%):</span>
                                  <span className="text-sm text-red-400 flex items-center">
                                    -<BsCurrencyRupee />{((productFormData.count * productFormData.price) * (productFormData.discount / 100)).toFixed(2)}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between items-center mt-1 pt-1 border-t border-white/10">
                                <span className="text-sm font-medium text-emerald-400">Total:</span>
                                <span className="text-sm font-medium text-emerald-400 flex items-center">
                                  <BsCurrencyRupee />{
                                    productFormData.discount > 0 
                                    ? ((productFormData.count * productFormData.price) * (1 - (productFormData.discount / 100))).toFixed(2)
                                    : (productFormData.count * productFormData.price).toFixed(2)
                                  }
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={cancelProductEdit}
                              className="px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={saveProductChanges}
                              className="px-3 py-1.5 text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl transition-colors"
                            >
                              {editingProduct.index !== undefined && editingProduct.name ? 'Update Product' : 'Add Product'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={addNewProduct}
                        className="w-full py-2 px-4 mb-4 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 rounded-xl text-sm text-slate-300 flex items-center justify-center transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add New Product
                      </button>
                    )}

                    {/* Products list */}
                    <div className="max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                      {editFormData.products.length > 0 ? (
                        <ul className="space-y-2">
                          {editFormData.products.map((product, index) => (
                            <li key={index} className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/10 hover:border-emerald-500/30 transition-colors">
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate text-left">{product.name || 'Unnamed Product'}</p>
                                <div className="flex flex-col mt-1">
                                  <div className="flex items-center">
                                    <span className="text-xs text-slate-400">
                                      {product.count} × <span className="inline-flex items-center"><BsCurrencyRupee />{typeof product.price === 'number' ? product.price.toFixed(2) : parseFloat(product.price || 0).toFixed(2)}</span>
                                      {product.discount > 0 && (
                                        <span className="ml-1 text-red-400">(-{product.discount}%)</span>
                                      )}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center mt-0.5">
                                    <span className="text-xs text-slate-400 mr-1">Total:</span>
                                    {product.discount > 0 && (
                                      <span className="text-xs text-slate-500 line-through mr-2 inline-flex items-center">
                                        <BsCurrencyRupee className="text-[10px]" />
                                        {(product.count * (typeof product.price === 'number' ? product.price : parseFloat(product.price || 0))).toFixed(2)}
                                      </span>
                                    )}
                                    <span className="text-xs text-emerald-400 font-medium inline-flex items-center">
                                      <BsCurrencyRupee />
                                      {product.total ? product.total.toFixed(2) : 
                                        (product.discount ? 
                                          ((product.count * (typeof product.price === 'number' ? product.price : parseFloat(product.price || 0))) * (1 - product.discount/100)).toFixed(2) : 
                                          (product.count * (typeof product.price === 'number' ? product.price : parseFloat(product.price || 0))).toFixed(2)
                                        )
                                      }
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex ml-4">
                                <button
                                  type="button"
                                  onClick={() => editProduct(product, index)}
                                  className="p-1.5 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedProductIndex(index);
                                    setShowDeleteProductModal(true);
                                  }}
                                  className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="py-4 text-center text-slate-500 text-sm flex flex-col items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-600/50 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                          No products have been added yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-5 pt-2 border-t border-slate-700/50">
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeEditForm}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl shadow-lg hover:shadow-emerald-500/30 transition-all"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="relative">
              <div className="h-20 w-20 rounded-full border-t-4 border-b-4 border-emerald-500 animate-spin"></div>
              <div className="absolute top-0 left-0 h-20 w-20 rounded-full border-r-4 border-teal-300 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <p className="ml-6 text-lg text-slate-300 font-medium">Loading orders...</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-4">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className={`backdrop-blur-md ${isDarkMode ? 'bg-white/10' : 'bg-white'} ${selectedClientsForMerge.includes(client.id) ? `${isDarkMode ? 'ring-2 ring-emerald-500' : 'ring-2 ring-emerald-500'}` : ''} ${client.merged ? `${isDarkMode ? 'border-purple-500/40' : 'border-purple-200'}` : `${isDarkMode ? 'border-white/10' : 'border-gray-200'}`} rounded-xl shadow-xl overflow-hidden border hover:shadow-emerald-500/10 transition-all duration-300`}
              >
                {/* Card header with selection checkbox */}
                <div className={`p-5 ${isDarkMode ? 'bg-gradient-to-r from-slate-800/80 to-slate-700/80' : 'bg-gradient-to-r from-gray-50 to-gray-100'} border-b ${isDarkMode ? 'border-slate-600/30' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-start">
                      {/* Checkbox for merge functionality */}
                      {(showMergeButton && mergeMode) && (
                        <div className="mr-3 mt-1">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={selectedClientsForMerge.includes(client.id)}
                              onChange={() => toggleClientSelection(client.id)}
                              className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            {selectedClientsForMerge.includes(client.id) && (
                              <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center">
                                {selectedClientsForMerge.indexOf(client.id) + 1}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <div>
                        <h3 className={`font-semibold text-left text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center`}>
                          {client.clientName || 'Unnamed Client'}
                          <button
                            onClick={() => copyToClipboard(client.clientName, `name-list-${client.id}`)}
                            className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            title="Copy Client Name"
                          >
                            {copiedField === `name-list-${client.id}` ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                          {client.merged && (
                            <span className="ml-2 text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full flex items-center group relative">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                              </svg>
                              Merged
                              {client.mergedFrom && client.mergedFrom.length > 0 && (
                                <div className="absolute z-10 left-0 top-full mt-1 w-48 p-2 bg-slate-800 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                  <div className="text-xs text-slate-300 font-normal">
                                    <p className="font-medium mb-1">Merged from:</p>
                                    <ul className="list-disc pl-4 text-[10px] space-y-1">
                                      {client.mergedFrom.map((id, index) => (
                                        <li key={index} className="truncate">{id}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              )}
                            </span>
                          )}
                        </h3>
                        <p className={`text-xs text-left ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} mt-1 flex items-center`}>
                          <span>Order ID: {client.id}</span>
                          <button
                            onClick={() => copyToClipboard(client.id, `id-list-${client.id}`)}
                            className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            title="Copy Order ID"
                          >
                            {copiedField === `id-list-${client.id}` ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </p>
                        {client.clientGst && (
                          <p className={`text-xs text-left ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} mt-1 flex items-center`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>GST: {client.clientGst}</span>
                            <button
                              onClick={() => copyToClipboard(client.clientGst, `gst-list-${client.id}`)}
                              className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                              title="Copy GST Number"
                            >
                              {copiedField === `gst-list-${client.id}` ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${client.paymentStatus === 'cleared'
                        ? `${isDarkMode ? 'bg-sky-500/20' : 'bg-sky-100'} ${isDarkMode ? 'text-sky-300' : 'text-sky-700'} border ${isDarkMode ? 'border-sky-500/30' : 'border-sky-200'}`
                        : `${isDarkMode ? 'bg-amber-500/20' : 'bg-amber-100'} ${isDarkMode ? 'text-amber-300' : 'text-amber-700'} border ${isDarkMode ? 'border-amber-500/30' : 'border-amber-200'}`
                        }`}>
                        {client.paymentStatus === 'cleared' ? 'Paid' : 'Pending'}
                      </span>
                      {client.orderStatus && (
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${client.orderStatus === 'sell'
                          ? `${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'} ${isDarkMode ? 'text-blue-300' : 'text-blue-700'} border ${isDarkMode ? 'border-blue-500/30' : 'border-blue-200'}`
                          : `${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'} ${isDarkMode ? 'text-purple-300' : 'text-purple-700'} border ${isDarkMode ? 'border-purple-500/30' : 'border-purple-200'}`
                          }`}>
                          {client.orderStatus === 'sell' ? '📤 Sell' : '📥 Purchased'}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} mt-3 flex items-center`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDate(client)}
                    {/* <div className='ml-2'>
                    {renderSavedDateTime(client)}
                    </div> */}
                  </p>
                </div>

                <div className="p-5">
                  {/* If this is a merged card, add a special header */}
                  {client.merged && (
                    <div className="mb-4 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 flex iitems-center justify-between">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                        <span className="text-xs text-purple-300 font-medium">Merged Card</span>
                      </div>
                      {client.mergedFrom && client.mergedFrom.length > 0 && (
                        <button
                          onClick={() => {
                            const element = document.getElementById(`listMergedFrom-${client.id}`);
                            if (element) {
                              element.classList.toggle('hidden');
                            }
                          }}
                          className="text-xs text-purple-400 hover:text-purple-300 flex items-center"
                        >
                          <span className="mr-1">From {client.mergedFrom.length} cards</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Display merged source IDs if available */}
                  {client.merged && client.mergedFrom && client.mergedFrom.length > 0 && (
                    <div id={`listMergedFrom-${client.id}`} className="hidden mb-4 ml-2 p-2 bg-purple-500/5 border-l-2 border-purple-500/30 rounded-r-lg">
                      <p className="text-xs text-purple-300 mb-1">Merged from:</p>
                      <ul className="text-[10px] text-slate-400 space-y-1 pl-2">
                        {client.mergedFrom.map((id, index) => (
                          <li key={index} className="truncate">{id}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-lg p-3 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                      <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total:</p>
                      <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} text-sm flex items-center`}><BsCurrencyRupee />{typeof client.grandTotal === 'number' ? client.grandTotal.toFixed(2) : '0.00'}</p>
                    </div>
                    <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-lg p-3 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                      <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Amount Paid:</p>
                      <p className="font-medium text-emerald-500 text-sm flex items-center"><BsCurrencyRupee />{typeof client.amountPaid === 'number' ? client.amountPaid.toFixed(2) : '0.00'}</p>
                    </div>
                    <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-lg p-3 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                      <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Balance Due:</p>
                      <p className={`font-medium text-sm ${((typeof client.grandTotal === 'number' ? client.grandTotal : 0) -
                        (typeof client.amountPaid === 'number' ? client.amountPaid : 0)) <= 0 ? 'text-sky-500' : 'text-amber-500'
                        }`}>
                        <span className="flex items-center"><BsCurrencyRupee />{((typeof client.grandTotal === 'number' ? client.grandTotal : 0) - (typeof client.amountPaid === 'number' ? client.amountPaid : 0)).toFixed(2)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 border-t border-gray-200 dark:border-slate-700/50">
                    <button
                      onClick={() => navigate(`/order/${client.id}`)}
                      className={`py-3 text-center text-sm font-medium ${isDarkMode ? 'text-slate-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-50'} transition-colors border-r ${isDarkMode ? 'border-slate-700/50' : 'border-gray-200'} flex items-center justify-center group`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-1 group-hover:text-emerald-500 transition-colors`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </button>
                    <button
                      onClick={() => editClient(client)}
                      className={`py-3 text-center text-sm font-medium text-indigo-500 hover:${isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-50'} transition-colors border-r ${isDarkMode ? 'border-slate-700/50' : 'border-gray-200'} flex items-center justify-center`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    {client.paymentStatus !== 'cleared' ? (
                      <button
                        onClick={() => {
                          setSelectedClientId(client.id);
                          setShowModal(true);
                        }}
                        className={`py-3 text-center text-sm font-medium text-emerald-500 hover:${isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'} transition-colors border-r ${isDarkMode ? 'border-slate-700/50' : 'border-gray-200'} flex items-center justify-center group`}
                        onMouseEnter={(e) => e.currentTarget.disabled = true}
                        onMouseLeave={(e) => e.currentTarget.disabled = false}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 group-hover:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="hidden xs:inline ml-0.5 group-hover:text-gray-400">Pay</span>
                      </button>
                    ) : (
                      <div className={`py-3 text-center text-sm font-medium text-sky-500 ${isDarkMode ? 'bg-sky-500/10' : 'bg-sky-50'} border-r ${isDarkMode ? 'border-slate-700/50' : 'border-gray-200'} flex items-center justify-center opacity-70`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="hidden xs:inline ml-0.5">Paid</span>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setSelectedDeleteClientId(client.id);
                        setShowDeleteModal(true);
                      }}
                      className={`py-3 text-center text-sm font-medium text-red-500 hover:${isDarkMode ? 'bg-red-500/10' : 'bg-red-50'} transition-colors flex items-center justify-center`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className={`backdrop-blur-md ${isDarkMode ? 'bg-white/10' : 'bg-white'} ${selectedClientsForMerge.includes(client.id) ? `${isDarkMode ? 'ring-2 ring-emerald-500' : 'ring-2 ring-emerald-500'}` : ''} ${client.merged ? `${isDarkMode ? 'border-purple-500/40' : 'border-purple-200'} ${isDarkMode ? 'bg-gradient-to-br from-white/10 to-purple-900/5' : 'bg-gradient-to-br from-white to-purple-50'}` : `${isDarkMode ? 'border-white/10' : 'border-gray-200'}`} rounded-xl shadow-xl overflow-hidden border group hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-1`}
              >
                {/* Card header */}
                <div className={`p-5 ${isDarkMode ? 'bg-gradient-to-r from-slate-800/80 to-slate-700/80' : 'bg-gradient-to-r from-gray-50 to-gray-100'} border-b ${isDarkMode ? 'border-slate-600/30' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-start">
                      {/* Checkbox for merge functionality */}
                      {(showMergeButton && mergeMode) && (
                        <div className="mr-3 mt-1">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={selectedClientsForMerge.includes(client.id)}
                              onChange={() => toggleClientSelection(client.id)}
                              className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            {selectedClientsForMerge.includes(client.id) && (
                              <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center">
                                {selectedClientsForMerge.indexOf(client.id) + 1}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <div>
                        <h3 className={`font-semibold text-left text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center`}>
                          <span className="mr-1">{client.clientName || 'Unnamed Client'}</span>
                          <button
                            onClick={() => copyToClipboard(client.clientName, `name-list-${client.id}`)}
                            className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            title="Copy Client Name"
                          >
                            {copiedField === `name-list-${client.id}` ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                          {client.merged && (
                            <span className="ml-2 text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full flex items-center group relative">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                              </svg>
                              Merged
                              {/* {client.mergedFrom && client.mergedFrom.length > 0 && (
                                <div className="absolute z-10 left-0 top-full mt-1 w-48 p-2 bg-slate-800 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                  <div className="text-xs text-slate-300 font-normal">
                                    <p className="font-medium mb-1">Merged from:</p>
                                    <ul className="list-disc pl-4 text-[10px] space-y-1">
                                      {client.mergedFrom.map((id, index) => (
                                        <li key={index} className="truncate">{id}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              )} */}
                            </span>
                          )}
                        </h3>
                        <p className={`text-xs text-left ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} mt-1 flex items-center`}>
                          <span>Order ID: {client.id}</span>
                          <button
                            onClick={() => copyToClipboard(client.id, `id-list-${client.id}`)}
                            className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            title="Copy Order ID"
                          >
                            {copiedField === `id-list-${client.id}` ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </p>
                        {client.clientGst && (
                          <p className={`text-xs text-left ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} mt-1 flex items-center`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>GST: {client.clientGst}</span>
                            <button
                              onClick={() => copyToClipboard(client.clientGst, `gst-list-${client.id}`)}
                              className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                              title="Copy GST Number"
                            >
                              {copiedField === `gst-list-${client.id}` ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${client.paymentStatus === 'cleared'
                        ? `${isDarkMode ? 'bg-sky-500/20' : 'bg-sky-100'} ${isDarkMode ? 'text-sky-300' : 'text-sky-700'} border ${isDarkMode ? 'border-sky-500/30' : 'border-sky-200'}`
                        : `${isDarkMode ? 'bg-amber-500/20' : 'bg-amber-100'} ${isDarkMode ? 'text-amber-300' : 'text-amber-700'} border ${isDarkMode ? 'border-amber-500/30' : 'border-amber-200'}`
                        }`}>
                        {client.paymentStatus === 'cleared' ? 'Paid' : 'Pending'}
                      </span>
                      {client.orderStatus && (
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${client.orderStatus === 'sell'
                          ? `${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'} ${isDarkMode ? 'text-blue-300' : 'text-blue-700'} border ${isDarkMode ? 'border-blue-500/30' : 'border-blue-200'}`
                          : `${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'} ${isDarkMode ? 'text-purple-300' : 'text-purple-700'} border ${isDarkMode ? 'border-purple-500/30' : 'border-purple-200'}`
                          }`}>
                          {client.orderStatus === 'sell' ? '📤 Sell' : '📥 Purchased'}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} mt-3 flex items-center`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDate(client)}
                    {/* <div className='ml-2'>
                    {renderSavedDateTime(client)}
                    </div> */}
                  </p>
                </div>

                {/* Card content */}
                <div className="p-5 space-y-4">
                  {/* Financial summary */}
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                    <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} backdrop-blur-md rounded-lg p-2.5 sm:p-3 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'} transform transition-all hover:scale-105`}>
                      <p className={`text-[10px] sm:text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total:</p>
                      <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} text-xs sm:text-sm md:text-base truncate flex items-center justify-center`}><BsCurrencyRupee />{typeof client.grandTotal === 'number' ? client.grandTotal.toFixed(2) : '0.00'}</p>
                    </div>
                    <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} backdrop-blur-md rounded-lg p-2.5 sm:p-3 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'} transform transition-all hover:scale-105`}>
                      <p className={`text-[10px] sm:text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Amount Paid:</p>
                      <p className="font-medium text-emerald-500 text-xs sm:text-sm md:text-base truncate flex items-center justify-center"><BsCurrencyRupee />{typeof client.amountPaid === 'number' ? client.amountPaid.toFixed(2) : '0.00'}</p>
                    </div>
                    <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} backdrop-blur-md rounded-lg p-2.5 sm:p-3 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'} transform transition-all hover:scale-105 xs:col-span-2 sm:col-span-1`}>
                      <p className={`text-[10px] sm:text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Balance Due:</p>
                      <p className={`font-medium text-xs sm:text-sm md:text-base truncate flex items-center justify-center ${((typeof client.grandTotal === 'number' ? client.grandTotal : 0) - (typeof client.amountPaid === 'number' ? client.amountPaid : 0)) <= 0 ? 'text-sky-500' : 'text-amber-500'}`}><BsCurrencyRupee />{((typeof client.grandTotal === 'number' ? client.grandTotal : 0) - (typeof client.amountPaid === 'number' ? client.amountPaid : 0)).toFixed(2)}</p>
                    </div>
                  </div>
                  
                  {client.products && client.products.some(p => p.discount > 0) && (
                    <div className="mt-2 px-3 py-1.5 bg-red-500/10 rounded-lg border border-red-500/20 flex justify-between items-center">
                      <span className={`text-[10px] ${isDarkMode ? 'text-red-400' : 'text-red-500'} flex items-center`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Discount Applied
                      </span>
                      <span className={`text-[10px] font-medium ${isDarkMode ? 'text-red-400' : 'text-red-500'} flex items-center`}>
                        <BsCurrencyRupee />
                        {client.products.reduce((total, product) => {
                          if (product.discount > 0) {
                            return total + ((product.count * product.price) * (product.discount / 100));
                          }
                          return total;
                        }, 0).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {/* Products section - Updated design */}
                  <div 
                    className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} backdrop-blur-md rounded-lg p-3 sm:p-4 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'} ${client.products && client.products.length > 0 ? 'cursor-pointer hover:bg-white/10 transition-colors' : ''}`}
                    onClick={() => {
                      if (client.products && client.products.length > 0) {
                        setSelectedProductsClient(client);
                        setShowProductsModal(true);
                      }
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Products</p>
                        {client.products && client.products.some(p => p.discount > 0) && (
                          <div className="ml-2 bg-red-500/20 p-1 rounded-full" title="Contains discounted products">
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`${isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'} text-xs ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'} px-2 py-0.5 sm:py-1 rounded-full font-medium`}>
                          {client.products?.length || 0} items
                        </span>
                        {client.products && client.products.length > 0 && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProductsClient(client);
                              setShowProductsModal(true);
                            }}
                            className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-emerald-400 transition-colors"
                            title="View all products"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Add merged info section if this is a merged card */}
                    {client.merged && client.mergedFrom && client.mergedFrom.length > 0 && (
                      <div className="mb-3 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-purple-300 font-medium flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                            Merged from {client.mergedFrom.length} clients
                          </p>
                          <button
                            onClick={() => {
                              const element = document.getElementById(`mergedFrom-${client.id}`);
                              if (element) {
                                element.classList.toggle('hidden');
                              }
                            }}
                            className="text-purple-300 hover:text-purple-200 text-xs p-1 rounded-md hover:bg-white/5 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                        <div id={`mergedFrom-${client.id}`} className="mt-2 hidden">
                          <ul className="space-y-1">
                            {client.mergedFrom.map((id, index) => (
                              <li key={index} className="text-[10px] text-slate-400 truncate px-1 py-0.5 rounded-md hover:bg-white/5">
                                {id}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card actions - updated with newer design */}
                <div className={`grid grid-cols-4 border-t ${isDarkMode ? 'border-slate-700/50' : 'border-gray-200'}`}>
                  <button
                    onClick={() => navigate(`/order/${client.id}`)}
                    className={`py-3 text-center text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-50'} transition-colors border-r ${isDarkMode ? 'border-slate-700/50' : 'border-gray-200'} flex items-center justify-center group`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-1 group-hover:text-emerald-500 transition-colors`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="hidden xs:inline ml-0.5">View</span>
                  </button>
                  <button
                    onClick={() => editClient(client)}
                    className={`py-3 text-center text-xs sm:text-sm font-medium text-indigo-500 hover:${isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-50'} transition-colors border-r ${isDarkMode ? 'border-slate-700/50' : 'border-gray-200'} flex items-center justify-center`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span className="hidden xs:inline ml-0.5">Edit</span>
                  </button>
                  {client.paymentStatus !== 'cleared' ? (
                    <button
                      onClick={() => {
                        setSelectedClientId(client.id);
                        setShowModal(true);
                      }}
                      className={`py-3 text-center text-xs sm:text-sm font-medium text-emerald-500 hover:${isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'} transition-colors border-r ${isDarkMode ? 'border-slate-700/50' : 'border-gray-200'} flex items-center justify-center group`}
                      onMouseEnter={(e) => e.currentTarget.disabled = true}
                      onMouseLeave={(e) => e.currentTarget.disabled = false}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 group-hover:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="hidden xs:inline ml-0.5 group-hover:text-gray-400">Pay</span>
                    </button>
                  ) : (
                    <div className={`py-3 text-center text-xs sm:text-sm font-medium text-sky-500 ${isDarkMode ? 'bg-sky-500/10' : 'bg-sky-50'} border-r ${isDarkMode ? 'border-slate-700/50' : 'border-gray-200'} flex items-center justify-center opacity-70`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="hidden xs:inline ml-0.5">Paid</span>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setSelectedDeleteClientId(client.id);
                      setShowDeleteModal(true);
                    }}
                    className={`py-3 text-center text-xs sm:text-sm font-medium text-red-500 hover:${isDarkMode ? 'bg-red-500/10' : 'bg-red-50'} transition-colors flex items-center justify-center`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span className="hidden xs:inline ml-0.5">Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button for Quick Merged Filter Toggle */}
      {savedClients.filter(client => client.merged === true).length > 0 && !showModal && !showMergeModal && !editingClient && (
        <div className="fixed right-6 bottom-6 z-40">
          <button
            onClick={toggleMergedOnly}
            className={`flex items-center justify-center p-3 sm:p-4 rounded-full shadow-lg ${showMergedOnly
              ? "bg-purple-600 text-white hover:bg-purple-700"
              : `${isDarkMode ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-white text-purple-600 hover:bg-purple-50"}`
              } transition-all duration-300 group`}
            title={showMergedOnly ? "Show Normal Orders" : "Show Merged Cards Only"}
          >
            {showMergedOnly ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
            )}
            <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] rounded-full bg-purple-600 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
              {showMergedOnly ? "Show Normal Orders" : "Merged Cards Only"}
            </span>
          </button>
        </div>
      )}

      {/* Payment Modal - Updated Design */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-hidden">
          <div className="bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-lg font-medium text-white">
                {editingPayment !== null ? "Edit Payment" : "Add Payment"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowPaymentModal(false);
                  setEditingPayment(null);
                  setNewPayment('');
                  setPaymentDate('');
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div>
              <div className="bg-white/5 rounded-xl p-4 mb-5 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-400">Order Total:</span>
                  <span className="text-sm font-medium text-white flex items-center"><BsCurrencyRupee />{(editingClient?.grandTotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-400">Already Paid:</span>
                  <span className="text-sm font-medium text-emerald-400 flex items-center"><BsCurrencyRupee />{(parseFloat(editFormData.amountPaid) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/10">
                  <span className="text-xs font-medium text-slate-300">Remaining Balance:</span>
                  {editingPayment !== null && editFormData.paymentHistory && editFormData.paymentHistory[editingPayment] ? (
                    <span className="text-sm font-bold text-amber-400">
                      ₹{(
                        (editingClient?.grandTotal || 0) -
                        (parseFloat(editFormData.amountPaid) || 0) +
                        (parseFloat(editFormData.paymentHistory[editingPayment].amount) || 0)
                      ).toFixed(2)}
                      <span className="text-xs ml-1 text-slate-400">(including this payment)</span>
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-amber-400 flex items-center">                      <BsCurrencyRupee />{((editingClient?.grandTotal || 0) - (parseFloat(editFormData.amountPaid) || 0)).toFixed(2)}                    </span>
                  )}
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-300 mb-2">                    Payment Amount                  </label>                  <div className="relative">                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">                      <span className="text-slate-400"><BsCurrencyRupee /></span>                    </div>
                  <input
                    type="number"
                    value={newPayment}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Prevent negative values
                      if (parseFloat(value) < 0) return;

                      setNewPayment(value);
                    }}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-8 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                    autoFocus
                  />
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Payment Date and Time
                </label>
                <input
                  type="datetime-local"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
                <p className="mt-2 text-xs text-slate-400 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {editingPayment !== null
                    ? "You can modify the payment date and time."
                    : "Leave blank to use current date and time."}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setEditingPayment(null);
                    setNewPayment('');
                    setPaymentDate('');
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addNewPayment}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors"
                >
                  {editingPayment !== null ? "Update Payment" : "Add Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Payment Confirmation Modal */}
      {showDeletePaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm overflow-hidden">
          <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 border border-slate-700">
            <div className="flex items-center mb-5">
              <svg className="w-6 h-6 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-bold text-white">Delete Payment</h3>
            </div>

            <p className="text-slate-300 mb-6">
              Are you sure you want to delete this payment? This will reduce the total amount paid and cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeletePaymentModal(false);
                  setSelectedPaymentIndex(null);
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deletePaymentEntry}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
              >
                Delete Payment
              </button>
            </div>
          </div>
        </div>
      )}




      {/* Delete Product Confirmation Modal */}
      {showDeleteProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm overflow-hidden">
          <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 border border-slate-700">
            <div className="flex items-center mb-5">
              <svg className="w-6 h-6 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-bold text-white">Delete Product</h3>
            </div>

            <p className="text-slate-300 mb-6">
              Are you sure you want to delete this product?
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteProductModal(false);
                  setSelectedProductIndex(null);
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteProduct(selectedProductIndex)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge Preview Modal */}
      {showMergeModal && mergedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm overflow-hidden py-10">
          <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl mx-4 border border-slate-700 overflow-hidden animate-fadeIn my-8 max-h-[90vh] flex flex-col">
            <div className="p-5 bg-gradient-to-r from-slate-700 to-slate-800 border-b border-slate-700 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>
                  Merge Preview
                </h3>
                <button
                  onClick={() => {
                    setShowMergeModal(false);
                    setMergedClient(null);
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
              {/* Client Details */}
              <div className="mb-6">
                <h4 className="text-white font-medium text-lg mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Client Information
                </h4>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Client Name</p>
                      <p className="text-white font-medium">{mergedClient.clientName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">GST Number</p>
                      <p className="text-white">{mergedClient.clientGst || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Address</p>
                      <p className="text-white">{mergedClient.clientAddress || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Phone</p>
                      <p className="text-white">{mergedClient.clientPhone || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="mb-6">
                <h4 className="text-white font-medium text-lg mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Financial Summary
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-xs text-slate-400 mb-1">Total Amount</p>
                    <p className="text-white text-xl font-bold flex items-center"><BsCurrencyRupee />{mergedClient.grandTotal.toFixed(2)}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-xs text-slate-400 mb-1">Amount Paid</p>
                    <p className="text-emerald-400 text-xl font-bold flex items-center"><BsCurrencyRupee />{mergedClient.amountPaid.toFixed(2)}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-xs text-slate-400 mb-1">Balance Due</p>
                    <p className={`text-xl font-bold flex items-center ${(mergedClient.grandTotal - mergedClient.amountPaid) <= 0 ? 'text-sky-500' : 'text-amber-500'}`}><BsCurrencyRupee />{(mergedClient.grandTotal - mergedClient.amountPaid).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div className="mb-6">
                <h4 className="text-white font-medium text-lg mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Payment History ({mergedClient.paymentHistory ? mergedClient.paymentHistory.length : 0})
                </h4>
                {mergedClient.paymentHistory && mergedClient.paymentHistory.length > 0 ? (
                  <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-white/10">
                        <tr>
                          <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-300">Date</th>
                          <th className="py-2.5 px-4 text-right text-xs font-medium text-slate-300">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {mergedClient.paymentHistory.map((payment, index) => (
                          <tr key={index} className="text-white hover:bg-white/5">
                            <td className="py-2.5 px-4 text-xs text-slate-300">
                              {new Date(payment.date).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                                timeZone: 'Asia/Kolkata',
                                hour12: true
                              })}
                            </td>
                            <td className="py-2.5 px-4 text-xs text-right font-medium text-emerald-500">                              <span className="flex items-center justify-end"><BsCurrencyRupee />{parseFloat(payment.amount).toFixed(2)}</span>                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center text-slate-400 text-sm">
                    No payment history available
                  </div>
                )}
              </div>

              {/* Products */}
              <div className="mb-6">
                <h4 className="text-white font-medium text-lg mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Products ({mergedClient.products ? mergedClient.products.length : 0})
                  {mergedClient.products && mergedClient.products.some(p => p.discount > 0) && (
                    <div className="ml-2 bg-red-500/20 p-1 rounded-full" title="Contains discounted products">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                  <button 
                    onClick={() => {
                      setSelectedProductsClient(mergedClient);
                      setShowProductsModal(true);
                    }}
                    className="ml-2 p-1 rounded-full bg-white/5 hover:bg-white/10 text-emerald-400 transition-colors"
                    title="View all products"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </h4>
                {mergedClient.products && mergedClient.products.length > 0 ? (
                  <div 
                    className="bg-white/5 rounded-xl border border-white/10 overflow-hidden cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => {
                      setSelectedProductsClient(mergedClient);
                      setShowProductsModal(true);
                    }}
                  >
                    <table className="w-full">
                      <thead className="bg-white/10">
                        <tr>
                          <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-300 w-1/3">Product</th>
                          <th className="py-2.5 px-4 text-center text-xs font-medium text-slate-300 w-1/6">Quantity</th>
                          <th className="py-2.5 px-4 text-right text-xs font-medium text-slate-300 w-1/6">Price</th>
                          <th className="py-2.5 px-4 text-right text-xs font-medium text-slate-300 w-1/6">
                            {mergedClient.products.some(p => p.discount > 0) ? "Discount" : ""}
                          </th>
                          <th className="py-2.5 px-4 text-right text-xs font-medium text-slate-300 w-1/6">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {mergedClient.products.map((product, index) => (
                          <tr key={index} className="hover:bg-white/5 transition-colors">
                            <td className="py-2.5 px-4 text-left">
                              <div className="text-sm text-white">{product.name || 'Unnamed Product'}</div>
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <div className="text-sm text-slate-300">{product.count}</div>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="text-sm text-slate-300">₹{typeof product.price === 'number' ? product.price.toFixed(2) : parseFloat(product.price || 0).toFixed(2)}</div>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {product.discount > 0 ? (
                                <div className="text-sm text-red-400 bg-red-500/10 px-2 py-1 rounded-full inline-block">{product.discount}%</div>
                              ) : (
                                <div className="text-sm text-slate-500">
                                  {mergedClient.products.some(p => p.discount > 0) ? "-" : ""}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="flex flex-col items-end">
                                {product.discount > 0 && (
                                  <span className="text-xs line-through text-slate-500">
                                    ₹{(product.count * product.price).toFixed(2)}
                                  </span>
                                )}
                                <span className="text-sm text-emerald-400">
                                  ₹{product.total ? product.total.toFixed(2) : 
                                    (product.discount ? 
                                      ((product.count * product.price) * (1 - product.discount/100)).toFixed(2) : 
                                      (product.count * product.price).toFixed(2)
                                    )
                                  }
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center text-slate-400 text-sm">
                    No products available
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-slate-700">
              <div className="flex justify-between items-center">
                <div className="text-slate-400 text-sm">
                  <span className="text-white font-medium">{selectedClientsForMerge.length}</span> clients will be merged
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowMergeModal(false);
                      setMergedClient(null);
                    }}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveMergedClient}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl transition-colors flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                    Confirm & Merge
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 py-5">

        {/* Show a prominent banner when merged filter is active */}
        {/* {showMergedOnly && (
          <div className="mt-3 py-2 px-3 bg-purple-500/20 border border-purple-400/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              <span className="text-sm font-medium text-purple-300">
                Showing Only Merged Cards ({filteredClients.length})
              </span>
            </div>
            <button
              onClick={clearMergedOnly}
              className="text-purple-300 hover:text-purple-100 p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )} */}
      </div>

      {/* Password Modal for Delete All */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm overflow-hidden">
          <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 border border-slate-700 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center mb-5">
              <svg className="w-6 h-6 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-bold text-white">Password Required</h3>
            </div>

            <p className="text-slate-300 mb-4">
              Please enter the password to delete all orders. This action cannot be undone.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
                placeholder="Enter password"
                autoFocus
              />
              {passwordError && (
                <p className="mt-2 text-sm text-red-400">{passwordError}</p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePasswordSubmit}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Modal */}
      {showProductsModal && selectedProductsClient && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-hidden">
          <div className="bg-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-lg font-medium text-white flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {selectedProductsClient.clientName || 'Client'}'s Products
                {selectedProductsClient.products && selectedProductsClient.products.some(p => p.discount > 0) && (
                  <div className="ml-2 bg-red-500/20 p-1 rounded-full flex items-center" title="Contains discounted products">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-red-400 ml-1">Discounted</span>
                  </div>
                )}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowProductsModal(false);
                  setSelectedProductsClient(null);
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="bg-white/5 rounded-xl p-4 mb-5 border border-white/10">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-slate-300">Order Total:</span>
                <span className="text-base font-medium text-white flex items-center">
                  <BsCurrencyRupee />{selectedProductsClient.grandTotal?.toFixed(2) || '0.00'}
                </span>
              </div>
              {selectedProductsClient.products && selectedProductsClient.products.some(p => p.discount > 0) && (
                <div className="flex justify-between items-center mb-3 p-2 bg-red-500/10 rounded-lg">
                  <span className="text-sm text-red-400">Total Discount:</span>
                  <span className="text-sm font-medium text-red-400 flex items-center">
                    <BsCurrencyRupee />
                    {selectedProductsClient.products.reduce((total, product) => {
                      if (product.discount > 0) {
                        return total + ((product.count * product.price) * (product.discount / 100));
                      }
                      return total;
                    }, 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {selectedProductsClient.products && selectedProductsClient.products.length > 0 ? (
              <div>
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-white/10 rounded-lg mb-2">
                  <div className="col-span-4 text-left">
                    <span className="text-xs font-medium text-slate-300 uppercase">Product</span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="text-xs font-medium text-slate-300 uppercase">Qty</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-xs font-medium text-slate-300 uppercase">Price</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-xs font-medium text-slate-300 uppercase">
                      {selectedProductsClient.products.some(p => p.discount > 0) ? "Discount" : ""}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-xs font-medium text-slate-300 uppercase">Total</span>
                  </div>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                  {selectedProductsClient.products.map((product, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 px-3 py-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                      <div className="col-span-4 text-left">
                        <span className="text-sm text-white">{product.name || 'Unnamed Product'}</span>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="text-sm text-slate-300">{product.count}</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-sm text-emerald-400 flex items-center justify-end">
                          <BsCurrencyRupee />{typeof product.price === 'number' ? product.price.toFixed(2) : parseFloat(product.price || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="col-span-2 text-right">
                        {product.discount > 0 ? (
                          <span className="text-sm text-red-400 bg-red-500/10 px-2 py-1 rounded-full inline-block">
                            {product.discount}%
                          </span>
                        ) : (
                          <span className="text-sm text-slate-500">
                            {selectedProductsClient.products.some(p => p.discount > 0) ? "-" : ""}
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 text-right">
                        <div className="flex flex-col items-end">
                          {product.discount > 0 && (
                            <span className="text-xs line-through text-slate-500">
                              <BsCurrencyRupee className="inline text-[10px]" />
                              {(product.count * product.price).toFixed(2)}
                            </span>
                          )}
                          <span className="text-sm text-emerald-400 flex items-center justify-end">
                            <BsCurrencyRupee />
                            {product.total ? product.total.toFixed(2) : 
                              (product.discount ? 
                                ((product.count * product.price) * (1 - product.discount/100)).toFixed(2) : 
                                (product.count * product.price).toFixed(2)
                              )
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p className="text-slate-400">No products found in this order</p>
              </div>
            )}

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => {
                  setShowProductsModal(false);
                  setSelectedProductsClient(null);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientList;