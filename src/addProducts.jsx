import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient, fetchAllClients, updateClient } from './firebase/clientsFirebase';
import { ref, get } from 'firebase/database';
import { database } from './firebase/config';

const AddProducts = () => {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientGst, setClientGst] = useState('');
  const [products, setProducts] = useState([
    { id: 1, name: '', count: '', price: '', total: 0 }
  ]);
  const [saveStatus, setSaveStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [orderStatus, setOrderStatus] = useState('sell'); // Add new state for order status
  const [amountPaid, setAmountPaid] = useState('');
  const [billMode, setBillMode] = useState('full');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [existingClients, setExistingClients] = useState([]);
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [gstSuggestions, setGstSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showGstSuggestions, setShowGstSuggestions] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // New state for order ID functionality
  const [orderId, setOrderId] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);

  // Create refs for input fields
  const clientNameRef = useRef(null);
  const clientAddressRef = useRef(null);
  const clientPhoneRef = useRef(null);
  const clientGstRef = useRef(null);
  const amountPaidRef = useRef(null);
  const productRefs = useRef({});
  const orderIdRef = useRef(null);

  // Initialize product refs
  useEffect(() => {
    productRefs.current = {};
  }, []);

  // Fetch existing clients
  useEffect(() => {
    const loadExistingClients = async () => {
      try {
        const clients = await fetchAllClients();
        setExistingClients(clients);
      } catch (error) {
        console.error("Error loading client data:", error);
      }
    };

    loadExistingClients();
  }, []);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);

    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());

    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Handle client name change and check for existing clients
  const handleClientNameChange = (e) => {
    const value = e.target.value;
    setClientName(value);

    if (value.trim() === '') {
      setShowSuggestions(false);
      return;
    }

    // Filter existing clients based on name search
    const matchingClients = existingClients.filter(client =>
      client.clientName && client.clientName.toLowerCase().includes(value.toLowerCase())
    );

    setClientSuggestions(matchingClients);
    setShowSuggestions(matchingClients.length > 0);
  };

  // Handle GST number input change for search
  const handleGstChange = (e) => {
    const value = e.target.value;
    setClientGst(value);

    if (value.trim() === '') {
      setShowGstSuggestions(false);
      return;
    }

    // Filter existing clients based on GST number search
    const matchingClients = existingClients.filter(client =>
      client.clientGst && client.clientGst.toLowerCase().includes(value.toLowerCase())
    );

    setGstSuggestions(matchingClients);
    setShowGstSuggestions(matchingClients.length > 0);
  };

  // Handle order ID input and search for existing order
  const handleOrderIdChange = (e) => {
    const value = e.target.value;
    setOrderId(value);
  };

  // Fetch order details by ID
  const fetchOrderById = async () => {
    if (!orderId.trim()) {
      setErrorMessage('Please enter an order ID');
      setShowErrorModal(true);
      return;
    }

    setIsLoading(true);
    try {
      const orderRef = ref(database, `clients/${orderId}`);
      const snapshot = await get(orderRef);

      if (!snapshot.exists()) {
        setErrorMessage('Order not found. Please check the ID and try again.');
        setShowErrorModal(true);
        setIsLoading(false);
        return;
      }

      const orderData = snapshot.val();

      // Populate form with order data but keep it hidden from UI
      setClientName(orderData.clientName || '');
      setClientAddress(orderData.clientAddress || '');
      setClientPhone(orderData.clientPhone || '');
      setClientGst(orderData.clientGst || '');
      setPaymentStatus(orderData.paymentStatus || 'pending');
      setOrderStatus(orderData.orderStatus || 'sell'); // Set order status from existing order
      setAmountPaid(orderData.amountPaid || '');
      setBillMode(orderData.billMode || 'full');

      // Initialize with an empty product template so the user can add new products
      // We don't load the existing products as we're adding to the order
      setProducts([{
        id: Date.now(), // Use timestamp as ID to avoid conflicts with existing products
        name: '',
        count: '',
        price: '',
        total: 0
      }]);

      // Set edit mode to update existing order
      setIsEditMode(true);
      setCurrentOrderId(orderId);

      // Set success message
      setSaveStatus('Order found! You can now add products to this order.');
      setTimeout(() => setSaveStatus(''), 3000);

    } catch (error) {
      console.error("Error fetching order:", error);
      setErrorMessage(`Error loading order: ${error.message}`);
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Select a client from suggestions
  const selectClient = (client) => {
    setClientName(client.clientName);
    setClientAddress(client.clientAddress || '');
    setClientPhone(client.clientPhone || '');
    setClientGst(client.clientGst || '');
    setShowSuggestions(false);
    setShowGstSuggestions(false);

    // Focus on next empty field after auto-fill
    if (!client.clientAddress) {
      clientAddressRef.current?.focus();
    } else if (!client.clientPhone) {
      clientPhoneRef.current?.focus();
    } else if (!client.clientGst) {
      clientGstRef.current?.focus();
    } else {
      // Focus on the first product's input field
      const firstProductId = products[0]?.id;
      if (firstProductId) {
        const firstField = billMode === 'full' ? 'name' : 'count';
        setTimeout(() => {
          productRefs.current[`${firstProductId}_${firstField}`]?.focus();
        }, 0);
      }
    }
  };

  // Handle key press events to navigate between input fields
  const handleKeyPress = (e, id, field, isLast = false) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      // Client name field handling
      if (field === 'clientName') {
        clientAddressRef.current?.focus();
        return;
      }

      // Client address field handling
      if (field === 'clientAddress') {
        clientPhoneRef.current?.focus();
        return;
      }

      // Client phone field handling
      if (field === 'clientPhone') {
        clientGstRef.current?.focus();
        return;
      }

      // Client GST field handling
      if (field === 'clientGst') {
        // Focus on first product's input field regardless of bill mode
        const firstProductId = products[0]?.id;
        const firstField = billMode === 'full' ? 'name' : 'count';
        productRefs.current[`${firstProductId}_${firstField}`]?.focus();
        return;
      }

      // Amount paid field handling
      if (field === 'amountPaid') {
        // Focus on Save Order button
        const saveButton = document.querySelector('button[onClick="saveOrder"]');
        if (saveButton) {
          saveButton.focus();
          // Also trigger click if Enter was pressed
          if (e.key === 'Enter') {
            saveButton.click();
          }
        }
        return;
      }

      // Order ID field handling
      if (field === 'orderId' && e.key === 'Enter') {
        fetchOrderById();
        return;
      }

      // Product fields handling
      if (id) {
        const currentIndex = products.findIndex(p => p.id === id);
        const currentProduct = products[currentIndex];

        // Define field sequence based on bill mode
        const fieldSequence = billMode === 'full'
          ? ['name', 'count', 'price']
          : ['count', 'price'];

        const currentFieldIndex = fieldSequence.indexOf(field);
        const nextField = fieldSequence[currentFieldIndex + 1];

        // Move to next field in same product
        if (nextField) {
          productRefs.current[`${id}_${nextField}`]?.focus();
          return;
        }

        // Move to next product
        const nextProduct = products[currentIndex + 1];
        if (nextProduct) {
          productRefs.current[`${nextProduct.id}_${fieldSequence[0]}`]?.focus();
          return;
        }

        // If last product and last field, add new product and focus on it
        if (isLast) {
          addProduct();
          // Focus will be set in the useEffect after adding product
        }
      }
    }
  };

  // Focus on the first field of newly added product
  useEffect(() => {
    if (products.length > 0) {
      const lastProduct = products[products.length - 1];
      setTimeout(() => {
        const firstField = billMode === 'full' ? 'name' : 'count';
        productRefs.current[`${lastProduct.id}_${firstField}`]?.focus();
      }, 0);
    }
  }, [products.length, billMode]);

  const handleChange = (id, field, value) => {
    // Validation for count and price fields
    if (field === 'count') {
      // Remove any non-numeric characters except decimal point
      value = value.replace(/[^0-9]/g, '');

      // Convert to number if possible
      if (value !== '') {
        const numValue = parseInt(value, 10);
        // Ensure value is not negative and is a valid number
        if (!isNaN(numValue)) {
          value = Math.max(0, numValue).toString();
        }
      }
    } else if (field === 'price') {
      // Remove any non-numeric characters except decimal point
      value = value.replace(/[^0-9.]/g, '');

      // Ensure only one decimal point
      const parts = value.split('.');
      if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
      }

      // Convert to number if possible
      if (value !== '') {
        const numValue = parseFloat(value);
        // Ensure value is not negative and is a valid number
        if (!isNaN(numValue)) {
          value = Math.max(0, numValue).toString();
        }
      }
    }

    const updatedProducts = products.map(product => {
      if (product.id === id) {
        const updatedProduct = { ...product, [field]: value };

        // Recalculate total when count or price changes
        if (field === 'count' || field === 'price') {
          // Convert empty strings to 0
          const count = updatedProduct.count === '' ? 0 : parseFloat(updatedProduct.count);
          const price = updatedProduct.price === '' ? 0 : parseFloat(updatedProduct.price);

          // Calculate total with two decimal places and ensure it's a number
          updatedProduct.total = parseFloat((count * price).toFixed(2));
        }

        // If this is a new product being edited for the first time, add a timestamp
        if (!updatedProduct.timestamp) {
          updatedProduct.timestamp = Date.now();
        }

        return updatedProduct;
      }
      return product;
    });

    setProducts(updatedProducts);
  };

  const addProduct = () => {
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    // Add timestamp when creating a new product
    const newProduct = {
      id: newId,
      name: '',
      count: '',
      price: '',
      total: 0,
      timestamp: Date.now() // Add timestamp for the new product
    };

    setProducts([...products, newProduct]);

    // Focus on the first field of the new product after it's added
    setTimeout(() => {
      const firstField = billMode === 'full' ? 'name' : 'count';
      const ref = productRefs.current[`${newId}_${firstField}`];
      if (ref) {
        ref.focus();
        ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const removeProduct = (id) => {
    if (products.length > 1) {
      setProducts(products.filter(product => product.id !== id));
    }
  };

  const validateProducts = () => {
    // Check for empty required fields
    const invalidProducts = products.filter(product => {
      if (billMode === 'full') {
        return !product.name || !product.count || !product.price;
      } else {
        return !product.count || !product.price;
      }
    });

    if (invalidProducts.length > 0) {
      let errorMsg = 'Please fill in all required fields:';

      invalidProducts.forEach((product, index) => {
        const missingFields = [];

        if (billMode === 'full' && !product.name) missingFields.push('Product Name');
        if (!product.count) missingFields.push('Quantity');
        if (!product.price) missingFields.push('Price');

        errorMsg += `\nProduct ${index + 1}: ${missingFields.join(', ')}`;
      });

      setErrorMessage(errorMsg);
      setShowErrorModal(true);

      // Focus on the first invalid field and scroll it into view
      const firstInvalidProduct = invalidProducts[0];
      setTimeout(() => {
        // Try to focus on the first missing field
        let fieldToFocus = null;

        if (billMode === 'full' && !firstInvalidProduct.name) {
          fieldToFocus = 'name';
        } else if (!firstInvalidProduct.count) {
          fieldToFocus = 'count';
        } else if (!firstInvalidProduct.price) {
          fieldToFocus = 'price';
        }

        if (fieldToFocus) {
          const focusRef = productRefs.current[`${firstInvalidProduct.id}_${fieldToFocus}`];
          if (focusRef) {
            focusRef.focus();
            focusRef.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Optional: Add visual highlighting to the field
            const originalBorderColor = focusRef.style.borderColor;
            focusRef.style.borderColor = '#ef4444'; // red-500
            focusRef.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.3)';

            // Remove highlighting after a short delay
            setTimeout(() => {
              focusRef.style.borderColor = originalBorderColor;
              focusRef.style.boxShadow = '';
            }, 2000);
          }
        }
      }, 500); // Delay to allow the error modal to be shown first

      return false;
    }

    // Check for invalid numeric values (zero quantity)
    const zeroQuantityProducts = products.filter(product =>
      parseFloat(product.count) === 0 || parseFloat(product.price) === 0
    );

    if (zeroQuantityProducts.length > 0) {
      setErrorMessage('Quantity and price must be greater than zero');
      setShowErrorModal(true);

      // Focus on the first zero-value field
      const firstZeroProduct = zeroQuantityProducts[0];
      setTimeout(() => {
        let fieldToFocus = null;

        if (parseFloat(firstZeroProduct.count) === 0) {
          fieldToFocus = 'count';
        } else if (parseFloat(firstZeroProduct.price) === 0) {
          fieldToFocus = 'price';
        }

        if (fieldToFocus) {
          const focusRef = productRefs.current[`${firstZeroProduct.id}_${fieldToFocus}`];
          if (focusRef) {
            focusRef.focus();
            focusRef.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Optional: Add visual highlighting to the field
            const originalBorderColor = focusRef.style.borderColor;
            focusRef.style.borderColor = '#ef4444'; // red-500
            focusRef.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.3)';

            // Remove highlighting after a short delay
            setTimeout(() => {
              focusRef.style.borderColor = originalBorderColor;
              focusRef.style.boxShadow = '';
            }, 2000);
          }
        }
      }, 500);

      return false;
    }

    return true;
  };

  const saveOrder = async () => {
    // Validate all product fields first
    if (!validateProducts()) {
      return;
    }

    // For existing order mode, make sure we have an order ID
    if (billMode === 'existing' && !currentOrderId) {
      setErrorMessage('Please search for and select an existing order first');
      setShowErrorModal(true);
      return;
    }

    // Show loading status
    setSaveStatus('Saving order...');
    setIsLoading(true);

    try {
      if (isEditMode || (billMode === 'existing' && currentOrderId)) {
        // Get the order ID to use - either from edit mode or from the searched order
        const orderIdToUse = currentOrderId || orderId;

        // For editing existing order, we need to fetch current data first
        const orderRef = ref(database, `clients/${orderIdToUse}`);
        const snapshot = await get(orderRef);

        if (!snapshot.exists()) {
          throw new Error('Order not found');
        }

        const existingOrder = snapshot.val();

        // Prepare the updated order with existing payment history
        const existingPaymentHistory = existingOrder.paymentHistory || [];

        // Only add a new payment entry if amount paid has changed
        let updatedPaymentHistory = [...existingPaymentHistory];

        const existingAmountPaid = parseFloat(existingOrder.amountPaid || 0);
        const newAmountPaid = parseFloat(amountPaid || 0);

        if (newAmountPaid > existingAmountPaid) {
          // Add a new payment entry for the difference
          updatedPaymentHistory.push({
            amount: newAmountPaid - existingAmountPaid,
            date: Date.now()
          });
        }

        // Merge existing products with new ones, avoiding duplicates by ID
        const existingProducts = existingOrder.products || [];
        const productIds = new Set(existingProducts.map(p => p.id));

        // Only add products that aren't empty
        const validNewProducts = products.filter(product => {
          if (billMode === 'full') {
            return product.name && product.count && product.price;
          } else {
            return product.count && product.price;
          }
        }).map(product => {
          // Ensure total is properly calculated as a number
          const count = parseFloat(product.count || 0);
          const price = parseFloat(product.price || 0);
          return {
            ...product,
            count: count,
            price: price,
            total: parseFloat((count * price).toFixed(2))
          };
        });

        // Combine products (keeping existing products and adding new ones)
        const combinedProducts = [
          ...existingProducts.map(product => {
            // Ensure existing products also have numeric values and correct totals
            const count = parseFloat(product.count || 0);
            const price = parseFloat(product.price || 0);
            return {
              ...product,
              count: count,
              price: price,
              total: parseFloat((count * price).toFixed(2))
            };
          }),
          ...validNewProducts.filter(p => !productIds.has(p.id))
        ];

        // Calculate new grand total based on all products
        const updatedGrandTotal = parseFloat(combinedProducts.reduce(
          (sum, product) => {
            // Make sure we're adding numeric values
            const productTotal = typeof product.total === 'number' ? product.total :
              parseFloat(product.count || 0) * parseFloat(product.price || 0);
            return sum + productTotal;
          },
          0
        ).toFixed(2)); // Fix to 2 decimal places and convert back to number

        // Create updated order data
        const updatedOrderData = {
          ...existingOrder,
          clientName,
          clientAddress,
          clientPhone,
          clientGst,
          products: combinedProducts,
          grandTotal: updatedGrandTotal,
          paymentStatus: newAmountPaid >= updatedGrandTotal ? 'cleared' : 'pending',
          orderStatus, // Include order status in the update
          amountPaid: newAmountPaid,
          paymentHistory: updatedPaymentHistory,
          billMode,
          lastUpdated: Date.now()
        };

        // Update the order
        await updateClient({
          id: orderIdToUse,
          ...updatedOrderData
        });

        setSaveStatus('Order updated successfully!');
      } else {
        // Create a new order
        // Create initial payment history if there's an amount paid
        const initialPaymentAmount = parseFloat(amountPaid || 0);
        let paymentHistory = [];

        if (initialPaymentAmount > 0) {
          paymentHistory.push({
            amount: initialPaymentAmount,
            date: Date.now()
          });
        }

        // Filter out empty products and ensure correct data types for all fields
        const validProducts = products.filter(product => {
          if (billMode === 'full') {
            return product.name && product.count && product.price;
          } else {
            return product.count && product.price;
          }
        }).map(product => {
          // Convert all numeric fields to ensure they're numbers, not strings
          const count = parseFloat(product.count || 0);
          const price = parseFloat(product.price || 0);
          return {
            ...product,
            count: count,
            price: price,
            total: parseFloat((count * price).toFixed(2)),
            timestamp: product.timestamp || Date.now() // Ensure all products have a timestamp
          };
        });

        // Create order data object
        const orderData = {
          clientName,
          clientAddress,
          clientPhone,
          clientGst,
          products: validProducts, // Use the filtered and processed products
          grandTotal: parseFloat(validProducts.reduce((sum, product) => sum + product.total, 0).toFixed(2)),
          paymentStatus: initialPaymentAmount >= grandTotal ? 'cleared' : 'pending',
          orderStatus, // Include order status in new orders
          amountPaid: initialPaymentAmount,
          timestamp: Date.now(),
          billMode,
          paymentHistory
        };

        await createClient(orderData);
        setSaveStatus('Order saved successfully!');
      }

      // Show success popup
      setShowSuccessModal(true);

      // Clear all input fields after successful save
      clearForm();

      // Clear status message after 3 seconds
      setTimeout(() => {
        setSaveStatus('');
        setIsLoading(false);
      }, 3000);
    } catch (error) {
      setSaveStatus(`Error: ${error.message}`);
      setIsLoading(false);
      // Clear error after 3 seconds
      setTimeout(() => {
        setSaveStatus('');
      }, 3000);
    }
  };

  // Function to clear all input fields
  const clearForm = () => {
    setClientName('');
    setClientAddress('');
    setClientPhone('');
    setClientGst('');
    setProducts([{ id: 1, name: '', count: '', price: '', total: 0 }]);
    setAmountPaid('');
    setPaymentStatus('pending');
    setOrderStatus('sell'); // Reset order status
    setOrderId('');
    setIsEditMode(false);
    setCurrentOrderId(null);

    // When in "existing" mode, stay in that mode but reset the order ID search
    // In other cases, keep the current bill mode
    if (billMode !== 'existing') {
      // Keep the current bill mode
    }
  };

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('isLoggedIn');

    // Redirect to login page
    navigate('/login');
  };

  const handleDashboard = () => {
    navigate('/dashboard');
  };

  const handleExpenss = () => {
    navigate('/expenses');
  };


  const grandTotal = products.reduce((sum, product) => {
    // Make sure we're adding numeric values
    return sum + (typeof product.total === 'number' ? product.total : 0);
  }, 0);

  const handleAmountPaidChange = (e) => {
    let value = e.target.value;

    // Remove any non-numeric characters except decimal point
    value = value.replace(/[^0-9.]/g, '');

    // Ensure only one decimal point
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }

    // Convert to number if possible and ensure non-negative
    if (value !== '') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue < 0) {
        value = '0';
      }
    }

    setAmountPaid(value);

    // Automatically set payment status based on amount paid
    if (value && parseFloat(value) >= grandTotal) {
      setPaymentStatus('cleared');
    } else {
      setPaymentStatus('pending');
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50'} relative overflow-hidden`}>
      {/* Animated Background */}
      <div className="absolute inset-0 w-full h-full z-0">
        {!darkMode ? (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50">
            <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
            <div className="absolute -bottom-8 right-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-3000"></div>

            {/* Floating particles for light mode */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(30)].map((_, i) => {
                const size = Math.random() * 20 + 10;
                const animationDuration = Math.random() * 30 + 15;
                const startPosition = Math.random() * 100;
                const transparency = Math.random() * 0.2 + 0.05;
                const hue = Math.floor(Math.random() * 60) + 220; // Blue to purple range

                return (
                  <div
                    key={i}
                    className="absolute rounded-full animate-float"
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      left: `${startPosition}%`,
                      bottom: `-${size}px`,
                      background: `hsla(${hue}, 70%, 70%, ${transparency})`,
                      animationDuration: `${animationDuration}s`,
                      animationDelay: `${Math.random() * 20}s`
                    }}
                  />
                );
              })}
            </div>

            {/* Optional subtle pattern overlay */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diamond-upholstery.png')] opacity-5"></div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-gray-900">
            <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-900 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-900 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-900 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
            <div className="absolute -bottom-8 right-20 w-72 h-72 bg-blue-900 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-3000"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

            {/* Stars animation for dark mode */}
            <div id="stars-container" className="absolute inset-0">
              {[...Array(50)].map((_, i) => {
                const size = Math.random() * 2 + 1;
                const animationDuration = Math.random() * 50 + 20;
                const left = Math.random() * 100;
                const top = Math.random() * 100;
                const animationDelay = Math.random() * 50;

                return (
                  <div
                    key={i}
                    className="absolute rounded-full bg-white animate-twinkle"
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      left: `${left}%`,
                      top: `${top}%`,
                      animationDuration: `${animationDuration}s`,
                      animationDelay: `${animationDelay}s`
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
        <style>
          {`
            @keyframes blob {
              0% {
                transform: translate(0px, 0px) scale(1);
              }
              33% {
                transform: translate(30px, -50px) scale(1.1);
              }
              66% {
                transform: translate(-20px, 20px) scale(0.9);
              }
              100% {
                transform: translate(0px, 0px) scale(1);
              }
            }
            .animate-blob {
              animation: blob 15s infinite;
            }
            .animation-delay-2000 {
              animation-delay: 2s;
            }
            .animation-delay-3000 {
              animation-delay: 3s;
            }
            .animation-delay-4000 {
              animation-delay: 4s;
            }
            
            @keyframes twinkle {
              0%, 100% {
                opacity: 0.2;
                transform: scale(0.8);
              }
              50% {
                opacity: 1;
                transform: scale(1.2);
              }
            }
            .animate-twinkle {
              animation-name: twinkle;
              animation-duration: 5s;
              animation-iteration-count: infinite;
            }
            
            @keyframes float {
              0% {
                transform: translateY(0) rotate(0deg);
                opacity: 0;
              }
              10% {
                opacity: 1;
              }
              90% {
                opacity: 0.5;
              }
              100% {
                transform: translateY(-100vh) rotate(360deg);
                opacity: 0;
              }
            }
            .animate-float {
              animation-name: float;
              animation-iteration-count: infinite;
              animation-timing-function: ease-in-out;
            }
            
            @keyframes pulse {
              0%, 100% {
                transform: scale(1);
                opacity: 0.4;
              }
              50% {
                transform: scale(1.2);
                opacity: 0.2;
              }
            }
            .pulse-animation {
              animation: pulse 3s infinite;
            }
            
            .icon-glow-container {
              position: relative;
              overflow: visible;
            }
            .icon-glow-container:after {
              content: '';
              position: absolute;
              top: -5px;
              left: -5px;
              right: -5px;
              bottom: -5px;
              border-radius: 16px;
              background: linear-gradient(45deg, #ff8a00, #e52e71, #764ba2, #00cdac);
              background-size: 400% 400%;
              z-index: 0;
              filter: blur(8px);
              opacity: 0.7;
              animation: glowAnimation 10s ease infinite;
            }
            @keyframes glowAnimation {
              0% {
                background-position: 0% 50%;
              }
              50% {
                background-position: 100% 50%;
              }
              100% {
                background-position: 0% 50%;
              }
            }
            @keyframes pulseHighlight {
              0%, 100% {
                box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7);
                transform: scale(1);
              }
              50% {
                box-shadow: 0 0 20px 5px rgba(99, 102, 241, 0.5);
                transform: scale(1.02);
              }
            }
            .animate-pulse-highlight {
              animation: pulseHighlight 1.5s cubic-bezier(0.4, 0, 0.6, 1);
            }
          `}
        </style>
      </div>

      <div className={`max-w-5xl mx-auto ${darkMode ? 'bg-gray-800 bg-opacity-90' : 'bg-white bg-opacity-90'} shadow-xl overflow-hidden transition-all duration-300 backdrop-blur-sm relative z-10`}>
        {/* Enhanced Header with modern glass morphism effect */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 px-4 sm:px-6 py-5 sm:py-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-white opacity-10 backdrop-blur-xl"></div>
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gradient-to-br from-white to-transparent opacity-10"></div>
          <div className="absolute -left-10 -bottom-16 w-40 h-40 rounded-full bg-indigo-300 opacity-10"></div>

          <div className="relative flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6">
            <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-0">
              <div className="bg-white bg-opacity-20 p-2 sm:p-3 rounded-xl backdrop-blur-sm relative icon-glow-container">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-white relative z-10" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 100-12 6 6 0 000 12zm.75-6a.75.75 0 000-1.5h-1.5a.75.75 0 000 1.5h1.5z" clipRule="evenodd" />
                </svg>
                <div className="absolute inset-0 bg-white opacity-40 rounded-xl blur-md pulse-animation"></div>
                {/* <img
                  src="/siyaramlogo.png"
                  alt="icon"
                  className="h-14 w-14 sm:h-8 sm:w-8 object-contain text-white"
                /> */}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">Billing System</h1>
                <p className="text-indigo-100 text-xs sm:text-sm mt-0.5 sm:mt-1">Billing System</p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2 sm:flex sm:flex-wrap sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => navigate('/clients')}
                className="flex items-center justify-center px-2 sm:px-4 py-2 sm:py-2.5 bg-white bg-opacity-20 text-white text-xs sm:text-sm rounded-xl hover:bg-opacity-30 transition-all duration-300 font-medium backdrop-blur-sm shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
                <span className="hidden sm:inline">Clients</span>
              </button>
              <button
                onClick={handleDashboard}
                className="flex items-center justify-center px-2 sm:px-4 py-2 sm:py-2.5 bg-[#2563EB] bg-opacity-90 text-white text-xs sm:text-sm rounded-xl hover:bg-opacity-100 transition-all duration-300 font-medium shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h4v4H4V6zM10 6h10v4H10V6zM4 12h10v6H4v-6zM16 12h4v6h-4v-6z" />
                </svg>

                <span className="hidden sm:inline">dashboard</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center px-2 sm:px-4 py-2 sm:py-2.5 bg-red-500 bg-opacity-90 text-white text-xs sm:text-sm rounded-xl hover:bg-opacity-100 transition-all duration-300 font-medium shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7z" clipRule="evenodd" />
                  <path d="M4 9h8v2H4V9z" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
              <button
                onClick={handleExpensses}
                className="flex items-center justify-center px-2 sm:px-4 py-2 sm:py-2.5 bg-green-500 bg-opacity-90 text-white text-xs sm:text-sm rounded-xl hover:bg-opacity-100 transition-all duration-300 font-medium shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H9a2 2 0 00-2 2v2m10 0V7a2 2 0 00-2-2H9a2 2 0 00-2 2v2m10 0a2 2 0 012 2v4a2 2 0 01-2 2m0 0v2a2 2 0 01-2 2H9a2 2 0 01-2-2v-2m10 0H7" />
                </svg>
              </button>
              <button
                onClick={toggleDarkMode}
                className="flex items-center justify-center px-2 sm:px-4 py-2 sm:py-2.5 bg-white bg-opacity-20 text-white text-xs sm:text-sm rounded-xl hover:bg-opacity-30 transition-all duration-300 font-medium backdrop-blur-sm shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
              >
                {darkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {/* Add Order ID Search field - only show when in 'existing' mode */}
          {billMode === 'existing' && (
            <div className="mb-6">
              <div className={`p-4 rounded-xl ${billMode === 'existing'
                ? darkMode
                  ? 'bg-indigo-900 border-indigo-700 shadow-lg transform scale-105 transition-all duration-300'
                  : 'bg-indigo-100 border-indigo-300 shadow-lg transform scale-105 transition-all duration-300'
                : darkMode
                  ? 'bg-gray-700 border-gray-600'
                  : 'bg-indigo-50 border-indigo-100'
                } border`}>
                <h3 className={`text-sm sm:text-base font-medium mb-3 ${billMode === 'existing'
                  ? darkMode ? 'text-indigo-300' : 'text-indigo-800'
                  : darkMode ? 'text-white' : 'text-gray-700'
                  }`}>
                  {billMode === 'existing'
                    ? 'Search for Existing Order to Add Products'
                    : 'Search & Add Products to Existing Order'}
                </h3>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      id="orderId"
                      className={`block w-full px-4 py-3 border ${billMode === 'existing'
                        ? darkMode
                          ? 'border-indigo-500 bg-gray-800 text-white focus:ring-indigo-300 focus:border-indigo-300 border-2'
                          : 'border-indigo-400 bg-white text-gray-800 focus:ring-indigo-500 focus:border-indigo-500 border-2'
                        : darkMode
                          ? 'border-gray-600 bg-gray-800 text-white focus:ring-indigo-400 focus:border-indigo-400'
                          : 'border-gray-300 bg-white text-gray-800 focus:ring-indigo-500 focus:border-indigo-500'
                        } rounded-xl transition-all duration-200`}
                      value={orderId}
                      onChange={handleOrderIdChange}
                      placeholder={billMode === 'existing' ? "Enter Order ID" : "Enter Order ID"}
                      ref={orderIdRef}
                      onKeyDown={(e) => handleKeyPress(e, null, 'orderId')}
                    />
                  </div>
                  <button
                    onClick={fetchOrderById}
                    className={`px-4 py-3 min-h-[48px] w-full sm:w-auto ${isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : billMode === 'existing'
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transform hover:scale-105'
                        : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700'
                      } text-white rounded-xl transition-all duration-300 shadow-md flex items-center justify-center`}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                        <span className="whitespace-nowrap">{billMode === 'existing' ? 'Find & Add to Order' : 'Find Order'}</span>
                      </>
                    )}
                  </button>
                </div>
                {isEditMode && currentOrderId && (
                  <div className={`mt-2 p-2 rounded-lg ${darkMode ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-100 text-indigo-800'} text-xs sm:text-sm flex items-start sm:items-center flex-wrap sm:flex-nowrap`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>Editing Order: <strong>{currentOrderId}</strong> - Fill in product details and click "Save Order" to update</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Enhanced Bill Mode Toggle - only show when not in edit mode */}
          {!isEditMode && (
            <div className="mb-8">
              <div className="flex justify-center">
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} p-1 rounded-2xl inline-flex flex-wrap sm:flex-nowrap shadow-inner w-full max-w-md mx-auto`}>
                  <button
                    onClick={() => setBillMode('full')}
                    className={`flex-1 min-w-0 px-3 sm:px-8 py-3 rounded-xl transition-all duration-300 flex items-center justify-center space-x-1 sm:space-x-2 m-1 ${billMode === 'full'
                      ? `${darkMode ? 'bg-gray-800 text-indigo-400 shadow-lg' : 'bg-white text-indigo-600 shadow-md'} transform scale-105`
                      : `${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`
                      }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 sm:h-5 sm:w-5 ${billMode === 'full' ? 'text-indigo-500' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs sm:text-base whitespace-nowrap">Full Bill</span>
                  </button>
                  <button
                    onClick={() => setBillMode('half')}
                    className={`flex-1 min-w-0 px-3 sm:px-8 py-3 rounded-xl transition-all duration-300 flex items-center justify-center space-x-1 sm:space-x-2 m-1 ${billMode === 'half'
                      ? `${darkMode ? 'bg-gray-800 text-indigo-400 shadow-lg' : 'bg-white text-indigo-600 shadow-md'} transform scale-105`
                      : `${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`
                      }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 sm:h-5 sm:w-5 ${billMode === 'half' ? 'text-indigo-500' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                      <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs sm:text-base whitespace-nowrap">Half Bill</span>
                  </button>
                  <button
                    onClick={() => {
                      // Set bill mode to existing and focus on the order ID input
                      setBillMode('existing');
                      setTimeout(() => {
                        if (orderIdRef.current) {
                          orderIdRef.current.focus();
                          orderIdRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });

                          // Add a pulse animation to highlight the search section
                          const searchSection = orderIdRef.current.closest('div.rounded-xl');
                          if (searchSection) {
                            searchSection.classList.add('animate-pulse-highlight');
                            // Remove the animation class after animation completes
                            setTimeout(() => {
                              searchSection.classList.remove('animate-pulse-highlight');
                            }, 1500);
                          }
                        }
                      }, 100);
                    }}
                    className={`flex-1 min-w-0 px-3 sm:px-8 py-3 rounded-xl transition-all duration-300 flex items-center justify-center space-x-1 sm:space-x-2 m-1 ${billMode === 'existing'
                      ? `${darkMode ? 'bg-gray-800 text-indigo-400 shadow-lg' : 'bg-white text-indigo-600 shadow-md'} transform scale-105`
                      : `${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`
                      }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 sm:h-5 sm:w-5 ${billMode === 'existing' ? 'text-indigo-500' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs sm:text-base whitespace-nowrap">Existing</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Client information section - only show when not in edit mode and not in existing order mode */}
          {!isEditMode && billMode !== 'existing' && (
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client name input with enhanced floating label and suggestions */}
              <div className="relative group">
                <input
                  type="text"
                  id="clientName"
                  className={`block w-full px-4 py-4 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white focus:ring-indigo-400 focus:border-indigo-400 placeholder-gray-400' : 'border-gray-300 bg-white text-gray-800 focus:ring-indigo-500 focus:border-indigo-500'} rounded-xl transition-all duration-200 peer placeholder-transparent group-hover:border-indigo-300`}
                  value={clientName}
                  onChange={handleClientNameChange}
                  placeholder="Client Name"
                  ref={clientNameRef}
                  onKeyDown={(e) => handleKeyPress(e, null, 'clientName')}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                <label
                  htmlFor="clientName"
                  className={`absolute text-sm ${darkMode ? 'text-gray-400 bg-gray-700 peer-focus:text-indigo-400 group-hover:text-indigo-400' : 'text-gray-500 bg-white peer-focus:text-indigo-600 group-hover:text-indigo-500'} duration-300 transform -translate-y-3 scale-85 top-3 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-85 peer-focus:-translate-y-3 px-1`}
                >
                  Client Name
                </label>

                {/* Enhanced client name suggestions dropdown */}
                {showSuggestions && clientSuggestions.length > 0 && (
                  <div className={`absolute z-20 w-full mt-1 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} border rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-100'} transform transition-all duration-200 origin-top`}>
                    {clientSuggestions.map((client, index) => (
                      <div
                        key={client.id || index}
                        className={`px-4 py-3 cursor-pointer ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-indigo-50'} transition-colors duration-150 flex flex-col group/item`}
                        onClick={() => selectClient(client)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`${darkMode ? 'bg-gray-600 group-hover/item:bg-gray-500' : 'bg-indigo-100 group-hover/item:bg-indigo-200'} rounded-full p-2 transition-colors duration-200`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`} viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className={`font-medium ${darkMode ? 'text-white group-hover/item:text-indigo-300' : 'text-gray-800 group-hover/item:text-indigo-600'} transition-colors duration-200`}>{client.clientName}</span>
                        </div>
                        <div className="ml-11 mt-2 flex flex-col space-y-1">
                          {client.clientPhone && (
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${darkMode ? 'text-gray-400' : 'text-gray-400'} mr-1`} viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                              </svg>
                              <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>{client.clientPhone}</span>
                            </div>
                          )}
                          {client.clientGst && (
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${darkMode ? 'text-indigo-300' : 'text-indigo-400'} mr-1`} viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                              </svg>
                              <span className={`text-xs ${darkMode ? 'text-indigo-300 font-medium' : 'text-indigo-600 font-medium'}`}>GST: {client.clientGst}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Client address input with enhanced floating label */}
              <div className="relative group">
                <input
                  type="text"
                  id="clientAddress"
                  className={`block w-full px-4 py-4 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white focus:ring-indigo-400 focus:border-indigo-400 placeholder-gray-400' : 'border-gray-300 bg-white text-gray-800 focus:ring-indigo-500 focus:border-indigo-500'} rounded-xl transition-all duration-200 peer placeholder-transparent group-hover:border-indigo-300`}
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="Client Address"
                  ref={clientAddressRef}
                  onKeyDown={(e) => handleKeyPress(e, null, 'clientAddress')}
                />
                <label
                  htmlFor="clientAddress"
                  className={`absolute text-sm ${darkMode ? 'text-gray-400 bg-gray-700 peer-focus:text-indigo-400 group-hover:text-indigo-400' : 'text-gray-500 bg-white peer-focus:text-indigo-600 group-hover:text-indigo-500'} duration-300 transform -translate-y-3 scale-85 top-3 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-85 peer-focus:-translate-y-3 px-1`}
                >
                  Client Address
                </label>
              </div>

              {/* Client phone input with enhanced floating label */}
              <div className="relative group">
                <input
                  type="text"
                  id="clientPhone"
                  className={`block w-full px-4 py-4 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white focus:ring-indigo-400 focus:border-indigo-400 placeholder-gray-400' : 'border-gray-300 bg-white text-gray-800 focus:ring-indigo-500 focus:border-indigo-500'} rounded-xl transition-all duration-200 peer placeholder-transparent group-hover:border-indigo-300`}
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="Client Phone"
                  ref={clientPhoneRef}
                  onKeyDown={(e) => handleKeyPress(e, null, 'clientPhone')}
                />
                <label
                  htmlFor="clientPhone"
                  className={`absolute text-sm ${darkMode ? 'text-gray-400 bg-gray-700 peer-focus:text-indigo-400 group-hover:text-indigo-400' : 'text-gray-500 bg-white peer-focus:text-indigo-600 group-hover:text-indigo-500'} duration-300 transform -translate-y-3 scale-85 top-3 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-85 peer-focus:-translate-y-3 px-1`}
                >
                  Client Phone
                </label>
              </div>

              {/* Client GST input with enhanced floating label */}
              <div className="relative group">
                <input
                  type="text"
                  id="clientGst"
                  className={`block w-full px-4 py-4 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white focus:ring-indigo-400 focus:border-indigo-400 placeholder-gray-400' : 'border-gray-300 bg-white text-gray-800 focus:ring-indigo-500 focus:border-indigo-500'} rounded-xl transition-all duration-200 peer placeholder-transparent group-hover:border-indigo-300`}
                  value={clientGst}
                  onChange={(e) => {
                    setClientGst(e.target.value);
                    handleGstChange(e);
                  }}
                  placeholder="GST Number"
                  ref={clientGstRef}
                  onKeyDown={(e) => handleKeyPress(e, null, 'clientGst')}
                  onBlur={() => setTimeout(() => setShowGstSuggestions(false), 200)}
                />
                <label
                  htmlFor="clientGst"
                  className={`absolute text-sm ${darkMode ? 'text-gray-400 bg-gray-700 peer-focus:text-indigo-400 group-hover:text-indigo-400' : 'text-gray-500 bg-white peer-focus:text-indigo-600 group-hover:text-indigo-500'} duration-300 transform -translate-y-3 scale-85 top-3 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-85 peer-focus:-translate-y-3 px-1`}
                >
                  GST Number
                </label>

                {/* Enhanced GST-specific suggestions dropdown */}
                {showGstSuggestions && gstSuggestions.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-gray-100 transform transition-all duration-200 origin-top">
                    {gstSuggestions.map((client, index) => (
                      <div
                        key={client.id || index}
                        className="px-4 py-3 cursor-pointer hover:bg-indigo-50 transition-colors duration-150 flex flex-col group/item"
                        onClick={() => selectClient(client)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="bg-indigo-100 rounded-full p-2 group-hover/item:bg-indigo-200 transition-colors duration-200">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div>
                            <div className="flex items-center">
                              <span className="text-sm font-semibold text-indigo-600 group-hover/item:text-indigo-700 transition-colors duration-200">GST: {client.clientGst}</span>
                            </div>
                            <span className="font-medium text-gray-800 group-hover/item:text-indigo-600 transition-colors duration-200">{client.clientName}</span>
                          </div>
                        </div>
                        <div className="ml-11 mt-2 flex flex-col space-y-1">
                          {client.clientPhone && (
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                              </svg>
                              <span className="text-xs text-gray-500">{client.clientPhone}</span>
                            </div>
                          )}
                          {client.clientAddress && (
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                              </svg>
                              <span className="text-xs text-gray-500 truncate max-w-[15rem]">{client.clientAddress}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Display client info summary when in edit mode */}
          {isEditMode && (
            <div className="mb-6">
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-indigo-50 border-indigo-100'} border`}>
                <h3 className={`text-sm font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-700'}`}>Order Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className={`block ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Client:</span>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{clientName}</span>
                  </div>
                  <div>
                    <span className={`block ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>GST:</span>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{clientGst || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Products section with improved card design */}
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl shadow-lg mb-8 overflow-hidden`}>
            <div className={`${darkMode ? 'from-gray-700 to-gray-800' : 'from-indigo-50 to-blue-50'} bg-gradient-to-r flex flex-wrap sm:flex-nowrap justify-between items-center p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} gap-3`}>
              <div className='flex justify-center text-center'>
                <h2 className={`text-base sm:text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} flex items-center`}>
                  {billMode === 'existing' && !isEditMode
                    ? 'Products to Add to Existing Order'
                    : 'Product Details'}
                </h2>
              </div>
              <div>
                <button
                  className={`flex items-center justify-center p-2 min-h-[40px] ${billMode === 'existing' && currentOrderId
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-3'
                    : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700'
                    } text-white rounded-xl transition-all duration-300 shadow-md`}
                  onClick={addProduct}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-2 text-sm sm:text-base">{billMode === 'existing' && currentOrderId ? 'Add New Product' : 'Add'}</span>
                </button>
              </div>
            </div>

            {/* Show instruction message when in existing mode but no order found yet */}
            {billMode === 'existing' && !isEditMode && !currentOrderId && (
              <div className={`p-6 sm:p-8 text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <div className="flex flex-col items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 sm:h-16 sm:w-16 mb-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">Search for an Order First</h3>
                  <p className="mb-4 max-w-md text-sm sm:text-base">Enter an Order ID in the search box above and click "Find & Add to Order" to add products to an existing order.</p>
                  <button
                    onClick={() => {
                      if (orderIdRef.current) {
                        orderIdRef.current.focus();
                        orderIdRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                    className={`px-5 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 shadow-md text-sm sm:text-base`}
                  >
                    Go to Search
                  </button>
                </div>
              </div>
            )}

            {/* Only show the product table when not in existing mode or when an order is found */}
            {(billMode !== 'existing' || isEditMode || currentOrderId) && (
              <>
                {/* Table header - Only visible on larger screens */}
                <div className={`hidden md:grid md:grid-cols-12 md:gap-4 font-semibold ${darkMode ? 'text-gray-300 bg-gray-700 border-gray-600' : 'text-gray-700 bg-gray-50 border-gray-200'} border-b p-4`}>
                  {billMode === 'full' && <div className="col-span-3">Product Name</div>}
                  <div className={billMode === 'full' ? "col-span-2" : "col-span-4"}>Quantity</div>
                  <div className={billMode === 'full' ? "col-span-2" : "col-span-4"}>Price</div>
                  <div className={billMode === 'full' ? "col-span-3" : "col-span-2"}>Total</div>
                  <div className="col-span-2">Action</div>
                </div>

                <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                  {products.map(product => (
                    <div key={product.id} className={`p-4 md:grid md:grid-cols-12 md:gap-4 md:items-center transition-all duration-200 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                      {/* Mobile layout - stacked fields with labels */}
                      <div className="md:hidden mb-3">
                        {billMode === 'full' && (
                          <div className="mb-3">
                            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Product Name</label>
                            <input
                              type="text"
                              className={`w-full p-3 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white focus:ring-indigo-400 focus:border-indigo-400' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'} rounded-xl transition-all duration-200 text-base`}
                              value={product.name}
                              onChange={(e) => handleChange(product.id, 'name', e.target.value)}
                              placeholder="Product name"
                              ref={(el) => (productRefs.current[`${product.id}_name`] = el)}
                              onKeyDown={(e) => handleKeyPress(e, product.id, 'name')}
                            />
                          </div>
                        )}
                        <div className="mb-3 grid grid-cols-2 gap-3">
                          <div>
                            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Quantity</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              className={`w-full p-3 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white focus:ring-indigo-400 focus:border-indigo-400' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'} rounded-xl transition-all duration-200 text-base`}
                              value={product.count}
                              onChange={(e) => handleChange(product.id, 'count', e.target.value)}
                              placeholder="0"
                              min="0"
                              ref={(el) => (productRefs.current[`${product.id}_count`] = el)}
                              onKeyDown={(e) => {
                                // Prevent "-" and "_" characters
                                if (e.key === "-" || e.key === "_") {
                                  e.preventDefault();
                                }
                                handleKeyPress(e, product.id, 'count');
                              }}
                              title="Please enter a positive whole number"
                            />
                          </div>
                          <div>
                            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Price</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              className={`w-full p-3 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white focus:ring-indigo-400 focus:border-indigo-400' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'} rounded-xl transition-all duration-200 text-base`}
                              value={product.price}
                              onChange={(e) => handleChange(product.id, 'price', e.target.value)}
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              ref={(el) => (productRefs.current[`${product.id}_price`] = el)}
                              onKeyDown={(e) => {
                                // Prevent "-" and "_" characters
                                if (e.key === "-" || e.key === "_") {
                                  e.preventDefault();
                                }
                                handleKeyPress(e, product.id, 'price', product.id === products[products.length - 1].id)
                              }}
                              title="Please enter a positive number"
                            />
                          </div>
                        </div>
                        <div className="mb-3 flex flex-col sm:flex-row gap-3 justify-between">
                          <div className="w-full sm:w-1/2">
                            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Total</label>
                            <div className={`p-3 ${darkMode ? 'bg-gray-600 text-indigo-300 border-gray-700' : 'bg-indigo-50 text-indigo-800 border-indigo-100'} rounded-xl font-medium border text-base`}>
                              ₹ {product.total.toFixed(2)}
                            </div>
                          </div>
                          <div className="flex items-end">
                            <button
                              className="w-full sm:w-auto flex items-center justify-center p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-300"
                              onClick={() => removeProduct(product.id)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              Remove Product
                            </button>
                          </div>
                        </div>
                        <div className="border-t border-dashed my-2 pt-2 border-gray-300 dark:border-gray-600"></div>
                      </div>

                      {/* Desktop layout - grid layout */}
                      {billMode === 'full' && (
                        <div className="hidden md:block md:col-span-3">
                          <input
                            type="text"
                            className={`w-full p-3 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white focus:ring-indigo-400 focus:border-indigo-400' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'} rounded-xl transition-all duration-200`}
                            value={product.name}
                            onChange={(e) => handleChange(product.id, 'name', e.target.value)}
                            placeholder="Product name"
                            ref={(el) => (productRefs.current[`${product.id}_name`] = el)}
                            onKeyDown={(e) => handleKeyPress(e, product.id, 'name')}
                          />
                        </div>
                      )}
                      <div className={`hidden md:block ${billMode === 'full' ? "md:col-span-2" : "md:col-span-4"}`}>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className={`w-full p-3 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white focus:ring-indigo-400 focus:border-indigo-400' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'} rounded-xl transition-all duration-200`}
                          value={product.count}
                          onChange={(e) => handleChange(product.id, 'count', e.target.value)}
                          placeholder="0"
                          min="0"
                          ref={(el) => (productRefs.current[`${product.id}_count`] = el)}
                          onKeyDown={(e) => {
                            // Prevent "-" and "_" characters
                            if (e.key === "-" || e.key === "_") {
                              e.preventDefault();
                            }
                            handleKeyPress(e, product.id, 'count');
                          }}
                          title="Please enter a positive whole number"
                        />
                      </div>
                      <div className={`hidden md:block ${billMode === 'full' ? "md:col-span-2" : "md:col-span-4"}`}>
                        <input
                          type="text"
                          inputMode="decimal"
                          className={`w-full p-3 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white focus:ring-indigo-400 focus:border-indigo-400' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'} rounded-xl transition-all duration-200`}
                          value={product.price}
                          onChange={(e) => handleChange(product.id, 'price', e.target.value)}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          ref={(el) => (productRefs.current[`${product.id}_price`] = el)}
                          onKeyDown={(e) => {
                            // Prevent "-" and "_" characters
                            if (e.key === "-" || e.key === "_") {
                              e.preventDefault();
                            }
                            handleKeyPress(e, product.id, 'price', product.id === products[products.length - 1].id);
                          }}
                          title="Please enter a positive number"
                        />
                      </div>
                      <div className={`hidden md:block font-medium ${billMode === 'full' ? "md:col-span-3" : "md:col-span-2"}`}>
                        <div className={`p-3 ${darkMode ? 'bg-gray-600 text-indigo-300 border-gray-700' : 'bg-indigo-50 text-indigo-800 border-indigo-100'} rounded-xl border`}>
                          ₹ {product.total.toFixed(2)}
                        </div>
                      </div>
                      <div className="hidden md:block md:col-span-2">
                        <button
                          className="flex items-center p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-300"
                          onClick={() => removeProduct(product.id)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Payment status and amount section with improved design */}
          {(isEditMode || (billMode === 'full' && !isEditMode) || (billMode === 'half' && !isEditMode) || (billMode === 'existing' && currentOrderId)) && (
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'} rounded-xl p-4 shadow-sm border`}>
                <label className={`block ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-medium mb-3 text-sm sm:text-base`}>
                  {billMode === 'existing' ? 'Payment Status (Updated After Adding Products)' : 'Payment Status'}
                </label>
                <div className="flex flex-wrap gap-4 sm:gap-6">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="paymentStatus"
                      value="pending"
                      checked={paymentStatus === 'pending'}
                      onChange={() => setPaymentStatus('pending')}
                      className="sr-only peer"
                    />
                    <div className="w-10 sm:w-11 h-5 sm:h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 sm:after:h-5 after:w-4 sm:after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                    <span className={`ml-2 sm:ml-3 text-sm sm:text-base ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Pending</span>
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="paymentStatus"
                      value="cleared"
                      checked={paymentStatus === 'cleared'}
                      onChange={() => setPaymentStatus('cleared')}
                      className="sr-only peer"
                    />
                    <div className="w-10 sm:w-11 h-5 sm:h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 sm:after:h-5 after:w-4 sm:after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                    <span className={`ml-2 sm:ml-3 text-sm sm:text-base ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Cleared</span>
                  </label>
                </div>
              </div>

              <div className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'} rounded-xl p-4 shadow-sm border`}>
                <label className={`block ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-medium mb-3 text-sm sm:text-base`}>
                  {billMode === 'existing' ? 'Order Status (Updated After Adding Products)' : 'Order Status'}
                </label>
                <div className="flex flex-wrap gap-4 sm:gap-6">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="orderStatus"
                      value="sell"
                      checked={orderStatus === 'sell'}
                      onChange={() => setOrderStatus('sell')}
                      className="sr-only peer"
                    />
                    <div className="w-10 sm:w-11 h-5 sm:h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 sm:after:h-5 after:w-4 sm:after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    <span className={`ml-2 sm:ml-3 text-sm sm:text-base ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Sell</span>
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="orderStatus"
                      value="purchased"
                      checked={orderStatus === 'purchased'}
                      onChange={() => setOrderStatus('purchased')}
                      className="sr-only peer"
                    />
                    <div className="w-10 sm:w-11 h-5 sm:h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 sm:after:h-5 after:w-4 sm:after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                    <span className={`ml-2 sm:ml-3 text-sm sm:text-base ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Purchased</span>
                  </label>
                </div>
              </div>

              {/* Only show Amount Paid input when in full bill mode or when updating an existing order */}
              {(billMode === 'full' || billMode === 'half' || (billMode === 'existing' && currentOrderId)) && !isEditMode && (
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    id="amountPaid"
                    className={`block w-full px-4 py-4 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white focus:ring-indigo-400 focus:border-indigo-400 placeholder-gray-400' : 'border-gray-300 bg-white text-gray-800 focus:ring-indigo-500 focus:border-indigo-500'} rounded-xl transition-all duration-200 peer placeholder-transparent text-base`}
                    value={amountPaid}
                    onChange={handleAmountPaidChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    ref={amountPaidRef}
                    onKeyDown={(e) => {
                      // Prevent "-" and "_" characters
                      if (e.key === "-" || e.key === "_") {
                        e.preventDefault();
                      }
                      handleKeyPress(e, null, 'amountPaid');
                    }}
                    title="Please enter a positive number"
                  />
                  <label
                    htmlFor="amountPaid"
                    className={`absolute text-sm ${darkMode ? 'text-gray-400 bg-gray-700 peer-focus:text-indigo-400' : 'text-gray-500 bg-white peer-focus:text-indigo-600'} duration-300 transform -translate-y-3 scale-85 top-3 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-85 peer-focus:-translate-y-3 px-1`}
                  >
                    {billMode === 'existing' ? 'Additional Amount Paid' : 'Amount Paid'}
                  </label>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  className="flex items-center justify-center p-3.5 min-h-[50px] bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all duration-300 shadow-md text-base"
                  onClick={addProduct}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add Product
                </button>

                <button
                  className={`flex cursor-pointer items-center justify-center p-3.5 min-h-[50px] ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'} text-white rounded-xl transition-all duration-300 shadow-md text-base`}
                  onClick={saveOrder}
                  disabled={products.every(p => p.total === 0) || isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Save Order
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Actions and total section with glass morphism effect */}
          <div className="mt-6 items-center">
            <div className={`${darkMode ? 'bg-gradient-to-r from-indigo-700 to-purple-700 border-indigo-600' : 'bg-gradient-to-r from-indigo-500 to-purple-500 border-indigo-200'} p-4 sm:p-6 rounded-xl border shadow-lg relative overflow-hidden`}>
              <div className={`absolute top-0 left-0 w-full h-full ${darkMode ? 'bg-gray-800 opacity-80' : 'bg-white opacity-90'} backdrop-blur-sm`}></div>
              <div className="relative">
                <div className={`text-lg sm:text-xl md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'} text-center mb-3`}>
                  {clientName ? `${clientName}'s Order` : 'Order Summary'}
                </div>

                {clientName && (
                  <div className={`mb-4 p-3 ${darkMode ? 'bg-gray-700 bg-opacity-80' : 'bg-white bg-opacity-80'} backdrop-blur-sm rounded-lg`}>
                    <div className="grid grid-cols-1 gap-2">
                      {clientAddress && (
                        <div className="flex items-start sm:items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'} mr-2 mt-1 sm:mt-0 flex-shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{clientAddress}</span>
                        </div>
                      )}
                      {clientPhone && (
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'} mr-2 flex-shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{clientPhone}</span>
                        </div>
                      )}
                      {clientGst && (
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'} mr-2 flex-shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>GST: {clientGst}</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'} mr-2 flex-shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Status: <span className={`font-medium ${orderStatus === 'sell' ? 'text-blue-400' : 'text-purple-400'}`}>
                            {orderStatus === 'sell' ? 'Sell' : 'Purchased'}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className={`flex justify-between items-center mt-4 p-3 ${darkMode ? 'bg-gray-700 bg-opacity-80' : 'bg-white bg-opacity-80'} backdrop-blur-sm rounded-lg`}>
                  <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Grand Total:</span>
                  <span className={`font-bold text-lg sm:text-xl ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>₹ {grandTotal.toFixed(2)}</span>
                </div>

                {(billMode === 'full' || billMode === 'half') && amountPaid && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className={`p-3 ${darkMode ? 'bg-gray-700 bg-opacity-80' : 'bg-white bg-opacity-80'} backdrop-blur-sm rounded-lg`}>
                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-xs sm:text-sm`}>Amount Paid</span>
                      <div className={`font-bold text-sm sm:text-base ${darkMode ? 'text-green-400' : 'text-green-600'}`}>₹ {parseFloat(amountPaid).toFixed(2)}</div>
                    </div>
                    <div className={`p-3 ${darkMode ? 'bg-gray-700 bg-opacity-80' : 'bg-white bg-opacity-80'} backdrop-blur-sm rounded-lg`}>
                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-xs sm:text-sm`}>Balance</span>
                      <div className={`font-bold text-sm sm:text-base ${(grandTotal - parseFloat(amountPaid || 0)) <= 0
                        ? (darkMode ? 'text-green-400' : 'text-green-600')
                        : (darkMode ? 'text-red-400' : 'text-red-600')}`}>
                        ₹ {(grandTotal - parseFloat(amountPaid || 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}

                {billMode === 'full' || billMode === 'half' ? (
                  <div className="mt-3 text-center">
                    <div className="flex flex-wrap justify-center gap-2">
                      <span className={`inline-block px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm ${paymentStatus === 'pending'
                        ? (darkMode ? 'bg-yellow-800 text-yellow-200 border border-yellow-700' : 'bg-yellow-100 text-yellow-800 border border-yellow-200')
                        : (darkMode ? 'bg-green-800 text-green-200 border border-green-700' : 'bg-green-100 text-green-800 border border-green-200')
                        } border`}>
                        {paymentStatus === 'pending' ? '⏳ Payment Pending' : '✓ Payment Cleared'}
                      </span>

                      <span className={`inline-block px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm ${orderStatus === 'sell'
                        ? (darkMode ? 'bg-blue-800 text-blue-200 border border-blue-700' : 'bg-blue-100 text-blue-800 border border-blue-200')
                        : (darkMode ? 'bg-purple-800 text-purple-200 border border-purple-700' : 'bg-purple-100 text-purple-800 border border-purple-200')
                        } border`}>
                        {orderStatus === 'sell' ? '📤 Sell' : '📥 Purchased'}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Status message with animation */}
          {saveStatus && (
            <div className={`mt-6 p-4 ${saveStatus.includes('Error')
              ? (darkMode ? 'bg-red-900 text-red-200 border-red-800' : 'bg-red-100 text-red-800 border-red-200')
              : (darkMode ? 'bg-green-900 text-green-200 border-green-800' : 'bg-green-100 text-green-800 border-green-200')
              } rounded-xl text-center animate-pulse border shadow-md`}>
              {saveStatus.includes('Error') ? (
                <div className="flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {saveStatus}
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {saveStatus}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className={`mt-10 pt-4 border-t ${darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'} text-center text-sm`}>
            <p>Siyaram Lace © {new Date().getFullYear()} | Billing System</p>
          </div>
        </div>
      </div>

      {/* Success Modal Popup */}
      {showSuccessModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"></div>
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 relative z-10 transform transition-all duration-300 scale-100 opacity-100`} style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <style>
              {`
                @keyframes fadeIn {
                  from { opacity: 0; transform: scale(0.95); }
                  to { opacity: 1; transform: scale(1); }
                }
                @keyframes confetti {
                  0% { transform: translateY(0) rotate(0); opacity: 1; }
                  100% { transform: translateY(300px) rotate(720deg); opacity: 0; }
                }
                .confetti-container {
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  overflow: hidden;
                  z-index: 0;
                }
                .confetti-piece {
                  position: absolute;
                  width: 10px;
                  height: 10px;
                  background: #ffd700;
                  top: 0;
                  opacity: 1;
                  border-radius: 2px;
                }
                .confetti-piece:nth-child(1) {
                  left: 10%;
                  animation: confetti 3s ease-in infinite;
                  animation-delay: 0.1s;
                  background: #ff4136;
                }
                .confetti-piece:nth-child(2) {
                  left: 20%;
                  animation: confetti 2.5s ease-in infinite;
                  animation-delay: 0.3s;
                  background: #0074d9;
                }
                .confetti-piece:nth-child(3) {
                  left: 30%;
                  animation: confetti 2.8s ease-in infinite;
                  animation-delay: 0.5s;
                  background: #01ff70;
                }
                .confetti-piece:nth-child(4) {
                  left: 40%;
                  animation: confetti 2.3s ease-in infinite;
                  animation-delay: 0.7s;
                  background: #ffdc00;
                }
                .confetti-piece:nth-child(5) {
                  left: 50%;
                  animation: confetti 2.7s ease-in infinite;
                  animation-delay: 0.9s;
                  background: #ff851b;
                }
                .confetti-piece:nth-child(6) {
                  left: 60%;
                  animation: confetti 3s ease-in infinite;
                  animation-delay: 1.1s;
                  background: #b10dc9;
                }
                .confetti-piece:nth-child(7) {
                  left: 70%;
                  animation: confetti 2.6s ease-in infinite;
                  animation-delay: 1.3s;
                  background: #39cccc;
                }
                .confetti-piece:nth-child(8) {
                  left: 80%;
                  animation: confetti 2.2s ease-in infinite;
                  animation-delay: 1.5s;
                  background: #3d9970;
                }
                .confetti-piece:nth-child(9) {
                  left: 90%;
                  animation: confetti 2.9s ease-in infinite;
                  animation-delay: 1.7s;
                  background: #f012be;
                }
                `}
            </style>
            <div className="confetti-container">
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
            </div>
            <div className="text-center relative z-10">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className={`text-xl font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                {billMode === 'existing'
                  ? 'Products Added to Order Successfully!'
                  : isEditMode
                    ? 'Order Updated Successfully!'
                    : 'Order Saved Successfully!'}
              </h3>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-500'} mb-5`}>
                {billMode === 'existing'
                  ? 'New products have been added to the existing order and all totals have been recalculated. Redirecting to clients page...'
                  : isEditMode
                    ? 'Your order has been updated with new products and is now available in the client list. Redirecting to clients page...'
                    : 'Your order has been saved and is now available in the client list. Redirecting to clients page...'}
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                  }}
                  className="flex-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:text-sm transition-colors duration-200"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    navigate('/clients');
                  }}
                  className="flex-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm transition-colors duration-200"
                >
                  Go to Clients
                </button>
                {isEditMode && (
                  <button
                    onClick={() => navigate(`/order/${currentOrderId}`)}
                    className="flex-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm transition-colors duration-200"
                  >
                    View Order
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal Popup */}
      {showErrorModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"></div>
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 relative z-10 transform transition-all duration-300 scale-100`}>
            <div className="text-center relative z-10">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className={`text-xl font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Validation Error</h3>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-500'} mb-5`}>{errorMessage}</p>
              <button
                onClick={() => setShowErrorModal(false)}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm transition-colors duration-200"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddProducts;