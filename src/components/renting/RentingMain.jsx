import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Navbar from "../home/Navbar";
import RentingHero from "./RentingHero";
import RentingSection2 from "./RentingSection2";
import Footer from "../home/Footer";
import ChatList from "../ChatList";
import BookingPanel from "../BookingPanel";

// Import shared notification bell from App.jsx
import { GlobalNotificationBell } from '../../App';

export default function RentingMain({ user, onLogout, onShowAuth, notifications = [], onNotificationClick, onMarkAsRead }) {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();
  const [currentUser, setCurrentUser] = useState(null);
  const [showChatList, setShowChatList] = useState(false);

  // Scroll to top when page loads or navigates
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  // Listen to authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setCurrentUser(authUser);
    });

    return () => unsubscribe();
  }, [auth]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar
        user={user}
        onLogout={onLogout}
        onLogin={(screen) => (onShowAuth ? onShowAuth(screen || 'login') : null)}
        onRegister={(screen) => (onShowAuth ? onShowAuth(screen || 'register') : null)}
        onOpenChatList={() => setShowChatList(true)}
      />

      {/* Chat List Modal */}
      {showChatList && user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Your Conversations</h2>
              <button
                onClick={() => setShowChatList(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ChatList
                currentUser={user}
                onClose={() => setShowChatList(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <RentingHero>
        <BookingPanel user={user} notifications={notifications} />
      </RentingHero>

      {/* Rental Providers Section */}
      <RentingSection2 currentUser={currentUser} />

      {/* Footer */}
      <Footer />

      {/* Global Notification Bell */}
      {user && (
        <GlobalNotificationBell
          user={user}
          notifications={notifications}
          onNotificationClick={onNotificationClick}
          onMarkAsRead={onMarkAsRead}
        />
      )}
    </div>
  );
}
