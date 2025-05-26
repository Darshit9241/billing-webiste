import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAllClients, deleteClient } from "./firebase/clientsFirebase";
import { useTheme } from "./context/ThemeContext";
import ThemeToggle from "./components/ThemeToggle";
import { BsCurrencyRupee } from "react-icons/bs";
import Notifications from "./components/Notifications";

const AllClients = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clientsData, setClientsData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredClients, setFilteredClients] = useState([]);

  // New state variables for enhanced functionality
  const [sortField, setSortField] = useState("clientName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [viewMode, setViewMode] = useState(() => {
    // Initialize from localStorage or default to 'card'
    return localStorage.getItem("clientsViewMode") || "compact";
  });
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [visibleItems, setVisibleItems] = useState(20);
  const [showMergedClients, setShowMergedClients] = useState(() => {
    // Initialize from localStorage or default to false
    return localStorage.getItem("showMergedClients") === "true" || false;
  });

  // New state variables for delete functionality
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // New state variable for copy functionality
  const [copiedClient, setCopiedClient] = useState(null);
  
  // New state for infinite scrolling
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollContainerRef = React.useRef(null);

  useEffect(() => {
    fetchClientNames();
  }, []);

  // Save view mode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("clientsViewMode", viewMode);
  }, [viewMode]);

  // Save merged clients preference to localStorage
  useEffect(() => {
    localStorage.setItem("showMergedClients", showMergedClients);
  }, [showMergedClients]);

  // Reset copied client after 2 seconds
  useEffect(() => {
    if (copiedClient) {
      const timer = setTimeout(() => {
        setCopiedClient(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedClient]);

  // Combined filtering and sorting effect
  useEffect(() => {
    let result = [...clientsData];

    // Apply search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((client) =>
        client.clientName.toLowerCase().includes(query)
      );
    }

    // Filter out merged clients if toggle is off
    if (!showMergedClients) {
      result = result.filter((client) => !client.hasMergedClient);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "clientName":
          comparison = a.clientName.localeCompare(b.clientName);
          break;
        case "orderCount":
          comparison = a.orderCount - b.orderCount;
          break;
        case "totalAmount":
          comparison = a.totalAmount - b.totalAmount;
          break;
        case "pendingAmount":
          comparison = a.pendingAmount - b.pendingAmount;
          break;
        case "lastOrderDate":
          comparison = new Date(a.lastOrderDate) - new Date(b.lastOrderDate);
          break;
        default:
          comparison = a.clientName.localeCompare(b.clientName);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    setFilteredClients(result);
    setVisibleItems(itemsPerPage); // Reset visible items when filters change
  }, [searchQuery, clientsData, sortField, sortDirection, showMergedClients]);

  // Add scroll event listener for infinite scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      
      const { scrollTop, clientHeight, scrollHeight } = document.documentElement;
      
      // Load more when user scrolls to bottom (with a threshold)
      if (scrollHeight - scrollTop <= clientHeight * 1.5 && 
          visibleItems < filteredClients.length && 
          !isLoadingMore) {
        loadMoreItems();
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [visibleItems, filteredClients, isLoadingMore]);

  // Function to load more items
  const loadMoreItems = () => {
    setIsLoadingMore(true);
    
    // Simulate loading delay
    setTimeout(() => {
      setVisibleItems(prev => Math.min(prev + itemsPerPage, filteredClients.length));
      setIsLoadingMore(false);
    }, 300);
  };

  const fetchClientNames = async () => {
    setLoading(true);
    try {
      const allClients = await fetchAllClients();

      // Group by client name and count orders
      const clientMap = new Map();

      allClients.forEach((client) => {
        // Skip clients without a name
        if (!client.clientName) return;

        const name = client.clientName.trim();
        if (!name) return;

        // Process all clients regardless of ID prefix
        if (clientMap.has(name)) {
          const existing = clientMap.get(name);
          existing.orderCount += 1;
          existing.totalAmount += parseFloat(client.grandTotal || 0);
          existing.pendingAmount +=
            client.paymentStatus !== "cleared"
              ? Math.max(
                0,
                parseFloat(client.grandTotal || 0) -
                parseFloat(client.amountPaid || 0)
              )
              : 0;

          // Store the client ID, regardless of whether it starts with "merged_" or not
          existing.clientIds.push(client.id);

          // Update hasMergedClient flag if this client has a merged ID
          if (client.id && client.id.startsWith("merged_")) {
            existing.hasMergedClient = true;
          }

          if (client.timestamp > existing.lastOrderDate) {
            existing.lastOrderDate = client.timestamp;
          }
        } else {
          // Create a new entry in the map
          clientMap.set(name, {
            clientName: name,
            orderCount: 1,
            totalAmount: parseFloat(client.grandTotal || 0),
            pendingAmount:
              client.paymentStatus !== "cleared"
                ? Math.max(
                  0,
                  parseFloat(client.grandTotal || 0) -
                  parseFloat(client.amountPaid || 0)
                )
                : 0,
            lastOrderDate: client.timestamp,
            clientIds: [client.id],
            // Flag to identify if this contains a merged client
            hasMergedClient: client.id && client.id.startsWith("merged_"),
          });
        }
      });

      // Convert Map to array and sort by name
      const clientArray = Array.from(clientMap.values());
      clientArray.sort((a, b) => a.clientName.localeCompare(b.clientName));

      // Debug: Check for merged clients in final array
      const mergedClients = clientArray.filter((client) =>
        client.clientIds.some((id) => id && id.startsWith("merged_"))
      );

      setClientsData(clientArray);
      setFilteredClients(clientArray);
    } catch (err) {
      console.error("Error fetching client names:", err);
      setError("Failed to load client data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate visible clients
  const visibleClients = useMemo(() => {
    return filteredClients.slice(0, visibleItems);
  }, [filteredClients, visibleItems]);

  // Calculate total pages
  const hasMoreItems = useMemo(() => {
    return visibleItems < filteredClients.length;
  }, [filteredClients, visibleItems]);

  // Calculate merged client count
  const mergedClientCount = useMemo(() => {
    return clientsData.filter((client) => client.hasMergedClient).length;
  }, [clientsData]);

  // Calculate stats based on current filter settings
  const filteredStats = useMemo(() => {
    // Filter clients based on the merged clients toggle
    const clientsToCount = showMergedClients
      ? clientsData
      : clientsData.filter((client) => !client.hasMergedClient);

    return {
      totalClients: clientsToCount.length,
      totalOrders: clientsToCount.reduce(
        (sum, client) => sum + client.orderCount,
        0
      ),
      totalValue: clientsToCount.reduce(
        (sum, client) => sum + client.totalAmount,
        0
      ),
      pendingAmount: clientsToCount.reduce(
        (sum, client) => sum + client.pendingAmount,
        0
      ),
    };
  }, [clientsData, showMergedClients]);

  const handleClientClick = (clientName, clientIds) => {
    // Pass both the client name and the array of client IDs
    navigate(`/all-clients/${encodeURIComponent(clientName)}`, {
      state: { clientIds },
    });
  };

  // Delete handlers
  const handleDeleteClick = (e, client) => {
    e.stopPropagation(); // Prevent triggering the row click
    setClientToDelete(client);
    setShowDeleteModal(true);
    setDeleteError("");
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setClientToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;

    setIsDeleting(true);
    setDeleteError("");

    try {
      // Delete all client orders with the client IDs
      for (const clientId of clientToDelete.clientIds) {
        await deleteClient(clientId);
      }

      // Update local state to remove the deleted client
      const updatedClients = clientsData.filter(
        (client) => client.clientName !== clientToDelete.clientName
      );
      setClientsData(updatedClients);

      // Close the modal
      setShowDeleteModal(false);
      setClientToDelete(null);
    } catch (err) {
      console.error("Error deleting client:", err);
      setDeleteError("Failed to delete client. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeZone: "Asia/Kolkata",
    });
  };

  const handleBackClick = () => {
    navigate("/clients");
  };

  // Sorting handler
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New field, set default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Copy client name to clipboard
  const handleCopyClientName = (e, clientName) => {
    e.stopPropagation(); // Prevent triggering the row click
    navigator.clipboard
      .writeText(clientName)
      .then(() => {
        setCopiedClient(clientName);
      })
      .catch((err) => {
        console.error("Failed to copy client name: ", err);
      });
  };

  // SortButton Component
  const SortButton = ({
    field,
    label,
    currentSort,
    direction,
    onClick,
    isDarkMode,
  }) => {
    const isActive = currentSort === field;

    return (
      <button
        onClick={() => onClick(field)}
        className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center space-x-1 ${isActive
            ? `${isDarkMode
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-emerald-100 text-emerald-700"
            }`
            : `${isDarkMode
              ? "bg-white/5 text-slate-300 hover:bg-white/10"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`
          } transition-colors`}
      >
        <span>{label}</span>
        {isActive && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3 sm:h-4 sm:w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={direction === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
            />
          </svg>
        )}
      </button>
    );
  };

  return (
    <div
      className={`min-h-screen ${isDarkMode
          ? "bg-gradient-to-br from-slate-900 to-slate-800"
          : "bg-gradient-to-br from-gray-100 to-white"
        } py-4 sm:py-8 px-3 sm:px-6 lg:px-8 transition-colors duration-200`}
      ref={scrollContainerRef}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleBackClick}
                className={`p-1.5 sm:p-2 rounded-lg ${isDarkMode
                    ? "bg-white/5 hover:bg-white/10"
                    : "bg-gray-100 hover:bg-gray-200"
                  } transition-colors`}
                aria-label="Back to clients"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 sm:h-5 sm:w-5 ${isDarkMode ? "text-white" : "text-gray-700"
                    }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </button>

              <h1
                className={`text-base sm:text-lg md:text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"
                  } flex items-center`}
              >
                <span className="bg-gradient-to-r from-emerald-500 to-teal-400 inline-block text-transparent bg-clip-text font-bold">
                  All Clients
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <div>
                <Notifications />
              </div>
              {/* View mode toggle */}
              <div
                className={`p-1 rounded-lg flex ${isDarkMode ? "bg-white/5" : "bg-gray-100"
                  }`}
              >
                <button
                  onClick={() => setViewMode("card")}
                  className={`p-1 sm:p-1.5 rounded-md ${viewMode === "card"
                      ? isDarkMode
                        ? "bg-slate-700"
                        : "bg-white shadow-sm"
                      : ""
                    }`}
                  aria-label="Card view"
                  title="Card view"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 sm:h-5 sm:w-5 ${isDarkMode ? "text-white" : "text-gray-700"
                      }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("compact")}
                  className={`p-1 sm:p-1.5 rounded-md ${viewMode === "compact"
                      ? isDarkMode
                        ? "bg-slate-700"
                        : "bg-white shadow-sm"
                      : ""
                    }`}
                  aria-label="Compact view"
                  title="Compact view"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 sm:h-5 sm:w-5 ${isDarkMode ? "text-white" : "text-gray-700"
                      }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 6h16M4 10h16M4 14h16M4 18h16"
                    />
                  </svg>
                </button>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Search and Sort Controls */}
        <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
          {/* Search bar */}
          <div className="relative">
            <div
              className={`absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none ${isDarkMode ? "text-slate-400" : "text-gray-400"
                }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 sm:h-5 sm:w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 ${isDarkMode ? "bg-white/5" : "bg-white"
                } border ${isDarkMode ? "border-white/10" : "border-gray-200"
                } rounded-xl ${isDarkMode
                  ? "text-white placeholder-slate-400"
                  : "text-gray-900 placeholder-gray-400"
                } focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 shadow-sm text-sm sm:text-base`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                aria-label="Clear search"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 sm:h-5 sm:w-5 ${isDarkMode
                      ? "text-slate-400 hover:text-white"
                      : "text-gray-400 hover:text-gray-600"
                    }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Sort controls */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <SortButton
              field="clientName"
              label="Name"
              currentSort={sortField}
              direction={sortDirection}
              onClick={handleSort}
              isDarkMode={isDarkMode}
            />
            <SortButton
              field="orderCount"
              label="Orders"
              currentSort={sortField}
              direction={sortDirection}
              onClick={handleSort}
              isDarkMode={isDarkMode}
            />
            <SortButton
              field="totalAmount"
              label="Total Value"
              currentSort={sortField}
              direction={sortDirection}
              onClick={handleSort}
              isDarkMode={isDarkMode}
            />
            <SortButton
              field="pendingAmount"
              label="Pending"
              currentSort={sortField}
              direction={sortDirection}
              onClick={handleSort}
              isDarkMode={isDarkMode}
            />
            <SortButton
              field="lastOrderDate"
              label="Last Order"
              currentSort={sortField}
              direction={sortDirection}
              onClick={handleSort}
              isDarkMode={isDarkMode}
            />

            <button
              onClick={() => setShowMergedClients(!showMergedClients)}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center space-x-1 
                ${showMergedClients
                  ? isDarkMode
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-emerald-100 text-emerald-700"
                  : isDarkMode
                    ? "bg-white/5 text-slate-300 hover:bg-white/10"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                } transition-colors`}
              title={
                showMergedClients
                  ? "Hide merged clients and their values from stats"
                  : "Show merged clients and include their values in stats"
              }
            >
              <span>
                {showMergedClients ? "Including Merged" : "Excluding Merged"}
              </span>
              {showMergedClients && mergedClientCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-emerald-500/20">
                  {mergedClientCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        {/* <div className="mb-4 sm:mb-6">
          <div className={`backdrop-blur-md ${isDarkMode ? 'bg-white/5' : 'bg-white'} rounded-xl border ${isDarkMode ? 'border-white/10' : 'border-gray-200'} shadow-md p-3 sm:p-5`}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 sm:gap-4">
              <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-xl p-2 sm:p-4 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Clients</p>
                <p className={`text-lg sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {filteredStats.totalClients}
                  {mergedClientCount > 0 && !showMergedClients && (
                    <span className={`text-xs ml-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      (+{mergedClientCount} merged)
                    </span>
                  )}
                </p>
              </div>
              
              <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-xl p-2 sm:p-4 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Orders</p>
                <p className={`text-lg sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {filteredStats.totalOrders}
                </p>
              </div>
              
              <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-xl p-2 sm:p-4 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Value</p>
                <p className={`text-lg sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  ₹{filteredStats.totalValue.toFixed(2)}
                </p>
              </div>
              
              <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-xl p-2 sm:p-4 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Pending Amount</p>
                <p className={`text-lg sm:text-2xl font-bold text-amber-500`}>
                  ₹{filteredStats.pendingAmount.toFixed(2)}
                </p>
              </div>
              
              <div className={`${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} rounded-xl p-2 sm:p-4 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Found</p>
                <p className={`text-lg sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {filteredClients.length}
                </p>
              </div>
            </div>
          </div>
        </div> */}

        {/* Error message */}
        {error && (
          <div className="bg-red-900/50 border-l-4 border-red-500 text-red-100 p-3 sm:p-4 mb-4 sm:mb-6 rounded-lg animate-pulse backdrop-blur-sm shadow-xl">
            <div className="flex">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 sm:h-6 sm:w-6 mr-2 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm sm:text-base">{error}</span>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-8 sm:py-12">
            <div className="relative mb-4">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-t-4 border-b-4 border-emerald-500 animate-spin"></div>
              <div
                className="absolute top-0 left-0 h-16 w-16 sm:h-20 sm:w-20 rounded-full border-r-4 border-teal-300 animate-spin"
                style={{
                  animationDirection: "reverse",
                  animationDuration: "1.5s",
                }}
              ></div>
            </div>
            <div className="text-center">
              <p className="text-base sm:text-lg text-slate-300 font-medium mb-2">
                Loading clients...
              </p>
              <div
                className={`inline-block h-1.5 w-24 sm:w-32 rounded-full overflow-hidden ${isDarkMode ? "bg-white/10" : "bg-gray-200"
                  }`}
              >
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 animate-pulse"
                  style={{ width: "70%" }}
                ></div>
              </div>
            </div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-10 sm:py-16 bg-white/5 rounded-xl border border-white/10 shadow-xl backdrop-blur-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-slate-600 opacity-50 mb-3 sm:mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2 sm:mb-3">
              No clients found
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto mb-4 sm:mb-6 px-4">
              {searchQuery
                ? `No clients found matching "${searchQuery}".`
                : "There are no clients in the database yet."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => navigate("/")}
                className="inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg shadow-lg hover:shadow-emerald-500/30 text-sm sm:text-base"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 sm:h-5 sm:w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Create First Order
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Client List in Card or Compact View */}
            {viewMode === "card" ? (
              <div className="space-y-3 sm:space-y-4">
                {visibleClients.map((client) => (
                  <div
                    key={client.clientName}
                    onClick={() =>
                      handleClientClick(client.clientName, client.clientIds)
                    }
                    className={`backdrop-blur-md ${isDarkMode ? "bg-white/10" : "bg-white"
                      } rounded-xl shadow-xl overflow-hidden border ${isDarkMode ? "border-white/10" : "border-gray-200"
                      } hover:shadow-emerald-500/10 transition-all duration-300 cursor-pointer ${client.hasMergedClient
                        ? isDarkMode
                          ? "border-l-emerald-500"
                          : "border-l-emerald-500"
                        : ""
                      }`}
                  >
                    <div className="p-3 sm:p-5">
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center">
                            <h3
                              className={`font-semibold text-base sm:text-lg md:text-xl ${isDarkMode ? "text-white" : "text-gray-900"
                                } hover:text-emerald-500 transition-colors`}
                            >
                              {client.clientName}
                              {client.hasMergedClient && (
                                <span className="ml-2 text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                                  Merged
                                </span>
                              )}
                            </h3>
                            <button
                              onClick={(e) =>
                                handleCopyClientName(e, client.clientName)
                              }
                              className={`ml-2 p-1.5 rounded-full ${isDarkMode
                                  ? "bg-white/5 hover:bg-white/10"
                                  : "bg-gray-100 hover:bg-gray-200"
                                } transition-colors`}
                              title="Copy client name"
                            >
                              {copiedClient === client.clientName ? (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 text-emerald-500"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className={`h-4 w-4 ${isDarkMode
                                      ? "text-slate-300"
                                      : "text-gray-500"
                                    }`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
                          <button
                            onClick={(e) => handleDeleteClick(e, client)}
                            className={`p-1.5 rounded-full ${isDarkMode
                                ? "bg-red-500/10 hover:bg-red-500/20 text-red-300"
                                : "bg-red-50 hover:bg-red-100 text-red-500"
                              } transition-colors`}
                            title="Delete client"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2 sm:gap-3">
                          <div
                            className={`${isDarkMode ? "bg-white/5" : "bg-gray-50"
                              } rounded-lg py-1 sm:py-1.5 px-2 sm:px-3 border ${isDarkMode ? "border-white/10" : "border-gray-200"
                              }`}
                          >
                            <p
                              className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"
                                }`}
                            >
                              Orders
                            </p>
                            <p
                              className={`font-medium text-center ${isDarkMode ? "text-white" : "text-gray-900"
                                } text-sm sm:text-base`}
                            >
                              {client.orderCount}
                            </p>
                          </div>

                          <div
                            className={`${isDarkMode ? "bg-white/5" : "bg-gray-50"
                              } rounded-lg py-1 sm:py-1.5 px-2 sm:px-3 border ${isDarkMode ? "border-white/10" : "border-gray-200"
                              }`}
                          >
                            <p
                              className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"
                                }`}
                            >
                              Total Value
                            </p>
                            <p
                              className={`font-medium text-emerald-500 text-sm sm:text-base flex items-center`}
                            >
                              <BsCurrencyRupee />
                              {client.totalAmount.toFixed(2)}
                            </p>
                          </div>

                          {client.pendingAmount > 0 && (
                            <div
                              className={`${isDarkMode ? "bg-amber-500/10" : "bg-amber-50"
                                } rounded-lg py-1 sm:py-1.5 px-2 sm:px-3 border ${isDarkMode
                                  ? "border-amber-500/30"
                                  : "border-amber-200"
                                }`}
                            >
                              <p
                                className={`text-xs ${isDarkMode
                                    ? "text-amber-300"
                                    : "text-amber-600"
                                  }`}
                              >
                                Pending
                              </p>
                              <p
                                className={`font-medium text-amber-500 text-sm sm:text-base flex items-center`}
                              >
                                <BsCurrencyRupee />
                                {client.pendingAmount.toFixed(2)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Compact View
              <div
                className={`overflow-hidden rounded-xl border ${isDarkMode
                    ? "border-white/10 bg-white/5"
                    : "border-gray-200 bg-white"
                  }`}
              >
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead
                      className={isDarkMode ? "bg-slate-800/50" : "bg-gray-50"}
                    >
                      <tr>
                        <th
                          scope="col"
                          className={`px-2 sm:px-3 py-2 sm:py-3 text-center text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-gray-500"
                            } uppercase tracking-wider`}
                        >
                          #
                        </th>
                        <th
                          scope="col"
                          className={`px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-gray-500"
                            } uppercase tracking-wider`}
                        >
                          Client Name
                        </th>
                        <th
                          scope="col"
                          className={`px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-gray-500"
                            } uppercase tracking-wider`}
                        >
                          Orders
                        </th>
                        <th
                          scope="col"
                          className={`px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-gray-500"
                            } uppercase tracking-wider`}
                        >
                          Total Value
                        </th>
                        <th
                          scope="col"
                          className={`px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-gray-500"
                            } uppercase tracking-wider`}
                        >
                          Pending
                        </th>
                        <th
                          scope="col"
                          className={`px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-gray-500"
                            } uppercase tracking-wider`}
                        >
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody
                      className={`divide-y ${isDarkMode ? "divide-white/10" : "divide-gray-200"
                        }`}
                    >
                      {visibleClients.map(
                        (client, index) => (
                          (
                            <tr
                              key={client.clientName}
                              onClick={() =>
                                handleClientClick(
                                  client.clientName,
                                  client.clientIds
                                )
                              }
                              className={`${index % 2 === 0
                                  ? isDarkMode
                                    ? "bg-white/5"
                                    : "bg-white"
                                  : isDarkMode
                                    ? "bg-white/[0.02]"
                                    : "bg-gray-50"
                                } cursor-pointer hover:bg-emerald-500/10 ${client.hasMergedClient
                                  ? isDarkMode
                                    ? "border-l-4 border-l-emerald-500"
                                    : "border-l-4 border-l-emerald-500"
                                  : ""
                                }`}
                            >
                              <td
                                className={`px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-center ${isDarkMode ? "text-slate-400" : "text-gray-500"
                                  }`}
                              >
                                {index + 1}
                              </td>
                              <td
                                className={`px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-left ${isDarkMode ? "text-white" : "text-gray-900"
                                  }`}
                              >
                                <div className="flex items-center">
                                  <span>{client.clientName}</span>
                                  {client.hasMergedClient && (
                                    <span className="ml-2 text-xs bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">
                                      Merged
                                    </span>
                                  )}
                                  <button
                                    onClick={(e) =>
                                      handleCopyClientName(e, client.clientName)
                                    }
                                    className={`ml-2 p-1 rounded-full ${isDarkMode
                                        ? "bg-white/5 hover:bg-white/10"
                                        : "bg-gray-100 hover:bg-gray-200"
                                      } transition-colors`}
                                    title="Copy client name"
                                  >
                                    {copiedClient === client.clientName ? (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-3 w-3 text-emerald-500"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    ) : (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className={`h-3 w-3 ${isDarkMode
                                            ? "text-slate-300"
                                            : "text-gray-500"
                                          }`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                        />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td
                                className={`px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-center ${isDarkMode
                                    ? "text-slate-300"
                                    : "text-gray-700"
                                  }`}
                              >
                                {client.orderCount}
                              </td>
                              <td
                                className={`px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-center text-emerald-500 font-medium flex items-center justify-center`}
                              >
                                <BsCurrencyRupee />
                                {client.totalAmount.toFixed(2)}
                              </td>
                              <td
                                className={`px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-center ${client.pendingAmount > 0
                                    ? "text-amber-500 font-medium"
                                    : isDarkMode
                                      ? "text-slate-500"
                                      : "text-gray-500"
                                  }`}
                              >
                                {client.pendingAmount > 0 ? (
                                  <div className="flex items-center justify-center">
                                    <BsCurrencyRupee />
                                    {client.pendingAmount.toFixed(2)}
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td
                                className={`px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-right`}
                              >
                                <button
                                  onClick={(e) => handleDeleteClick(e, client)}
                                  className={`p-1.5 rounded-full ${isDarkMode
                                      ? "bg-red-500/10 hover:bg-red-500/20 text-red-300"
                                      : "bg-red-50 hover:bg-red-100 text-red-500"
                                    } transition-colors`}
                                  title="Delete client"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          )
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Loading indicator for infinite scroll */}
            {hasMoreItems && (
              <div className="flex justify-center py-4">
                {isLoadingMore ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 border-t-2 border-b-2 border-emerald-500 rounded-full animate-spin"></div>
                    <span className={`text-sm ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>Loading more...</span>
                  </div>
                ) : (
                  <button 
                    onClick={loadMoreItems}
                    className={`px-4 py-2 text-sm rounded-lg ${
                      isDarkMode 
                        ? "bg-white/10 text-white hover:bg-white/20" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    } transition-colors`}
                  >
                    Load more
                  </button>
                )}
              </div>
            )}
            
            {/* Results count */}
            <div className={`text-xs sm:text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"} text-center`}>
              Showing {visibleItems} of {filteredClients.length} clients
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && clientToDelete && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              {/* Background overlay */}
              <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                aria-hidden="true"
              ></div>

              {/* Modal panel */}
              <div className="inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div
                  className={`${isDarkMode ? "bg-slate-800" : "bg-white"
                    } px-4 pt-5 pb-4 sm:p-6 sm:pb-4`}
                >
                  <div className="sm:flex sm:items-start">
                    <div
                      className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${isDarkMode ? "bg-red-900/50" : "bg-red-100"
                        } sm:mx-0 sm:h-10 sm:w-10`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3
                        className={`text-lg leading-6 font-medium ${isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        id="modal-title"
                      >
                        Delete Client
                      </h3>
                      <div className="mt-2">
                        <p
                          className={`text-sm ${isDarkMode ? "text-slate-300" : "text-gray-500"
                            }`}
                        >
                          Are you sure you want to delete{" "}
                          <span className="font-semibold">
                            {clientToDelete.clientName}
                          </span>
                          ? This will permanently delete all{" "}
                          {clientToDelete.orderCount} orders associated with
                          this client. This action cannot be undone.
                        </p>

                        {deleteError && (
                          <div className="mt-3 p-2 rounded-md bg-red-900/50 border border-red-500/50 text-red-200 text-sm">
                            {deleteError}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className={`${isDarkMode
                      ? "bg-slate-800/80 border-t border-white/10"
                      : "bg-gray-50 border-t border-gray-200"
                    } px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse`}
                >
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleConfirmDelete}
                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 ${isDeleting ? "bg-red-400" : "bg-red-600 hover:bg-red-700"
                      } text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors`}
                  >
                    {isDeleting ? (
                      <span className="flex items-center">
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Deleting...
                      </span>
                    ) : (
                      "Delete Client"
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleCancelDelete}
                    className={`mt-3 w-full inline-flex justify-center rounded-md border ${isDarkMode
                        ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      } shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllClients;
