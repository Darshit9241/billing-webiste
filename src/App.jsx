import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AddProducts from './addProducts';
import ClientList from './clientList';
import OrderDetail from './orderDetail';
import Login from './Login';
import ProtectedRoute from './ProtectedRoute';
import AllClientOrders from './AllClientOrders';
import ClientNameOrders from './ClientNameOrders';
import AllClients from './AllClients';
import Dashboard from './Dashboard';
import ExpenseTracker from './ExpenseTracker';
//   import React, { useState, useEffect } from 'react';

// // Simple error boundary component
// class ErrorBoundary extends React.Component {
//   constructor(props) {
//     super(props);
//     this.state = { hasError: false, error: null };
//   }

//   static getDerivedStateFromError(error) {
//     return { hasError: true, error };
//   }

//   componentDidCatch(error, errorInfo) {
//     console.error("App error caught:", error, errorInfo);
//   }

//   render() {
//     if (this.state.hasError) {
//       return (
//         <div style={{ 
//           padding: '20px', 
//           margin: '20px', 
//           backgroundColor: '#ffebee', 
//           border: '1px solid #ffcdd2',
//           borderRadius: '4px', 
//           color: '#b71c1c' 
//         }}>
//           <h2>Something went wrong</h2>
//           <p>{this.state.error?.message || "An unknown error occurred"}</p>
//           <button 
//             onClick={() => window.location.reload()}
//             style={{
//               padding: '8px 16px',
//               backgroundColor: '#e57373',
//               color: 'white',
//               border: 'none',
//               borderRadius: '4px',
//               cursor: 'pointer',
//               marginTop: '10px'
//             }}
//           >
//             Reload App
//           </button>
//         </div>
//       );
//     }

//     return this.props.children;
//   }
// }

function App() {
  // const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);

  // useEffect(() => {
  //   // Check if Firebase is properly initialized
  //   try {
  //     // Just mark as initialized after a short delay
  //     // In a real app, you might want to actually check for database connectivity
  //     const timer = setTimeout(() => {
  //       setIsFirebaseInitialized(true);
  //     }, 500);
      
  //     return () => clearTimeout(timer);
  //   } catch (error) {
  //     console.error("Firebase initialization error:", error);
  //   }
  // }, []);

  // if (!isFirebaseInitialized) {
  //   return <div className="App">Initializing Firebase...</div>;
  // }

  return (
    // <ErrorBoundary>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<AddProducts />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/clients" element={<ClientList />} />
              <Route path="/order/:id" element={<OrderDetail />} />
              <Route path="/all-client-orders" element={<AllClientOrders />} />
              <Route path="/all-clients/:clientName" element={<ClientNameOrders />} />
              <Route path="/all-clients" element={<AllClients />} />
              <Route path="/expenses" element={<ExpenseTracker />} />
            </Route>
            
            {/* Redirect any unknown routes to login */}
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </Router>
    // </ErrorBoundary>
  );
}

export default App;