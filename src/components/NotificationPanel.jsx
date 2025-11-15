import React from 'react';
import { MessageCircle, X, Clock, CheckCircle } from 'lucide-react';

const NotificationPanel = ({ notifications, onClose, onNotificationClick, onMarkAsRead }) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffInHours = (now - date) / (1000 * 60 * 60);
      
      if (diffInHours < 1) {
        return 'Just now';
      } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)}h ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return 'Recently';
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await onMarkAsRead(notification.id);
    }
    onNotificationClick(notification);
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    for (const notification of unreadNotifications) {
      await onMarkAsRead(notification.id);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-h-96 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Notifications</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-yellow-400 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-yellow-100 text-sm mt-1">
          {notifications.filter(n => !n.read).length} unread
        </p>
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                  notification.read ? 'bg-white' : 'bg-yellow-50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                    notification.read ? 'bg-gray-300' : 'bg-yellow-500'
                  }`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`font-medium text-sm ${
                        notification.read ? 'text-gray-600' : 'text-gray-900'
                      }`}>
                        {notification.senderName || 'System'}
                      </p>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(notification.timestamp)}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-1">
                      {notification.message || 'New notification'}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        <MessageCircle className="h-3 w-3 mr-1" />
                        {notification.type || 'Notification'}
                      </span>
                      
                      {notification.read && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-gray-200 p-3 bg-gray-50">
          <button
            onClick={handleMarkAllAsRead}
            className="w-full text-center text-sm text-yellow-600 hover:text-yellow-700 font-medium py-2"
          >
            Mark all as read
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;