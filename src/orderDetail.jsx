import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePDF } from 'react-to-pdf';
import { ref, get } from 'firebase/database';
import { database } from './firebase/config';

const OrderDetail = () => {
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('darkMode') === 'true' || 
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const { id } = useParams();
  const navigate = useNavigate();
  const pdfRef = useRef(null);
  
  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  // Apply dark mode on initial load
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  // Enhanced PDF options for better responsiveness
  const { toPDF, targetRef } = usePDF({
    filename: orderData ? `${orderData.clientName}.pdf` : `invoice-${id}.pdf`,
    page: { 
      margin: 15,
      format: 'a4',
      orientation: 'portrait'
    },
    canvas: {
      // Improve quality for mobile devices
      scale: 2,
      useCORS: true,
    },
    // Customize PDF styling
    overrides: {
      // Apply custom styles for PDF output
      pdf: {
        compress: true
      },
      canvas: {
        useCORS: true
      }
    }
  });

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      console.log("Fetching order details for ID:", id);
      
      // Use Firebase Realtime Database reference
      const orderRef = ref(database, `clients/${id}`);
      const snapshot = await get(orderRef);
      
      if (!snapshot.exists()) {
        console.log("Order not found in database");
        throw new Error('Order not found');
      }

      const data = {
        id: snapshot.key,
        ...snapshot.val()
      };
      
      console.log("Order data received:", data);
      setOrderData(data);
      setError('');
    } catch (err) {
      console.error("Error fetching order:", err);
      setError(`Error loading order details: ${err.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Enhanced PDF download handler with loading state
  const handleDownloadPdf = async () => {
    try {
      setIsPdfGenerating(true);
      
      // Apply mobile-friendly styles before generating PDF
      const style = document.createElement('style');
      style.id = 'temp-pdf-styles';
      style.innerHTML = `
        @media print {
          body { margin: 0; padding: 0; }
          .print-hidden { display: none !important; }
          table { page-break-inside: avoid; }
          .print-break-inside-avoid { page-break-inside: avoid; }
        }
      `;
      document.head.appendChild(style);
      
      // Generate PDF with delay to ensure styles are applied
      await toPDF();
      
      // Clean up temporary styles
      const tempStyle = document.getElementById('temp-pdf-styles');
      if (tempStyle) tempStyle.remove();
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  // Add media queries for print/PDF
  useEffect(() => {
    // Add print-specific styles when component mounts
    const style = document.createElement('style');
    style.id = 'pdf-print-styles';
    style.innerHTML = `
      @media print {
        body { margin: 0; padding: 0; }
        .print-hidden { display: none !important; }
        .print-break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
        .print-full-width { width: 100% !important; }
        table { page-break-inside: avoid; }
        @page { size: portrait; margin: 10mm; }
      }
    `;
    document.head.appendChild(style);
    
    // Cleanup when component unmounts
    return () => {
      const styleElement = document.getElementById('pdf-print-styles');
      if (styleElement) styleElement.remove();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="relative px-5 py-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-auto border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-10 w-10 text-indigo-600 dark:text-indigo-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Loading Invoice</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm text-center">Please wait while we fetch your invoice details</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 sm:px-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-xl rounded-xl overflow-hidden border border-red-50 dark:border-red-900">
          <div className="bg-red-50 dark:bg-red-900/30 px-4 sm:px-6 py-6 border-b border-red-100 dark:border-red-800">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 dark:bg-red-800/50 p-3 rounded-full">
                <svg className="h-8 w-8 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <h2 className="text-center text-xl font-bold text-gray-900 dark:text-white">{error || 'Invoice not found'}</h2>
            <p className="mt-2 text-center text-gray-500 dark:text-gray-400 text-sm">We couldn't retrieve the requested invoice information.</p>
          </div>
          <div className="px-4 sm:px-6 py-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/clients')}
                className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <svg className="mr-2 -ml-1 h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to List
              </button>
              <button
                onClick={fetchOrder}
                className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
              >
                <svg className="mr-2 -ml-1 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // Calculate payment status details
  const balanceDue = (typeof orderData.grandTotal === 'number' ? orderData.grandTotal : 0) - 
                    (typeof orderData.amountPaid === 'number' ? orderData.amountPaid : 0);
  const isPaid = balanceDue <= 0 || orderData.paymentStatus === 'cleared';

  return (
    <div className="min-h-screen bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-4 sm:py-6 md:py-8 px-2 sm:px-4 md:px-6 print:py-0 print:px-0">
      <div className="max-w-5xl mx-auto bg-white dark:bg-gray-800 shadow-xl rounded-xl overflow-hidden print:shadow-none border border-gray-100 dark:border-gray-700">
        {/* Header with Company Info and Invoice Label */}
        <div className="px-4 sm:px-6 md:px-8 py-4 md:py-6 bg-gradient-to-r from-indigo-500 to-purple-600 border-b print:hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
            <Link to="/clients" className="text-white hover:text-indigo-100 flex items-center transition-colors text-sm sm:text-base">
              <svg className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-medium">Back to Orders</span>
            </Link>
            <div className="flex space-x-2 sm:space-x-3 w-full sm:w-auto justify-end">
              <button
                onClick={toggleDarkMode}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white/20 text-white backdrop-blur-sm border border-white/30 rounded-lg hover:bg-white/30 flex items-center text-xs sm:text-sm font-medium transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
                <span className="hidden sm:inline ml-1">{darkMode ? 'Light' : 'Dark'}</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white/20 text-white backdrop-blur-sm border border-white/30 rounded-lg hover:bg-white/30 flex items-center text-xs sm:text-sm font-medium transition-colors"
                aria-label="Print invoice"
              >
                <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span className="hidden sm:inline">Print</span>
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isPdfGenerating}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 bg-white text-indigo-600 border border-white rounded-lg flex items-center text-xs sm:text-sm font-medium transition-colors ${
                  isPdfGenerating ? 'opacity-70 cursor-not-allowed' : 'hover:bg-indigo-50'
                }`}
                aria-label="Download PDF"
              >
                {isPdfGenerating ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="hidden sm:inline">Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span className="hidden sm:inline">Download PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Invoice Content */}
        <div ref={targetRef} className="px-4 sm:px-6 md:px-8 py-6 sm:py-8 print:p-4">
          {/* Company Logo and Invoice Title */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-4 border-b dark:border-gray-700 print-break-inside-avoid">
            <div className="flex items-start sm:items-center sm:flex-row mb-4 md:mb-0 w-full md:w-auto justify-between">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-2.5 rounded-lg mr-3 shadow-md flex-shrink-0 mb-3 sm:mb-0 print:bg-indigo-500">
                <svg className="h-6 w-6 sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white text-left">Siyaram Lace</h1>
                <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1 text-left">jay industrial estate, IND 79, Anjana, 1, Anjana, Gujarat 395003</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1 text-left">Contact Number: 9825000000</p>
              </div>
            </div>
            <div className="print:hidden flex flex-row justify-center items-center">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Order Number: {id}</h2>
            </div>
          </div>

          {/* INVOICE STAMP - Responsive positioning */}
          <div className="hidden sm:block absolute top-4 right-4 print:top-8 print:right-8">
            <div className={`rounded-full w-20 h-20 flex items-center justify-center border-2 rotate-12 ${isPaid ? 'border-green-500 dark:border-green-400' : 'border-orange-500 dark:border-orange-400'} opacity-90 print:opacity-100`}>
              <span className={`text-sm font-bold uppercase ${isPaid ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {isPaid ? 'PAID' : 'PENDING'}
              </span>
            </div>
          </div>

          {/* Mobile View PAID/PENDING Badge */}
          <div className="sm:hidden flex justify-center -mt-4 mb-4">
            <div className={`rounded-full px-4 py-1 ${
              isPaid 
                ? 'bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700' 
                : 'bg-orange-100 dark:bg-orange-800/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-700'
            }`}>
              <span className="text-xs font-bold uppercase">
                {isPaid ? 'PAID' : 'PENDING'}
              </span>
            </div>
          </div>

          {/* Invoice Number and Date Header */}
          <div className="w-full mb-6 bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-lg p-4 print:bg-gray-100">
            <div className="flex flex-wrap justify-between items-center">
              <div>
                <span className="block text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Invoice</span>
                <span className="block text-lg font-bold text-gray-900 dark:text-white">#{id}</span>
              </div>
              <div className="text-right">
                <span className="block text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Date Issued</span>
                <span className="block text-sm font-medium text-gray-900 dark:text-gray-200">
                  {new Date(orderData.timestamp).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'Asia/Kolkata',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Bill To & Invoice Info */}
          <div className="flex flex-col md:flex-row justify-between mb-8 gap-6 print-break-inside-avoid">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 sm:p-6 border border-gray-100 dark:border-gray-600 md:w-1/2 print:bg-white print:border print-full-width">
              <h3 className="text-gray-500 dark:text-gray-400 font-medium mb-3 text-xs sm:text-sm uppercase tracking-wider">Client Information</h3>
              <div className="space-y-2">
                <div className="flex flex-col">
                  <span className="text-gray-500 dark:text-gray-400 text-xs uppercase mb-1">Bill To:</span>
                  <span className="text-gray-900 dark:text-white font-semibold text-sm sm:text-base">{orderData.clientName || 'N/A'}</span>
                  
                  {orderData.clientAddress && (
                    <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm mt-1 leading-tight">{orderData.clientAddress}</span>
                  )}
                  
                  {orderData.clientPhone && (
                    <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm mt-1">
                      <span className="inline-block mr-1">
                        <svg className="h-3 w-3 inline-block -mt-0.5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </span>
                      {orderData.clientPhone}
                    </span>
                  )}
                </div>
                
                {orderData.clientGst && (
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-3">
                    <span className="text-gray-500 dark:text-gray-400 font-medium text-xs sm:text-sm">GST No:</span>
                    <span className="text-gray-800 dark:text-gray-200 font-semibold text-xs sm:text-sm ml-2">{orderData.clientGst}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 sm:p-6 border border-gray-100 dark:border-gray-600 md:w-1/2 print:bg-white print:border print-full-width">
              <h3 className="text-gray-500 dark:text-gray-400 font-medium mb-3 text-xs sm:text-sm uppercase tracking-wider">Payment Details</h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                <div className="text-gray-500 dark:text-gray-400 font-medium text-left">Invoice Date:</div>
                <div className="text-gray-800 dark:text-gray-200 font-semibold text-right">
                  {new Date(orderData.timestamp).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'Asia/Kolkata',
                  })}
                </div>

                <div className="text-gray-500 dark:text-gray-400 font-medium text-left">Due Date:</div>
                <div className="text-gray-800 dark:text-gray-200 font-semibold text-right">
                  {new Date(orderData.timestamp).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'Asia/Kolkata',
                  })}
                </div>

                <div className="text-gray-500 dark:text-gray-400 font-medium text-left">Status:</div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isPaid ? 'text-green-800 dark:text-green-400' : 'text-amber-800 dark:text-amber-400'
                      } ${isPaid ? 'print:text-green-800' : 'print:text-amber-800'}`}
                  >
                    {isPaid ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Items Table */}
          <div className="mb-8 overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm print-break-inside-avoid">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                  <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider print:bg-gray-100">#</th>
                  <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider print:bg-gray-100">Item</th>
                  <th scope="col" className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider print:bg-gray-100">Qty</th>
                  <th scope="col" className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider print:bg-gray-100">Price</th>
                  <th scope="col" className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider print:bg-gray-100">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {orderData.products?.map((product, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700' : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'}>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-gray-500 dark:text-gray-400">{index + 1}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{product.name || 'Product Item'}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-right">{product.count}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-right">₹{typeof product.price === 'number' ? product.price.toFixed(2) : parseFloat(product.price || 0).toFixed(2)}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white font-medium text-right">₹{(typeof product.price === 'number' && typeof product.count === 'number' ? 
                      (product.price * product.count).toFixed(2) : 
                      (parseFloat(product.price || 0) * parseFloat(product.count || 0)).toFixed(2))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Invoice Summary - Full Width */}
          <div className="mb-8 print-break-inside-avoid">
            <div className="w-full grid grid-cols-1 lg:grid-cols-5 gap-4">
              
              {/* Payment Totals - Right Side */}
              <div className="lg:col-span-12">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 sm:p-6 border border-gray-100 dark:border-gray-600 shadow-sm print:bg-white print:border">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 pb-2">
                      <span>Subtotal</span>
                      <span className="font-medium">₹{typeof orderData.grandTotal === 'number' ? orderData.grandTotal.toFixed(2) : '0.00'}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 pb-2 border-b border-gray-200 dark:border-gray-600">
                      <span>Tax</span>
                      <span className="font-medium">₹0.00</span>
                    </div>
                    
                    <div className="flex justify-between text-sm font-semibold text-gray-800 dark:text-gray-200 pt-2">
                      <span>Total</span>
                      <span className="text-lg">₹{typeof orderData.grandTotal === 'number' ? orderData.grandTotal.toFixed(2) : '0.00'}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 pt-2 pb-2 border-b border-gray-200 dark:border-gray-600">
                      <span>Amount Paid</span>
                      <span className="font-medium text-green-600 dark:text-green-400">₹{(typeof orderData.amountPaid === 'number' ? orderData.amountPaid.toFixed(2) : '0.00')}</span>
                    </div>
                    
                    <div className="flex justify-between text-base font-bold pt-2">
                      <span className={isPaid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>Balance Due</span>
                      <span className={isPaid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>₹{Math.max(0, balanceDue).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Payment History Section */}
          {orderData.paymentHistory && orderData.paymentHistory.length > 0 && (
            <div className="mb-8 print-break-inside-avoid">
              <h3 className="text-gray-700 dark:text-gray-300 font-semibold mb-3 text-sm sm:text-base border-b dark:border-gray-700 pb-2">Payment History</h3>
              <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                      <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider print:bg-gray-100">#</th>
                      <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider print:bg-gray-100">Date</th>
                      <th scope="col" className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider print:bg-gray-100">Amount</th>
                      <th scope="col" className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider print:bg-gray-100">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {orderData.paymentHistory.map((payment, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700' : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'}>
                        <td className="px-3 sm:px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400">{index + 1}</td>
                        <td className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {new Date(payment.date).toLocaleString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Asia/Kolkata'
                          })}
                        </td>
                        <td className="px-3 sm:px-6 py-3 whitespace-nowrap text-xs sm:text-sm font-medium text-green-600 dark:text-green-400 text-right">
                          ₹{parseFloat(payment.amount).toFixed(2)}
                        </td>
                        <td className="px-3 sm:px-6 py-3 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200">
                            Received
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Thank you note */}
          <div className="text-center my-6 print-break-inside-avoid border-t border-gray-100 dark:border-gray-700 pt-6">
            <div className="flex items-center justify-center mb-2">
              <svg className="h-5 w-5 text-indigo-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Thank you for your business!</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">If you have any questions about this invoice, please contact us.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail; 