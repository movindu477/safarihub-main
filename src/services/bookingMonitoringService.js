/**
 * Booking Monitoring Service
 * Handles delayed response detection, escalation, and admin intervention
 */

import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';

const db = getFirestore();
const DELAY_THRESHOLD_HOURS = 15;
const DELAY_THRESHOLD_MS = DELAY_THRESHOLD_HOURS * 60 * 60 * 1000;

/**
 * Check for delayed booking responses
 * Should be called periodically (e.g., every hour via cron job or Cloud Function)
 */
export const checkDelayedBookings = async () => {
  try {
    const bookingsRef = collection(db, 'bookings');
    const pendingQuery = query(
      bookingsRef,
      where('status', '==', 'pending'),
      where('flaggedAsDelayed', '!=', true)
    );

    const snapshot = await getDocs(pendingQuery);
    const delayedBookings = [];
    const now = new Date();

    for (const bookingDoc of snapshot.docs) {
      const booking = bookingDoc.data();
      const createdAt = booking.createdAt?.toDate();

      if (!createdAt) continue;

      const hoursSinceCreated = (now - createdAt) / (1000 * 60 * 60);

      if (hoursSinceCreated >= DELAY_THRESHOLD_HOURS) {
        delayedBookings.push({
          id: bookingDoc.id,
          ...booking,
          hoursSinceCreated
        });

        // Flag booking as delayed
        await updateDoc(doc(db, 'bookings', bookingDoc.id), {
          flaggedAsDelayed: true,
          delayedFlaggedAt: serverTimestamp(),
          delayDurationHours: Math.floor(hoursSinceCreated)
        });

        // Create admin notification
        await createAdminNotification({
          type: 'delayed_booking',
          bookingId: bookingDoc.id,
          providerId: booking.driverId || booking.guideId,
          customerId: booking.customerId,
          serviceType: booking.serviceType,
          delayDurationHours: Math.floor(hoursSinceCreated)
        });
      }
    }

    return delayedBookings;
  } catch (error) {
    console.error('Error checking delayed bookings:', error);
    return [];
  }
};

/**
 * Get all delayed bookings
 */
