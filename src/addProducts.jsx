import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
  import { createClient } from './firebase/clientsFirebase';

const AddProducts = () => {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState('');
  const [products, setProducts] = useState([
    { id: 1, name: '', count: '', price: '', total: 0 }
  ]);
  const [saveStatus, setSaveStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [amountPaid, setAmountPaid] = useState('');
  const [billMode, setBillMode] = useState('full');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Create refs for input fields
  const clientNameRef = useRef(null);
  const amountPaidRef = useRef(null);
  const productRefs = useRef({});

  // Initialize product refs
  useEffect(() => {
    productRefs.current = {};
  }, []);

  // Handle key press events to navigate between input fields
  const handleKeyPress = (e, id, field, isLast = false) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      // Client name field handling
      if (field === 'clientName') {
        if (billMode === 'full') {
          amountPaidRef.current?.focus();
        } else {
          // If in half bill mode, focus on first product quantity field
          const firstProductId = products[0]?.id;
          productRefs.current[`${firstProductId}_count`]?.focus();
        }
        return;
      }

      // Amount paid field handling
      if (field === 'amountPaid') {
        const firstProductId = products[0]?.id;
        productRefs.current[`${firstProductId}_${billMode === 'full' ? 'name' : 'count'}`]?.focus();
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
    const updatedProducts = products.map(product => {
      if (product.id === id) {
        const updatedProduct = { ...product, [field]: value };

        // Recalculate total when count or price changes
        if (field === 'count' || field === 'price') {
          const count = updatedProduct.count === '' ? 0 : parseFloat(updatedProduct.count);
          const price = updatedProduct.price === '' ? 0 : parseFloat(updatedProduct.price);
          updatedProduct.total = count * price;
        }

        return updatedProduct;
      }
      return product;
    });

    setProducts(updatedProducts);
  };

  const addProduct = () => {
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    setProducts([...products, { id: newId, name: '', count: '', price: '', total: 0 }]);
  };

  const removeProduct = (id) => {
    if (products.length > 1) {
      setProducts(products.filter(product => product.id !== id));
    }
  };

  const saveOrder = async () => {
    // Create order data object
    const orderData = {
      clientName,
      products,
      grandTotal,
      // Always include payment information regardless of bill mode
      paymentStatus: billMode === 'half' ? 'pending' : paymentStatus,
      amountPaid: billMode === 'half' ? 0 : (amountPaid === '' ? 0 : parseFloat(amountPaid)),
      timestamp: new Date().getTime(),
      billMode
    };

    // Show loading status
    setSaveStatus('Saving order...');
    setIsLoading(true);

    try {
      // Save to Firebase instead of mockAPI
      await createClient(orderData);

      // Show success message and popup
      setSaveStatus('Order saved successfully!');
      setShowSuccessModal(true);

      // Clear status message after 3 seconds
      setTimeout(() => {
        setSaveStatus('');
        setIsLoading(false);
        // Navigate to the client list page
        // navigate('/clients');
      }, 3000);

      // Auto-hide the success modal after 3 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
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

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('isLoggedIn');

    // Redirect to login page
    navigate('/login');
  };

  const grandTotal = products.reduce((sum, product) => sum + product.total, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50">
      <div className="max-w-5xl mx-auto bg-white shadow-xl overflow-hidden transition-all duration-300">
        {/* Header with glass morphism effect */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 px-6 py-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-white opacity-10 backdrop-blur-xl"></div>
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gradient-to-br from-white to-transparent opacity-10"></div>
          <div className="absolute -left-10 -bottom-16 w-40 h-40 rounded-full bg-indigo-300 opacity-10"></div>

          <div className="relative flex flex-col sm:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 100-12 6 6 0 000 12zm.75-6a.75.75 0 000-1.5h-1.5a.75.75 0 000 1.5h1.5z" clipRule="evenodd" />
              </svg>
              Siyaram Lace
            </h1>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/clients')}
                className="flex items-center px-4 py-2.5 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-all duration-300 text-sm font-medium backdrop-blur-sm shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
                View Clients
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2.5 bg-red-500 bg-opacity-90 text-white rounded-lg hover:bg-opacity-100 transition-all duration-300 text-sm font-medium shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7z" clipRule="evenodd" />
                  <path d="M4 9h8v2H4V9z" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {/* Client name input with floating label */}
          <div className="mb-6 relative">
            <div className="relative">
              <input
                type="text"
                id="clientName"
                className="block w-full px-4 py-4 border border-gray-300 rounded-xl text-gray-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 peer placeholder-transparent"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client Name"
                ref={clientNameRef}
                onKeyDown={(e) => handleKeyPress(e, null, 'clientName')}
              />
              <label
                htmlFor="clientName"
                className="absolute text-sm text-gray-500 duration-300 transform -translate-y-3 scale-85 top-3 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-85 peer-focus:-translate-y-3 peer-focus:text-indigo-600 bg-white px-1"
              >
                Client Name
              </label>
            </div>
          </div>

          {/* Bill Mode Toggle */}
          <div className="mb-6">
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setBillMode('full')}
                className={`px-6 py-3 rounded-xl transition-all duration-300 ${billMode === 'full'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Full Bill
              </button>
              <button
                onClick={() => setBillMode('half')}
                className={`px-6 py-3 rounded-xl transition-all duration-300 ${billMode === 'half'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Half Bill
              </button>
            </div>
          </div>

          {/* Payment status and amount section with improved design */}
          {billMode === 'full' && (
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-xl p-4 shadow-sm border border-gray-100">
                <label className="block text-gray-700 font-medium mb-3 text-sm">Payment Status</label>
                <div className="flex gap-6">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="paymentStatus"
                      value="pending"
                      checked={paymentStatus === 'pending'}
                      onChange={() => setPaymentStatus('pending')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                    <span className="ml-3 text-gray-700">Pending</span>
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
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                    <span className="ml-3 text-gray-700">Cleared</span>
                  </label>
                </div>
              </div>

              <div className="relative">
                <input
                  type="number"
                  id="amountPaid"
                  className="block w-full px-4 py-4 border border-gray-300 rounded-xl text-gray-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 peer placeholder-transparent"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  ref={amountPaidRef}
                  onKeyDown={(e) => handleKeyPress(e, null, 'amountPaid')}
                />
                <label
                  htmlFor="amountPaid"
                  className="absolute text-sm text-gray-500 duration-300 transform -translate-y-3 scale-85 top-3 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-85 peer-focus:-translate-y-3 peer-focus:text-indigo-600 bg-white px-1"
                >
                  Amount Paid
                </label>
              </div>
            </div>
          )}

          {/* Products section with improved card design */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-lg mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Product Details</h2>
            </div>

            {/* Table header - Only visible on larger screens */}
            <div className="hidden md:grid md:grid-cols-12 md:gap-4 font-semibold text-gray-700 border-b p-4 bg-gray-50">
              {billMode === 'full' && <div className="col-span-3">Product Name</div>}
              <div className={billMode === 'full' ? "col-span-2" : "col-span-4"}>Quantity</div>
              <div className={billMode === 'full' ? "col-span-2" : "col-span-4"}>Price</div>
              <div className={billMode === 'full' ? "col-span-3" : "col-span-2"}>Total</div>
              <div className="col-span-2">Action</div>
            </div>

            <div className="divide-y divide-gray-100">
              {products.map(product => (
                <div key={product.id} className="p-4 md:grid md:grid-cols-12 md:gap-4 md:items-center transition-all duration-200 hover:bg-gray-50">
                  {/* Mobile layout - stacked fields with labels */}
                  <div className="md:hidden mb-3">
                    {billMode === 'full' && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                        <input
                          type="text"
                          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                        <input
                          type="number"
                          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                          value={product.count}
                          onChange={(e) => handleChange(product.id, 'count', e.target.value)}
                          min="0"
                          ref={(el) => (productRefs.current[`${product.id}_count`] = el)}
                          onKeyDown={(e) => handleKeyPress(e, product.id, 'count')}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                        <input
                          type="number"
                          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                          value={product.price}
                          onChange={(e) => handleChange(product.id, 'price', e.target.value)}
                          min="0"
                          step="0.01"
                          ref={(el) => (productRefs.current[`${product.id}_price`] = el)}
                          onKeyDown={(e) => handleKeyPress(e, product.id, 'price', product.id === products[products.length - 1].id)}
                        />
                      </div>
                    </div>
                    <div className="mb-3 flex justify-between items-center">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                        <div className="p-3 bg-indigo-50 text-indigo-800 rounded-xl font-medium border border-indigo-100">
                          ₹ {product.total.toFixed(2)}
                        </div>
                      </div>
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

                  {/* Desktop layout - grid layout */}
                  {billMode === 'full' && (
                    <div className="hidden md:block md:col-span-3">
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
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
                      type="number"
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                      value={product.count}
                      onChange={(e) => handleChange(product.id, 'count', e.target.value)}
                      min="0"
                      ref={(el) => (productRefs.current[`${product.id}_count`] = el)}
                      onKeyDown={(e) => handleKeyPress(e, product.id, 'count')}
                    />
                  </div>
                  <div className={`hidden md:block ${billMode === 'full' ? "md:col-span-2" : "md:col-span-4"}`}>
                    <input
                      type="number"
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                      value={product.price}
                      onChange={(e) => handleChange(product.id, 'price', e.target.value)}
                      min="0"
                      step="0.01"
                      ref={(el) => (productRefs.current[`${product.id}_price`] = el)}
                      onKeyDown={(e) => handleKeyPress(e, product.id, 'price', product.id === products[products.length - 1].id)}
                    />
                  </div>
                  <div className={`hidden md:block font-medium ${billMode === 'full' ? "md:col-span-3" : "md:col-span-2"}`}>
                    <div className="p-3 bg-indigo-50 text-indigo-800 rounded-xl border border-indigo-100">
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
          </div>

          {/* Actions and total section with glass morphism effect */}
          <div className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className="flex items-center justify-center p-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all duration-300 shadow-md"
                onClick={addProduct}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Product
              </button>

              <button
                className={`flex items-center justify-center p-3.5 ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'} text-white rounded-xl transition-all duration-300 shadow-md`}
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

            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6 rounded-xl border border-indigo-200 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-white opacity-90 backdrop-blur-sm"></div>
              <div className="relative">
                <div className="text-xl md:text-2xl font-bold text-gray-800 text-center">
                  {clientName ? `${clientName}'s Order` : 'Order Summary'}
                </div>
                <div className="flex justify-between items-center mt-4 p-3 bg-white bg-opacity-80 backdrop-blur-sm rounded-lg">
                  <span className="font-medium text-gray-700">Grand Total:</span>
                  <span className="font-bold text-xl text-indigo-700">₹ {grandTotal.toFixed(2)}</span>
                </div>

                {billMode === 'full' && amountPaid && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white bg-opacity-80 backdrop-blur-sm rounded-lg">
                      <span className="text-gray-600 text-sm">Amount Paid</span>
                      <div className="font-bold text-green-600">₹ {parseFloat(amountPaid).toFixed(2)}</div>
                    </div>
                    <div className="p-3 bg-white bg-opacity-80 backdrop-blur-sm rounded-lg">
                      <span className="text-gray-600 text-sm">Balance</span>
                      <div className={`font-bold ${(grandTotal - parseFloat(amountPaid || 0)) <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₹ {(grandTotal - parseFloat(amountPaid || 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}

                {billMode === 'full' && (
                  <div className="mt-3 text-center">
                    <span className={`inline-block px-4 py-2 rounded-full ${paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>
                      {paymentStatus === 'pending' ? '⏳ Payment Pending' : '✓ Payment Cleared'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status message with animation */}
          {saveStatus && (
            <div className={`mt-6 p-4 ${saveStatus.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'} rounded-xl text-center animate-pulse border ${saveStatus.includes('Error') ? 'border-red-200' : 'border-green-200'} shadow-md`}>
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
          <div className="mt-10 pt-4 border-t border-gray-200 text-center text-gray-500 text-sm">
            <p>Siyaram Lace © {new Date().getFullYear()} | Billing System</p>
          </div>
        </div>
      </div>

      {/* Success Modal Popup */}
      {showSuccessModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"></div>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 relative z-10 transform transition-all duration-300 scale-100 opacity-100" style={{ animation: 'fadeIn 0.3s ease-out' }}>
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
              <h3 className="text-xl font-medium text-gray-900 mb-2">Order Saved Successfully!</h3>
              <p className="text-gray-500 mb-5">Your order has been saved and is now available in the client list.</p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:text-sm transition-colors duration-200"
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