
import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import WholesellerDashboard from './components/WholesellerDashboard';
import WholeChiliDashboard from './components/WholeChiliDashboard';
import StockManagement from './components/StockManagement';
import PurchaseDashboard from './components/PurchaseDashboard';
import DuesDashboard from './components/DuesDashboard';
import Settings from './components/Settings';
import NotFound from './components/NotFound';
import Auth from './components/Auth';
import API_BASE_URL from './apiConfig';

function App() {
  // Auth State
  const [user, setUser] = useState(null);
  // Theme State
  const [darkMode, setDarkMode] = useState(false);
  // Offline State
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Spices Data
  const [spices, setSpices] = useState([]);
  const [spicesLoading, setSpicesLoading] = useState(false);
  const [spicesError, setSpicesError] = useState(null);

  const fetchSpices = useCallback(async () => {
    if (!user) return;
    setSpicesLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/spices`);
      
      // Check if response is valid JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || contentType.indexOf("application/json") === -1) {
          // If we get HTML (like a 404 page), throw a clear error
          throw new Error("Backend not reachable. Check API URL configuration.");
      }

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setSpices(data);
      setSpicesError(null);
    } catch (err) {
      console.error("Failed to fetch spices:", err);
      setSpicesError(err);
    } finally {
      setSpicesLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Auth persistence using sessionStorage (clears when tab/window closes)
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
        setUser(JSON.parse(storedUser));
    }

    // Theme persistence (keep in localStorage as user preference)
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark') {
        setDarkMode(true);
        document.body.classList.add('dark-mode');
    }

    // Offline detection listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    fetchSpices();
  }, [fetchSpices]);

  const toggleTheme = () => {
      const newMode = !darkMode;
      setDarkMode(newMode);
      if (newMode) {
          document.body.classList.add('dark-mode');
          localStorage.setItem('theme', 'dark');
      } else {
          document.body.classList.remove('dark-mode');
          localStorage.setItem('theme', 'light');
      }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    sessionStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem('user');
  };

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  if (spicesLoading && spices.length === 0) {
    return <div className="loading-container">Loading Spices...</div>;
  }
  
  if (spicesError) {
    return (
        <div className="error-container" style={{textAlign: 'center', marginTop: '50px'}}>
            <h3>Connection Error</h3>
            <p>{spicesError.message}</p>
            <button className="btn btn-primary" onClick={fetchSpices}>Retry</button>
        </div>
    );
  }

  return (
    <div className="App">
        <Header username={user.username} darkMode={darkMode} toggleTheme={toggleTheme} />
        {isOffline && (
            <div className="offline-banner">
                You are currently offline. Some features may be unavailable, but you can view cached data.
            </div>
        )}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard spices={spices} onStockUpdate={fetchSpices} />} />
            <Route path="/wholeseller" element={<WholesellerDashboard spices={spices} onStockUpdate={fetchSpices} />} />
            <Route path="/whole-chili" element={<WholeChiliDashboard spices={spices} onStockUpdate={fetchSpices} />} />
            <Route path="/purchase" element={<PurchaseDashboard spices={spices} onStockUpdate={fetchSpices} user={user} />} />
            <Route path="/stock" element={<StockManagement spices={spices} />} />
            <Route path="/dues" element={<DuesDashboard user={user} />} />
            <Route path="/settings" element={<Settings user={user} onLogout={handleLogout} spices={spices} onUpdateSpices={fetchSpices} />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
    </div>
  );
}

export default App;
