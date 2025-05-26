import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePDF } from 'react-to-pdf';
import { ref, get, update } from 'firebase/database';
import { database } from './firebase/config';
import { BsCurrencyRupee } from 'react-icons/bs';

const OrderDetail = () => {
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [dueDate, setDueDate] = useState(null);
  const [invoiceDate, setInvoiceDate] = useState(null);
  const [editingInvoiceDate, setEditingInvoiceDate] = useState(false);
  const [savingDates, setSavingDates] = useState(false);
  const [editingIssuedDate, setEditingIssuedDate] = useState(false);
  const [issuedDate, setIssuedDate] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const pdfRef = useRef(null);
  const sharePopupRef = useRef(null);

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

      // Use Firebase Realtime Database reference
      const orderRef = ref(database, `clients/${id}`);
      const snapshot = await get(orderRef);

      if (!snapshot.exists()) {
        throw new Error('Order not found');
      }

      const data = {
        id: snapshot.key,
        ...snapshot.val()
      };

      // Set invoice date - use invoiceDate from data if available, otherwise use timestamp
      const timestamp = data.timestamp || Date.now();
      setInvoiceDate(data.orderDate ? new Date(data.orderDate) : new Date(timestamp));

      // Set issued date - use issuedDate from data if available, otherwise use timestamp
      setIssuedDate(data.orderDate ? new Date(data.orderDate) : new Date(timestamp));

      // Set due date - use dueDate from data if available, otherwise add 30 days to timestamp
      const defaultDueDate = new Date(timestamp);
      defaultDueDate.setDate(defaultDueDate.getDate() + 30); // Add 30 days by default

      setDueDate(data.dueDate ? new Date(data.dueDate) : defaultDueDate);
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

  // Handle click outside of share popup to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sharePopupRef.current && !sharePopupRef.current.contains(event.target)) {
        setShowSharePopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  // Share PDF via WhatsApp
  const shareViaWhatsApp = async (specificPhone = null) => {
    try {
      setIsPdfGenerating(true);

      // Generate PDF blob
      const blob = await toPDF({ returnPromise: true });

      // Create a temporary URL for the PDF
      const pdfUrl = URL.createObjectURL(blob);

      // Get client name for message
      const clientName = orderData ? orderData.clientName : `Invoice ${id}`;
      const message = `Hello! Here's the invoice for ${clientName} (Order #${id})`;

      let phone = specificPhone;
      if (!phone) {
        // For mobile devices or desktop when no specific contact is provided
        phone = window.prompt("Enter the phone number with country code (e.g., +919876543210):", "");
      }

      // Download link for the invoice - let the user save it first
      if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        // For IE
        window.navigator.msSaveOrOpenBlob(blob, `invoice-${id}.pdf`);
      } else {
        // For other browsers
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `invoice-${id}.pdf`;
        link.click();
      }

      setTimeout(() => {
        if (phone) {
          // Format phone number - remove spaces, brackets, etc.
          const formattedPhone = phone.replace(/[\s()+\-]/g, "");

          // Open WhatsApp with specified contact and pre-filled message
          window.open(`https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`, '_blank');
        } else {
          // If no phone entered, open WhatsApp without specific contact
          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
        }

        // Clean up the temporary URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl);
        }, 60000); // Revoke after 1 minute
      }, 1000); // Small delay to allow download to start first

      setShowSharePopup(false);
    } catch (error) {
      console.error("Error sharing via WhatsApp:", error);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  // Share PDF via Telegram
  const shareViaTelegram = async () => {
    try {
      setIsPdfGenerating(true);

      // Generate PDF blob
      const blob = await toPDF({ returnPromise: true });

      // Create a temporary URL for the PDF
      const pdfUrl = URL.createObjectURL(blob);

      // Get client name for message
      const clientName = orderData ? orderData.clientName : `Invoice ${id}`;
      const message = `Invoice for ${clientName} (Order #${id})`;

      // Download link for the invoice - let the user save it first
      if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        // For IE
        window.navigator.msSaveOrOpenBlob(blob, `invoice-${id}.pdf`);
      } else {
        // For other browsers
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `invoice-${id}.pdf`;
        link.click();
      }

      // Open Telegram with pre-filled message after download starts
      setTimeout(() => {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(message)}`, '_blank');

        // Clean up the temporary URL
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl);
        }, 60000); // Revoke after 1 minute
      }, 1000);

      setShowSharePopup(false);
    } catch (error) {
      console.error("Error sharing via Telegram:", error);
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

  // Save invoice date to database
  const saveInvoiceDate = async () => {
    try {
      setSavingDates(true);
      const orderRef = ref(database, `clients/${id}`);
      await update(orderRef, {
        invoiceDate: invoiceDate.getTime() // Store as timestamp
      });

      // Update local state
      setOrderData({
        ...orderData,
        invoiceDate: invoiceDate.getTime()
      });

      setEditingInvoiceDate(false);
    } catch (error) {
      console.error("Error saving invoice date:", error);
      alert("Failed to save invoice date. Please try again.");
    } finally {
      setSavingDates(false);
    }
  };

  // Save due date to database
  const saveDueDate = async () => {
    try {
      setSavingDates(true);
      const orderRef = ref(database, `clients/${id}`);
      await update(orderRef, {
        dueDate: dueDate.getTime() // Store as timestamp
      });

      // Update local state
      setOrderData({
        ...orderData,
        dueDate: dueDate.getTime()
      });

      setEditingDueDate(false);
    } catch (error) {
      console.error("Error saving due date:", error);
      alert("Failed to save due date. Please try again.");
    } finally {
      setSavingDates(false);
    }
  };

  // Save issued date to database
  const saveIssuedDate = async () => {
    try {
      setSavingDates(true);
      const orderRef = ref(database, `clients/${id}`);
      await update(orderRef, {
        issuedDate: issuedDate.getTime() // Store as timestamp
      });

      // Update local state
      setOrderData({
        ...orderData,
        issuedDate: issuedDate.getTime()
      });

      setEditingIssuedDate(false);
    } catch (error) {
      console.error("Error saving issued date:", error);
      alert("Failed to save issued date. Please try again.");
    } finally {
      setSavingDates(false);
    }
  };

  // Handle invoice date input change
  const handleInvoiceDateChange = (e) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      setInvoiceDate(newDate);
    }
  };

  // Handle date input change
  const handleDueDateChange = (e) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      setDueDate(newDate);
    }
  };

  // Handle issued date input change
  const handleIssuedDateChange = (e) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      setIssuedDate(newDate);
    }
  };

  // Format date for input field
  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    return d.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-gray-50 to-gray-100 p-4">
        <div className="relative px-5 py-6 bg-white rounded-xl shadow-xl w-full max-w-md mx-auto border border-gray-100">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-10 w-10 text-indigo-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h3 className="text-lg font-semibold text-gray-800">Loading Invoice</h3>
            <p className="text-gray-500 mt-2 text-sm text-center">Please wait while we fetch your invoice details</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-gray-50 to-gray-100 py-8 px-4 sm:px-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-xl rounded-xl overflow-hidden border border-red-50">
          <div className="bg-red-50 px-4 sm:px-6 py-6 border-b border-red-100">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <h2 className="text-center text-xl font-bold text-gray-900">{error || 'Invoice not found'}</h2>
            <p className="mt-2 text-center text-gray-500 text-sm">We couldn't retrieve the requested invoice information.</p>
          </div>
          <div className="px-4 sm:px-6 py-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/clients')}
                className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <svg className="mr-2 -ml-1 h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to List
              </button>
              <button
                onClick={fetchOrder}
                className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
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
    <div className="min-h-screen bg-gradient-to-r from-gray-50 to-gray-100 py-4 sm:py-6 md:py-8 px-2 sm:px-4 md:px-6 print:py-0 print:px-0">
      <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden print:shadow-none border border-gray-100">
        {/* Header with Company Info and Invoice Label */}
        <div className="px-4 sm:px-6 md:px-8 py-4 md:py-6 bg-gradient-to-r from-indigo-500 to-purple-600 border-b print:hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <Link to="/clients" className="text-white hover:text-indigo-100 flex items-center transition-colors text-sm sm:text-base">
              <svg className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>

            {/* Date Editing Controls - Mobile Optimized */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-white text-xs font-medium">From Date:</span>
                {editingInvoiceDate ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      value={formatDateForInput(invoiceDate)}
                      onChange={handleInvoiceDateChange}
                      className="border border-indigo-300 rounded-md p-1 text-xs w-[120px] sm:w-28 bg-white/90 text-gray-800"
                      disabled={savingDates}
                    />
                    <button
                      onClick={saveInvoiceDate}
                      className={`${savingDates ? 'bg-green-400' : 'bg-green-500'} text-white p-1 rounded-md flex-shrink-0`}
                      title="Save from date"
                      disabled={savingDates}
                    >
                      {savingDates ? (
                        <svg className="w-3 h-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => setEditingInvoiceDate(false)}
                      className="bg-red-500 text-white p-1 rounded-md flex-shrink-0"
                      title="Cancel"
                      disabled={savingDates}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-white text-xs bg-white/20 rounded px-2 py-1 truncate max-w-[120px] sm:max-w-none">
                      {invoiceDate ? new Date(invoiceDate).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }) : 'Not set'}
                    </span>
                    <button
                      onClick={() => setEditingInvoiceDate(true)}
                      className="text-white hover:text-indigo-200 p-1 flex-shrink-0"
                      title="Edit from date"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-white text-xs font-medium">To Date:</span>
                {editingDueDate ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      value={formatDateForInput(dueDate)}
                      onChange={handleDueDateChange}
                      className="border border-indigo-300 rounded-md p-1 text-xs w-[120px] sm:w-28 bg-white/90 text-gray-800"
                      disabled={savingDates}
                    />
                    <button
                      onClick={saveDueDate}
                      className={`${savingDates ? 'bg-green-400' : 'bg-green-500'} text-white p-1 rounded-md flex-shrink-0`}
                      title="Save to date"
                      disabled={savingDates}
                    >
                      {savingDates ? (
                        <svg className="w-3 h-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => setEditingDueDate(false)}
                      className="bg-red-500 text-white p-1 rounded-md flex-shrink-0"
                      title="Cancel"
                      disabled={savingDates}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-white text-xs bg-white/20 rounded px-2 py-1 truncate max-w-[120px] sm:max-w-none">
                      {dueDate ? new Date(dueDate).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }) : 'Not set'}
                    </span>
                    <button
                      onClick={() => setEditingDueDate(true)}
                      className="text-white hover:text-indigo-200 p-1 flex-shrink-0"
                      title="Edit to date"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-white text-xs font-medium">Issued Date:</span>
                {editingIssuedDate ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      value={formatDateForInput(issuedDate)}
                      onChange={handleIssuedDateChange}
                      className="border border-indigo-300 rounded-md p-1 text-xs w-[120px] sm:w-28 bg-white/90 text-gray-800"
                      disabled={savingDates}
                    />
                    <button
                      onClick={saveIssuedDate}
                      className={`${savingDates ? 'bg-green-400' : 'bg-green-500'} text-white p-1 rounded-md flex-shrink-0`}
                      title="Save issued date"
                      disabled={savingDates}
                    >
                      {savingDates ? (
                        <svg className="w-3 h-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => setEditingIssuedDate(false)}
                      className="bg-red-500 text-white p-1 rounded-md flex-shrink-0"
                      title="Cancel"
                      disabled={savingDates}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-white text-xs bg-white/20 rounded px-2 py-1 truncate max-w-[120px] sm:max-w-none">
                      {issuedDate ? new Date(issuedDate).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }) : 'Not set'}
                    </span>
                    <button
                      onClick={() => setEditingIssuedDate(true)}
                      className="text-white hover:text-indigo-200 p-1 flex-shrink-0"
                      title="Edit issued date"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto justify-end">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white/20 text-white backdrop-blur-sm border border-white/30 rounded-lg hover:bg-white/30 flex items-center text-xs sm:text-sm font-medium transition-colors"
                aria-label="Print invoice"
              >
                <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span className="hidden sm:inline">Print</span>
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isPdfGenerating}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 bg-white text-indigo-600 border border-white rounded-lg flex items-center text-xs sm:text-sm font-medium transition-colors ${isPdfGenerating ? 'opacity-70 cursor-not-allowed' : 'hover:bg-indigo-50'
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
                    <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span className="hidden sm:inline">Download PDF</span>
                  </>
                )}
              </button>

              {/* Share Button */}
              <div className="relative">
                {/* <button
                  onClick={() => setShowSharePopup(!showSharePopup)}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-500 text-white border border-green-600 rounded-lg flex items-center text-xs sm:text-sm font-medium hover:bg-green-600 transition-colors"
                  aria-label="Share invoice"
                >
                  <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span className="hidden sm:inline">Share</span>
                </button> */}

                {/* Share Popup - Now positioned better for mobile */}
                {showSharePopup && (
                  <div
                    ref={sharePopupRef}
                    className="absolute right-0 mt-2 w-60 bg-white rounded-lg shadow-lg border border-gray-200 z-10 sm:right-0 sm:left-auto left-0"
                  >
                    <div className="p-3">
                      <h3 className="text-xs font-semibold text-gray-700 mb-2 pb-1 border-b">Share via</h3>
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => shareViaWhatsApp()}
                          className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-green-50 rounded-md transition-colors"
                        >
                          <svg className="h-5 w-5 mr-2 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                          WhatsApp
                        </button>

                        <button
                          onClick={shareViaTelegram}
                          className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <svg className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.347.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                          </svg>
                          Telegram
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Content */}
        <div ref={targetRef} className="px-4 sm:px-6 md:px-8 py-6 sm:py-8 print:p-4">
          {/* Company Logo and Invoice Title */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-4 border-b print-break-inside-avoid">
            <div className="flex items-start sm:items-center sm:flex-row mb-4 md:mb-0 w-full md:w-auto justify-between">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-2.5 rounded-lg mr-3 shadow-md flex-shrink-0 mb-3 sm:mb-0 print:bg-indigo-500">
                <svg className="h-6 w-6 sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 text-left">Siyaram Lace</h1>
                <p className="text-gray-500 text-xs sm:text-sm mt-1 text-left">Jay Industrial Estate, IND 79, Anjana, 1, Anjana, Surat, Gujarat 395003</p>
                <p className="text-gray-500 text-xs sm:text-sm mt-1 text-left">Contact Number :- 98794 43940</p>
              </div>
            </div>
          </div>
          {/* <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-4 border-b print-break-inside-avoid">
            <div className="flex justify-center items-center">
              <img
                src="/siyaram-lace.png"
                alt="icon"
                className="h-20 w-auto max-w-[180px] object-contain text-white print:h-24 print:max-w-[200px]"
              />
            </div>
            <div className="text-center justify-end sm:text-left">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 text-end">Siyaram Lace</h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1 text-end">Jay Industrial Estate, IND 79, Anjana, 1, Anjana, Surat, Gujarat 395003</p>
              <p className="text-gray-500 text-xs sm:text-sm mt-1 text-end">Contact Number :- 98794 43940</p>
            </div>
          </div> */}

          {/* INVOICE STAMP */}
          <div className="hidden sm:block absolute top-4 right-4 print:top-8 print:right-8">
            <div className={`rounded-full w-20 h-20 flex items-center justify-center border-2 rotate-12 ${isPaid ? 'border-green-500' : 'border-orange-500'} opacity-90 print:opacity-100`}>
              <span className={`text-sm font-bold uppercase ${isPaid ? 'text-green-600' : 'text-orange-600'}`}>
                {isPaid ? 'PAID' : 'PENDING'}
              </span>
            </div>
          </div>

          {/* Mobile View PAID/PENDING Badge */}
          <div className="sm:hidden flex justify-center -mt-4 mb-4">
            <div className={`rounded-full px-4 py-1 ${isPaid
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-orange-100 text-orange-700 border border-orange-200'
              }`}>
              <span className="text-xs font-bold uppercase">
                {isPaid ? 'PAID' : 'PENDING'}
              </span>
            </div>
          </div>

          {/* Invoice Number and Date Header */}
          <div className="w-full mb-6 bg-gray-50 border border-gray-100 rounded-lg p-4 print:bg-gray-100">
            <div className="flex flex-wrap justify-between items-center">
              <div>
                <span className="block text-xs text-gray-500 uppercase font-medium">Order Number</span>
                <span className="block text-lg font-bold text-gray-900">#{id}</span>
              </div>
              <div className="text-right">
                <span className="block text-xs text-gray-500 uppercase font-medium">Date Issued</span>
                <span className="block text-sm font-medium text-gray-900">
                  {issuedDate ? new Date(issuedDate).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'Asia/Kolkata',
                  }) : new Date(orderData.timestamp).toLocaleDateString('en-IN', {
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
            <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-100 md:w-1/2 print:bg-white print:border print-full-width">
              <h3 className="text-gray-500 font-medium mb-3 text-xs sm:text-sm uppercase tracking-wider text-left">Client Information</h3>
              <div className="space-y-2">
                <div className="flex flex-col">
                  <span className="text-gray-500 text-xs sm:text-sm uppercase mb-1 text-left">Bill To:  <span className='text-gray-900 font-semibold text-xs sm:text-sm'>{orderData.clientName || 'N/A'}</span></span>
                  {orderData.clientAddress && (
                    <span className="text-gray-700 text-xs sm:text-sm mt-1 leading-tight text-left">{orderData.clientAddress}</span>
                  )}

                  {orderData.clientPhone && (
                    <span className="text-gray-700 text-xs sm:text-sm mt-1 text-left">
                      <span className="inline-block mr-1">
                        Mobile No:-
                      </span>
                      {orderData.clientPhone}
                    </span>
                  )}
                </div>

                {orderData.clientGst && (
                  <div className="border-t border-gray-200 pt-2 mt-3 text-left">
                    <span className="text-gray-500 font-medium text-xs sm:text-sm">GST No:</span>
                    <span className="text-gray-800 font-semibold text-xs sm:text-sm ml-2">{orderData.clientGst}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-100 md:w-1/2 print:bg-white print:border print-full-width">
              <h3 className="text-gray-500 font-medium mb-3 text-xs sm:text-sm uppercase tracking-wider">Payment Details</h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                <div className="text-gray-500 font-medium text-left">From Date:</div>
                <div className="text-gray-800 font-semibold text-right">
                  {invoiceDate ? new Date(invoiceDate).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'Asia/Kolkata',
                  }) : 'Not set'}
                </div>

                <div className="text-gray-500 font-medium text-left">To Date:</div>
                <div className="text-gray-800 font-semibold text-right">
                  {dueDate ? new Date(dueDate).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'Asia/Kolkata',
                  }) : 'Not set'}
                </div>

                <div className="text-gray-500 font-medium text-left">Status:</div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isPaid ? 'text-green-800' : 'text-amber-800'
                      } ${isPaid ? 'print:text-green-800' : 'print:text-amber-800'
                      }`}
                  >
                    {isPaid ? 'Paid' : 'Pending'}
                  </span>
                </div>

                <div className="text-gray-500 font-medium text-left">Order Status:</div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${orderData.orderStatus === 'sell'
                      ? 'text-blue-800'
                      : 'text-purple-800'
                      }`}
                  >
                    {orderData.orderStatus === 'sell' ? '📤 Sell' : '📥 Purchased'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Items Table */}
          <div className="mb-8 overflow-x-auto rounded-xl border border-gray-100 shadow-sm print-break-inside-avoid">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:bg-gray-100">#</th>
                  <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:bg-gray-100">Item</th>
                  <th scope="col" className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider print:bg-gray-100">Qty</th>
                  <th scope="col" className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider print:bg-gray-100">Price</th>
                  <th scope="col" className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider print:bg-gray-100">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orderData.products?.map((product, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs text-gray-500">{index + 1}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-900">{product.name || 'Product Item'}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 text-right">{product.count}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 text-right">₹{product.price}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 text-right">₹{product.total}</td>
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
                <div className="bg-gray-50 rounded-xl p-4 sm:p-6 border border-gray-100 shadow-sm print:bg-white print:border">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600 pb-2">
                      <span>Subtotal</span>
                      <span className="font-medium flex items-center">₹{typeof orderData.grandTotal === 'number' ? orderData.grandTotal.toFixed(2) : '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 pb-2 border-b border-gray-200">
                      <span>Tax</span>
                      <span className="font-medium flex items-center">₹0.00</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-gray-800 pt-2">
                      <span>Total</span>
                      <span className="text-lg flex items-center">₹{typeof orderData.grandTotal === 'number' ? orderData.grandTotal.toFixed(2) : '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 pt-2 pb-2 border-b border-gray-200">
                      <span>Amount Paid</span>
                      <span className="font-medium text-green-600 flex items-center">₹{(typeof orderData.amountPaid === 'number' ? orderData.amountPaid.toFixed(2) : '0.00')}
                      </span>
                    </div>
                    <div className="flex justify-between text-base font-bold pt-2">
                      <span className={isPaid ? 'text-green-600' : 'text-red-600'}>Balance Due</span>
                      <span className={isPaid ? 'text-green-600' : 'text-red-600'} style={{ display: 'flex', alignItems: 'center' }}>₹{Math.max(0, balanceDue).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment History Section */}
          {orderData.paymentHistory && orderData.paymentHistory.length > 0 && (
            <div className="mb-8 print-break-inside-avoid">
              <h3 className="text-gray-700 font-semibold mb-3 text-sm sm:text-base border-b pb-2">Payment History</h3>
              <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:bg-gray-100">#</th>
                      <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:bg-gray-100">Date</th>
                      <th scope="col" className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider print:bg-gray-100">Amount</th>
                      <th scope="col" className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider print:bg-gray-100">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orderData.paymentHistory.map((payment, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                        <td className="px-3 sm:px-6 py-3 text-left text-xs text-gray-500">{index + 1}</td>
                        <td className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm text-gray-500">
                          {new Date(payment.date).toLocaleString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Asia/Kolkata'
                          })}
                        </td>
                        <td className="px-3 sm:px-6 py-3 whitespace-nowrap text-xs sm:text-sm font-medium text-green-600 text-right flex items-center justify-end">
                          ₹{parseFloat(payment.amount).toFixed(2)}
                        </td>
                        <td className="px-3 sm:px-6 py-3 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-green-800">
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
          <div className="text-center my-6 print-break-inside-avoid border-t border-gray-100 pt-6">
            <div className="flex items-center justify-center mb-2">
              <svg className="h-5 w-5 text-indigo-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm font-medium text-gray-700">Thank you for your business!</p>
            </div>
            <p className="text-xs text-gray-500">If you have any questions about this Bill, please contact us.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail; 