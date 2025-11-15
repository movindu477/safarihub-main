import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Bell } from "lucide-react";
import Navbar from "./Navbar";
import JeepHero from "./JeepHero";
import JeepSection2 from "./JeepSection2";

// Initialize Firebase
const db = getFirestore();
const auth = getAuth();

// Notification Bell Component
const NotificationBell = ({ user, notifications, onNotificationClick, onMarkAsRead }) => {
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notification-container')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
  };

  const handleNotificationItemClick = async (notification) => {
    // Mark as read when clicked
    if (!notification.read && onMarkAsRead) {
      await onMarkAsRead(notification.id);
    }
    
    onNotificationClick(notification);
    setShowNotifications(false);
  };

  if (!user) return null;

  return (
    <div className="relative notification-container">
      <button
        onClick={handleBellClick}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Bell size={24} />
        {notifications.filter(n => !n.read).length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {notifications.filter(n => !n.read).length}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showNotifications && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
          </div>
          
          <div className="divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleNotificationItemClick(notification)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-medium text-gray-900 text-sm">
                      {notification.title}
                    </h4>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                  <p className="text-gray-600 text-xs mb-2">{notification.message}</p>
                  <p className="text-gray-400 text-xs">
                    {notification.timestamp?.toDate?.()?.toLocaleDateString() || 'Recently'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Global Notification Bell for Bottom Right Corner
const GlobalNotificationBell = ({ user, notifications, onNotificationClick, onMarkAsRead }) => {
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notification-container')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
  };

  const handleNotificationItemClick = async (notification) => {
    // Mark as read when clicked
    if (!notification.read && onMarkAsRead) {
      await onMarkAsRead(notification.id);
    }
    
    onNotificationClick(notification);
    setShowNotifications(false);
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 notification-container">
      <div className="relative">
        {/* Notification Panel - Positioned ABOVE the button */}
        {showNotifications && (
          <div className="absolute bottom-full right-0 mb-3 w-80 sm:w-96 max-h-96 overflow-hidden">
            <div className="bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              </div>
              
              <div className="divide-y divide-gray-100">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No notifications
                  </div>
                ) : (
                  notifications.slice(0, 10).map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleNotificationItemClick(notification)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-medium text-gray-900 text-sm">
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-gray-600 text-xs mb-2">{notification.message}</p>
                      <p className="text-gray-400 text-xs">
                        {notification.timestamp?.toDate?.()?.toLocaleDateString() || 'Recently'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notification Bell Button */}
        <button
          onClick={handleBellClick}
          className="relative bg-yellow-500 p-4 rounded-full shadow-lg border-2 border-white hover:shadow-xl transition-all duration-300 hover:scale-110"
        >
          <Bell className="h-6 w-6 text-white" />
          {notifications.filter(n => !n.read).length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
              {notifications.filter(n => !n.read).length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

// Notification management function
const getUserNotifications = (userId, callback) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const notificationsQuery = query(
      notificationsRef,
      where('recipientId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(notifications);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error getting notifications:', error);
    callback([]);
    return () => {};
  }
};

export default function JeepMain({ user, onLogin, onRegister, onLogout, onShowAuth }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);

  // Load notifications when user is logged in
  useEffect(() => {
    if (user) {
      const unsubscribe = getUserNotifications(user.uid, (notifications) => {
        setNotifications(notifications);
      });
      
      return () => unsubscribe();
    } else {
      setNotifications([]);
    }
  }, [user]);

  const handleNotificationClick = (notification) => {
    console.log('Notification clicked:', notification);
    
    // If it's a message notification, navigate to chat
    if (notification.type === 'message' && notification.relatedId) {
      // Extract participant IDs from conversationId
      const participantIds = notification.relatedId.split('_');
      const otherParticipantId = participantIds.find(id => id !== user.uid);
      
      if (otherParticipantId) {
        // Navigate to jeep profile with chat open
        navigate(`/jeepprofile?driverId=${otherParticipantId}&openChat=true`);
      }
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Global Notification Bell (Bottom Right) */}
      <GlobalNotificationBell 
        user={user}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAsRead={handleMarkAsRead}
      />
      
      <Navbar 
        user={user} 
        onLogin={onLogin || onShowAuth} 
        onRegister={onRegister || onShowAuth} 
        onLogout={onLogout} 
      />
      <JeepHero />
      <div className="h-1 bg-black"></div>
      <JeepSection2 />
    </div>
  );
}

export { getUserNotifications };