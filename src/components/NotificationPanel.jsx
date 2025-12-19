import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Clock, CheckCircle, MapPin, User, Check, X as XIcon } from 'lucide-react';
import { updateBookingStatus, getBookingById } from '../App';

const NotificationPanel = ({ notifications, onClose, onNotificationClick, onMarkAsRead, currentUser }) => {
  const [processingButtons, setProcessingButtons] = useState(new Set());
  const [bookingStatuses, setBookingStatuses] = useState({});
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffInHours = (now - date) / (1000 * 60 * 60);
      
      if (diffInHours < 1) {
        const minutes = Math.floor(diffInHours * 60);
        return minutes < 1 ? 'Just now' : `${minutes}m ago`;
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

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'booking':
        return <MapPin className="h-4 w-4 text-green-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'message':
        return 'bg-blue-100 text-blue-800';
      case 'booking':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Fetch booking statuses for notifications
  useEffect(() => {
    const fetchBookingStatuses = async () => {
      const statusPromises = notifications
        .filter(n => n.type === 'booking' && n.bookingId)
        .map(async (notification) => {
          try {
            const booking = await getBookingById(notification.bookingId);
            return { notificationId: notification.id, booking };
          } catch (error) {
            console.error('Error fetching booking status:', error);
            return { notificationId: notification.id, booking: null };
          }
        });

      const results = await Promise.all(statusPromises);
      const statusMap = {};
      results.forEach(({ notificationId, booking }) => {
        if (booking) {
          statusMap[notificationId] = {
            status: booking.status,
            paymentStatus: booking.paymentStatus
          };
        }
      });
      setBookingStatuses(statusMap);
    };

    if (notifications.length > 0) {
      fetchBookingStatuses();
    }
  }, [notifications]);

  const isProcessing = (notificationId) => processingButtons.has(notificationId);
  
  const setProcessing = (notificationId, value) => {
    setProcessingButtons(prev => {
      const newSet = new Set(prev);
      if (value) {
        newSet.add(notificationId);
      } else {
        newSet.delete(notificationId);
      }
      return newSet;
    });
  };

  // Check if notification is for customer receiving booking acceptance
  const isCustomerBookingAccepted = (notification) => {
    const bookingInfo = bookingStatuses[notification.id];
    return notification.type === 'booking' && 
           notification.bookingId && 
           currentUser && 
           notification.recipientId === currentUser.uid &&
           notification.message && 
           notification.message.toLowerCase().includes('accepted') &&
           bookingInfo &&
           bookingInfo.status === 'accepted' &&
           bookingInfo.paymentStatus !== 'paid'; // Only show if not paid yet
  };

  // Check if notification is for provider receiving booking request
  const isProviderBookingRequest = (notification) => {
    const bookingInfo = bookingStatuses[notification.id];
    return notification.type === 'booking' && 
           notification.bookingId && 
           currentUser && 
           notification.recipientId === currentUser.uid &&
           bookingInfo &&
           bookingInfo.status === 'pending';
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-h-96 overflow-hidden w-80 sm:w-96">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Notifications</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-green-400 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex justify-between items-center mt-1">
          <p className="text-green-100 text-sm">
            {notifications.filter(n => !n.read).length} unread
          </p>
          {notifications.filter(n => !n.read).length > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-green-200 hover:text-white text-xs underline cursor-pointer"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No notifications yet</p>
            <p className="text-sm mt-1">Notifications will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                  notification.read ? 'bg-white' : 'bg-blue-50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
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
                    
                    <p
                      className={`text-sm text-gray-600 mb-2 ${
                        notification.type === 'booking' && notification.bookingData
                          ? 'whitespace-pre-line'
                          : 'line-clamp-2'
                      }`}
                    >
                      {notification.message || 'New notification'}
                    </p>
                    
                    {/* Booking Details - show full booking info to related driver/guide */}
                    {notification.type === 'booking' && notification.bookingData && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2 text-xs space-y-1.5">
                        <p className="text-green-900 font-semibold">
                          <strong>Customer:</strong> {notification.bookingData.customerName || notification.senderName || 'Customer'}
                        </p>
                        <p className="text-green-800">
                          <strong>Dates:</strong>{' '}
                          {notification.bookingData.dates ||
                            (notification.bookingData.selectedDates
                              ? notification.bookingData.selectedDates
                                  .map((d) => {
                                    try {
                                      const date = new Date(d);
                                      return date.toLocaleDateString();
                                    } catch {
                                      return d;
                                    }
                                  })
                                  .join(', ')
                              : 'N/A')}
                        </p>
                        <p className="text-green-800">
                          <strong>Days:</strong> {notification.bookingData.numberOfDays || 0}
                          {' · '}
                          <strong>Total:</strong>{' '}
                          {notification.bookingData.totalPrice != null
                            ? `LKR ${Number(notification.bookingData.totalPrice).toLocaleString()}`
                            : 'N/A'}
                        </p>
                        {notification.bookingData.numberOfPassengers != null && (
                          <p className="text-green-800">
                            <strong>Passengers:</strong> {notification.bookingData.numberOfPassengers}
                          </p>
                        )}
                        {notification.bookingData.nationalPark && (
                          <p className="text-green-800">
                            <strong>Park:</strong> {notification.bookingData.nationalPark}
                          </p>
                        )}
                        {notification.bookingData.safariType && (
                          <p className="text-green-800">
                            <strong>Safari:</strong> {notification.bookingData.safariType}
                          </p>
                        )}
                        {notification.bookingData.jeepType && (
                          <p className="text-green-800">
                            <strong>Jeep Type:</strong> {notification.bookingData.jeepType}
                          </p>
                        )}
                        {notification.bookingData.driverLanguage && (
                          <p className="text-green-800">
                            <strong>Preferred Language:</strong> {notification.bookingData.driverLanguage}
                          </p>
                        )}
                        {(notification.bookingData.pickupLocation ||
                          notification.bookingData.dropoffLocation) && (
                          <p className="text-green-800">
                            {notification.bookingData.pickupLocation && (
                              <>
                                <strong>Pickup:</strong> {notification.bookingData.pickupLocation}
                              </>
                            )}
                            {notification.bookingData.dropoffLocation && (
                              <>
                                {' · '}
                                <strong>Drop-off:</strong> {notification.bookingData.dropoffLocation}
                              </>
                            )}
                          </p>
                        )}
                        {notification.bookingData.needsHotelPickup &&
                          (notification.bookingData.hotelName ||
                            notification.bookingData.hotelAddress) && (
                            <p className="text-green-800">
                              <strong>Hotel:</strong>{' '}
                              {notification.bookingData.hotelName || 'N/A'}
                              {notification.bookingData.hotelAddress
                                ? `, ${notification.bookingData.hotelAddress}`
                                : ''}
                            </p>
                          )}
                        {(notification.bookingData.specialAssistance ||
                          notification.bookingData.emergencyContactName ||
                          notification.bookingData.emergencyContactPhone) && (
                          <p className="text-green-800">
                            {notification.bookingData.specialAssistance && (
                              <>
                                <strong>Special Requests:</strong>{' '}
                                {notification.bookingData.specialAssistance}
                                <br />
                              </>
                            )}
                            {notification.bookingData.emergencyContactName && (
                              <>
                                <strong>Emergency Contact:</strong>{' '}
                                {notification.bookingData.emergencyContactName}
                                {notification.bookingData.emergencyContactPhone
                                  ? ` - ${notification.bookingData.emergencyContactPhone}`
                                  : ''}
                              </>
                            )}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Accept/Decline Buttons for Providers (drivers/guides) receiving booking requests */}
                    {isProviderBookingRequest(notification) && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (isProcessing(notification.id)) return;
                            
                            setProcessing(notification.id, true);
                            try {
                              // Provider (driver/guide) is accepting, so providerId is currentUser.uid, customerId is senderId
                              await updateBookingStatus(
                                notification.bookingId,
                                'accepted',
                                currentUser.uid, // providerId (the person accepting - driver or guide)
                                notification.senderId, // customerId (the person who made the booking)
                                currentUser.displayName || 'Service Provider', // providerName
                                notification.bookingData?.customerName || notification.senderName || 'Customer' // customerName
                              );
                              await onMarkAsRead(notification.id);
                              alert('✅ Booking accepted! The customer has been notified.');
                            } catch (error) {
                              console.error('Error accepting booking:', error);
                              alert('Failed to accept booking. Please try again.');
                            } finally {
                              setProcessing(notification.id, false);
                            }
                          }}
                          disabled={isProcessing(notification.id)}
                          className="flex-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing(notification.id) ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          ) : (
                            <>
                              <Check size={14} />
                              Accept
                            </>
                          )}
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (isProcessing(notification.id)) return;
                            
                            setProcessing(notification.id, true);
                            try {
                              // Provider (driver/guide) is declining, so providerId is currentUser.uid, customerId is senderId
                              await updateBookingStatus(
                                notification.bookingId,
                                'declined',
                                currentUser.uid, // providerId (the person declining - driver or guide)
                                notification.senderId, // customerId (the person who made the booking)
                                currentUser.displayName || 'Service Provider', // providerName
                                notification.bookingData?.customerName || notification.senderName || 'Customer' // customerName
                              );
                              await onMarkAsRead(notification.id);
                              alert('❌ Booking declined. The customer has been notified.');
                            } catch (error) {
                              console.error('Error declining booking:', error);
                              alert('Failed to decline booking. Please try again.');
                            } finally {
                              setProcessing(notification.id, false);
                            }
                          }}
                          disabled={isProcessing(notification.id)}
                          className="flex-1 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing(notification.id) ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          ) : (
                            <>
                              <XIcon size={14} />
                              Decline
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Accept/Decline Buttons for Customers receiving booking accepted notifications */}
                    {isCustomerBookingAccepted(notification) && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (isProcessing(notification.id)) return;
                            
                            setProcessing(notification.id, true);
                            try {
                              // Mark notification as read
                              await onMarkAsRead(notification.id);
                              
                              // Get booking to check payment status
                              const booking = await getBookingById(notification.bookingId);
                              if (booking && booking.paymentStatus === 'paid') {
                                alert('✅ Payment already completed for this booking.');
                                setProcessing(notification.id, false);
                                return;
                              }
                              
                              // Redirect to payment page
                              window.location.href = `/payment/${notification.bookingId}`;
                            } catch (error) {
                              console.error('Error processing payment redirect:', error);
                              alert('Failed to redirect to payment page. Please try again.');
                              setProcessing(notification.id, false);
                            }
                          }}
                          disabled={isProcessing(notification.id)}
                          className="flex-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing(notification.id) ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          ) : (
                            <>
                              <Check size={14} />
                              Accept & Pay
                            </>
                          )}
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (isProcessing(notification.id)) return;
                            
                            setProcessing(notification.id, true);
                            try {
                              // Customer is declining the accepted booking
                              // Need to get booking to find provider info
                              const booking = await getBookingById(notification.bookingId);
                              if (!booking) {
                                throw new Error('Booking not found');
                              }
                              
                              // Update booking status to declined
                              await updateBookingStatus(
                                notification.bookingId,
                                'declined',
                                booking.driverId || booking.guideId, // providerId
                                currentUser.uid, // customerId (the person declining)
                                booking.driverName || booking.guideName || 'Service Provider', // providerName
                                currentUser.displayName || 'Customer' // customerName
                              );
                              
                              await onMarkAsRead(notification.id);
                              alert('❌ Booking declined. The service provider has been notified.');
                            } catch (error) {
                              console.error('Error declining booking:', error);
                              alert('Failed to decline booking. Please try again.');
                            } finally {
                              setProcessing(notification.id, false);
                            }
                          }}
                          disabled={isProcessing(notification.id)}
                          className="flex-1 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing(notification.id) ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          ) : (
                            <>
                              <XIcon size={14} />
                              Decline
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getNotificationColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                        <span className="ml-1 capitalize">
                          {notification.type || 'notification'}
                        </span>
                      </span>
                      
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
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
    </div>
  );
};

export default NotificationPanel;