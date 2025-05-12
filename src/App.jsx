import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ClientList from './clientList';
// ... other imports ...

const App = () => {
  return (
    <Router>
      <div className="min-h-screen transition-colors duration-200">
        <Routes>
          <Route path="/" element={<ClientList />} />
          {/* ... other routes ... */}
        </Routes>
      </div>
    </Router>
  );
};

export default App; 