export const getDelayedBookings = async () => {
  try {
    const bookingsRef = collection(db, 'bookings');
    const delayedQuery = query(
      bookingsRef,
      where('flaggedAsDelayed', '==', true),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(delayedQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting delayed bookings:', error);
    return [];
  }
};

/**
 * Send admin reminder to service provider
 */
export const sendAdminReminder = async (bookingId, providerId, adminId, adminName) => {
  try {
    // Create reminder message in conversations
    const conversationsRef = collection(db, 'conversations');
    
    // Find or create conversation between admin and provider
    const conversationQuery = query(
      conversationsRef,
      where('participants', 'array-contains', providerId)
    );
    
    const conversationSnapshot = await getDocs(conversationQuery);
    let conversationId = null;
    
    // Check if there's an existing conversation with admin
    for (const convDoc of conversationSnapshot.docs) {
      const convData = convDoc.data();
      if (convData.participants.includes(adminId)) {
        conversationId = convDoc.id;
        break;
      }
    }
    
    // Create new conversation if none exists
    if (!conversationId) {
      const newConvRef = await addDoc(conversationsRef, {
        participants: [adminId, providerId],
        participantNames: {
          [adminId]: 'Admin',
          [providerId]: 'Service Provider'
        },
        createdAt: serverTimestamp(),
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        unreadCount: {
          [adminId]: 0,
          [providerId]: 1
        }
      });
      conversationId = newConvRef.id;
    }
    
    // Send reminder message
    const messagesRef = collection(db, 'messages');
    await addDoc(messagesRef, {
      conversationId,
      senderId: adminId,
      senderName: adminName || 'Admin',
      receiverId: providerId,
      text: `⚠️ REMINDER: You have a pending booking request that has been waiting for ${DELAY_THRESHOLD_HOURS} hours without response. Please review and respond to booking #${bookingId.substring(0, 8)} as soon as possible to avoid cancellation.`,
      bookingId,
      isAdminReminder: true,
      createdAt: serverTimestamp(),
      read: false
    });
    
    // Update booking with reminder sent flag
    await updateDoc(doc(db, 'bookings', bookingId), {
      adminReminderSent: true,
      adminReminderSentAt: serverTimestamp(),
      adminReminderSentBy: adminId
    });
    
    // Log the admin action
    await logAdminAction({
      adminId,
      adminName,
      action: 'sent_reminder',
      targetType: 'provider',
      targetId: providerId,
      bookingId,
      details: `Sent reminder for delayed booking response`
    });
    
    return { success: true, message: 'Reminder sent successfully' };
  } catch (error) {
    console.error('Error sending admin reminder:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Enable user to cancel booking and suggest alternatives
 */
export const enableUserCancellation = async (bookingId, reason = 'Provider non-response') => {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingDoc = await getDocs(bookingRef);
    
    if (!bookingDoc.exists()) {
      return { success: false, message: 'Booking not found' };
    }
    
    const booking = bookingDoc.data();
    
    // Find alternative providers
    const alternatives = await findAlternativeProviders(
      booking.serviceType,
      booking.bookingDate,
      booking.driverId || booking.guideId
    );
    
    // Update booking to allow cancellation
    await updateDoc(bookingRef, {
      cancellationEnabled: true,
      cancellationReason: reason,
      cancellationEnabledAt: serverTimestamp(),
      suggestedAlternatives: alternatives.map(alt => ({
        providerId: alt.id,
        providerName: alt.fullName,
        rating: alt.rating,
        pricePerDay: alt.priceFullDayStandard || alt.pricePerDay
      }))
    });
    
    // Notify customer
    await addDoc(collection(db, 'notifications'), {
      userId: booking.customerId,
      type: 'cancellation_enabled',
      title: 'Booking Cancellation Available',
      message: `Your booking request has not received a response. You may cancel and choose from ${alternatives.length} alternative providers.`,
      bookingId,
      read: false,
      createdAt: serverTimestamp()
    });
    
    return { success: true, alternatives };
  } catch (error) {
    console.error('Error enabling user cancellation:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Find alternative service providers
 */
export const findAlternativeProviders = async (serviceType, bookingDate, excludeProviderId) => {
  try {
    const providersRef = collection(db, 'serviceProviders');
    const providersQuery = query(
      providersRef,
      where('serviceType', '==', serviceType),
      where('certificationApproved', '==', true),
      orderBy('rating', 'desc'),
      limit(5)
    );
    
    const snapshot = await getDocs(providersQuery);
    const providers = [];
    
    for (const providerDoc of snapshot.docs) {
      if (providerDoc.id === excludeProviderId) continue;
      
      const provider = providerDoc.data();
      
      // Check availability for the booking date
      const dateKey = bookingDate instanceof Date 
        ? bookingDate.toISOString().split('T')[0]
        : bookingDate;
      
      const availability = provider.availability?.[dateKey];
      
      // Only include if available or not marked as busy/unavailable
      if (!availability || availability === 'available') {
        providers.push({
          id: providerDoc.id,
          ...provider
        });
      }
    }
    
    return providers;
  } catch (error) {
    console.error('Error finding alternative providers:', error);
    return [];
  }
};

/**
 * Create admin notification
 */
const createAdminNotification = async (data) => {
  try {
    // Get admin users (you might want to query users with role === 'admin')
    // For now, we'll create a general admin notification
    await addDoc(collection(db, 'adminNotifications'), {
      ...data,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error creating admin notification:', error);
  }
};

/**
 * Log admin actions for audit trail
 */
export const logAdminAction = async (actionData) => {
  try {
    await addDoc(collection(db, 'adminAuditLog'), {
      ...actionData,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
};

/**
 * Get admin audit logs
 */
export const getAdminAuditLogs = async (limitCount = 100) => {
  try {
    const logsRef = collection(db, 'adminAuditLog');
    const logsQuery = query(
      logsRef,
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(logsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting audit logs:', error);
    return [];
  }
};

/**
 * Suspend or remove user/provider
 */
export const suspendAccount = async (userId, reason, adminId, adminName, permanent = false) => {
  try {
    // Update user document
    await updateDoc(doc(db, 'serviceProviders', userId), {
      suspended: true,
      suspendedAt: serverTimestamp(),
      suspendedBy: adminId,
      suspendedReason: reason,
      permanentlyRemoved: permanent
    });
    
    // Log action
    await logAdminAction({
      adminId,
      adminName,
      action: permanent ? 'permanently_removed' : 'suspended',
      targetType: 'user',
      targetId: userId,
      details: `Reason: ${reason}`
    });
    
    // Notify user
    await addDoc(collection(db, 'notifications'), {
      userId,
      type: 'account_suspended',
      title: permanent ? 'Account Removed' : 'Account Suspended',
      message: `Your account has been ${permanent ? 'permanently removed' : 'suspended'}. Reason: ${reason}`,
      read: false,
      createdAt: serverTimestamp()
    });
    
    return { success: true, message: `Account ${permanent ? 'removed' : 'suspended'} successfully` };
  } catch (error) {
    console.error('Error suspending account:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Restore suspended account
 */
export const restoreAccount = async (userId, adminId, adminName) => {
  try {
    await updateDoc(doc(db, 'serviceProviders', userId), {
      suspended: false,
      restoredAt: serverTimestamp(),
      restoredBy: adminId
    });
    
    await logAdminAction({
      adminId,
      adminName,
      action: 'restored_account',
      targetType: 'user',
      targetId: userId,
      details: 'Account access restored'
    });
    
    return { success: true, message: 'Account restored successfully' };
  } catch (error) {
    console.error('Error restoring account:', error);
    return { success: false, message: error.message };
  }
};

export default {
  checkDelayedBookings,
  getDelayedBookings,
  sendAdminReminder,
  enableUserCancellation,
  findAlternativeProviders,
  logAdminAction,
  getAdminAuditLogs,
  suspendAccount,
  restoreAccount
};
