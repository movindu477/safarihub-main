import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GuideHero from './guidehero.jsx';
import Navbar from '../Navbar.jsx';
import Footer from '../Footer.jsx';

// Firebase - use correct relative path to go up two levels to src
import { auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';

function App() {
  // State Management
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Authentication Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle login navigation
  const handleLogin = () => {
    navigate('/login');
  };

  // Handle register navigation
  const handleRegister = () => {
    navigate('/register');
  };

  // Handle logout
  const handleLogout = () => {
    setUser(null);
    // The actual logout is handled in Navbar component
  };

  // Handle start chat (if needed)
  const handleStartChat = (type, title) => {
    console.log(`Starting chat: ${type} - ${title}`);
    // Implement your chat logic here or navigate to chat page
    // navigate('/chat');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <main className="relative">
        <Navbar 
          user={user} 
          onLogin={handleLogin}
          onRegister={handleRegister}
          onLogout={handleLogout}
          onStartChat={handleStartChat}
        />
        <GuideHero />
        {/* Add other guide sections/components here */}
        <Footer />
      </main>
    </div>
  );
}

export default App;