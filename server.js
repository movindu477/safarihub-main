import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Firebase configuration (same as frontend)
const firebaseConfig = {
  apiKey: "AIzaSyAXjQQ9BYX4upBJx_Ko5jTUq9nTCIDItSA",
  authDomain: "safarihub-a80bd.firebaseapp.com",
  projectId: "safarihub-a80bd",
  storageBucket: "safarihub-a80bd.firebasestorage.app",
  messagingSenderId: "212343673085",
  appId: "1:212343673085:web:708338fc194fbea7f5ee94",
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const app = express();
const server = createServer(app);

// Frontend configuration
const FRONTEND_PORT = process.env.VITE_PORT || 5173;
const FRONTEND_URL = process.env.VITE_URL || `http://localhost:${FRONTEND_PORT}`;

// CORS configuration - allow frontend to access API
app.use(cors({
  origin: [FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
  credentials: true
}));
app.use(express.json());

// Socket.io configuration
const io = new Server(server, {
  cors: {
    origin: [FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Serve static files from React build
app.use(express.static(join(__dirname, 'dist')));

// ==================== SMS/WhatsApp Notification API ====================

// Environment variables for SMS providers (set these in your .env file)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const BASE_URL = process.env.BASE_URL || FRONTEND_URL;

// Format phone number for Sri Lanka (+94)
const formatPhoneNumber = (phoneNumber) => {
  let formatted = phoneNumber.replace(/\D/g, '');
  if (!formatted.startsWith('94')) {
    if (formatted.startsWith('0')) {
      formatted = '94' + formatted.substring(1);
    } else {
      formatted = '94' + formatted;
    }
  }
  return `+${formatted}`;
};

// Send SMS/WhatsApp notification for booking
app.post('/api/send-booking-notification', async (req, res) => {
  try {
    const { 
      phoneNumber, 
      bookingId, 
      customerName, 
      dates, 
      totalPrice,
      driverName 
    } = req.body;

    if (!phoneNumber || !bookingId) {
      return res.status(400).json({ 
        error: 'Phone number and booking ID are required' 
      });
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    const acceptUrl = `${BASE_URL}/booking-action/${bookingId}/accept`;
    const declineUrl = `${BASE_URL}/booking-action/${bookingId}/decline`;
    const viewUrl = `${BASE_URL}/booking-confirm/${bookingId}`;

    console.log(`📱 Sending booking notification:`);
    console.log(`   To: ${formattedPhone} (Driver's phone from profile)`);
    console.log(`   Driver: ${driverName}`);
    console.log(`   Booking ID: ${bookingId}`);

    // Create message
    const message = `🚗 New Booking Request!\n\n👤 Customer: ${customerName}\n📅 Dates: ${dates}\n💰 Total: LKR ${totalPrice.toLocaleString()}\n\n✅ ACCEPT: ${acceptUrl}\n❌ DECLINE: ${declineUrl}\n\n📋 View Details: ${viewUrl}`;

    let result = {
      success: false,
      method: 'none',
      message: 'No SMS provider configured'
    };

    // Option 1: Try Twilio SMS
    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
      try {
        const twilio = await import('twilio');
        const client = twilio.default(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
        
        const smsResult = await client.messages.create({
          to: formattedPhone,
          from: TWILIO_PHONE_NUMBER,
          body: message
        });

        result = {
          success: true,
          method: 'twilio-sms',
          messageSid: smsResult.sid,
          to: formattedPhone
        };
        
        console.log(`✅ SMS sent via Twilio to ${formattedPhone}`);
        return res.json(result);
      } catch (twilioError) {
        console.error('Twilio error:', twilioError.message);
        // Fall through to next method
      }
    }

    // Option 2: Try WhatsApp Business API
    if (WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_ACCESS_TOKEN) {
      try {
        const axios = await import('axios');
        const whatsappUrl = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
        
        const whatsappResponse = await axios.default.post(
          whatsappUrl,
          {
            messaging_product: 'whatsapp',
            to: formattedPhone.replace('+', ''),
            type: 'text',
            text: {
              body: message
            }
          },
          {
            headers: {
              'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );

        result = {
          success: true,
          method: 'whatsapp-business',
          messageId: whatsappResponse.data.messages[0].id,
          to: formattedPhone
        };
        
        console.log(`✅ WhatsApp message sent to ${formattedPhone}`);
        return res.json(result);
      } catch (whatsappError) {
        console.error('WhatsApp API error:', whatsappError.response?.data || whatsappError.message);
        // Fall through to fallback
      }
    }

    // Option 3: Fallback - Generate WhatsApp link
    const whatsappLink = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodeURIComponent(message)}`;
    
    result = {
      success: true,
      method: 'whatsapp-link',
      whatsappUrl: whatsappLink,
      message: 'WhatsApp link generated. Open this URL to send the message.',
      to: formattedPhone
    };

    console.log(`📱 WhatsApp link generated for ${formattedPhone}`);
    console.log(`🔗 Link: ${whatsappLink}`);

    res.json(result);

  } catch (error) {
    console.error('Error sending booking notification:', error);
    res.status(500).json({ 
      error: 'Failed to send notification',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    smsProviders: {
      twilio: !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN),
      whatsapp: !!(WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_ACCESS_TOKEN)
    }
  });
});

// ==================== RECEIVE MESSAGES (Webhooks) ====================

// Twilio Webhook - Receive incoming SMS
app.post('/api/webhook/twilio/sms', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const { From, To, Body, MessageSid } = req.body;
    
    console.log('📨 Incoming SMS from Twilio:');
    console.log('From:', From);
    console.log('To:', To);
    console.log('Message:', Body);
    
    // Format phone number - handle various formats
    const senderPhone = From.replace(/\D/g, '');
    let formattedSender = senderPhone;
    
    // Convert to Sri Lanka format if needed
    if (!formattedSender.startsWith('94')) {
      if (formattedSender.startsWith('0')) {
        formattedSender = '94' + formattedSender.substring(1);
      } else {
        formattedSender = '94' + formattedSender;
      }
    }
    
    // Process the message
    const messageText = Body.toLowerCase().trim();
    
    // Find pending booking for this phone number
    // Try multiple phone number formats
    try {
      const bookingsRef = collection(db, 'bookings');
      
      // Try with + prefix
      let q = query(
        bookingsRef,
        where('driverPhone', '==', `+${formattedSender}`),
        where('status', '==', 'pending')
      );
      let querySnapshot = await getDocs(q);
      
      // Try without + prefix
      if (querySnapshot.empty) {
        q = query(
          bookingsRef,
          where('driverPhone', '==', formattedSender),
          where('status', '==', 'pending')
        );
        querySnapshot = await getDocs(q);
      }
      
      // Try with 0 prefix (local format)
      if (querySnapshot.empty && formattedSender.startsWith('94')) {
        const localFormat = '0' + formattedSender.substring(2);
        q = query(
          bookingsRef,
          where('driverPhone', '==', localFormat),
          where('status', '==', 'pending')
        );
        querySnapshot = await getDocs(q);
      }
      
      if (!querySnapshot.empty) {
        // Get the most recent pending booking
        const bookingDoc = querySnapshot.docs[0];
        const bookingId = bookingDoc.id;
        const bookingData = bookingDoc.data();
        
        // Process accept/decline
        if (messageText.includes('accept') || messageText.includes('yes') || messageText === '1' || messageText.includes('ok')) {
          console.log(`✅ Driver ${formattedSender} accepted booking ${bookingId}`);
          
          // Update booking status
          await updateDoc(doc(db, 'bookings', bookingId), {
            status: 'accepted',
            updatedAt: serverTimestamp(),
            statusUpdatedAt: serverTimestamp()
          });
          
          // Create notification for customer
          await addDoc(collection(db, 'notifications'), {
            type: 'booking',
            title: 'Booking Accepted',
            message: `Your booking with ${bookingData.driverName} has been accepted!`,
            userId: bookingData.customerId,
            recipientId: bookingData.customerId,
            senderId: bookingData.driverId,
            senderName: bookingData.driverName,
            relatedId: bookingId,
            bookingId: bookingId,
            read: false,
            createdAt: serverTimestamp()
          });
          
        } else if (messageText.includes('decline') || messageText.includes('no') || messageText.includes('cancel') || messageText === '2') {
          console.log(`❌ Driver ${formattedSender} declined booking ${bookingId}`);
          
          // Update booking status
          await updateDoc(doc(db, 'bookings', bookingId), {
            status: 'cancelled',
            cancellationReason: 'Declined by driver via SMS',
            cancelledBy: bookingData.driverId,
            updatedAt: serverTimestamp(),
            statusUpdatedAt: serverTimestamp()
          });
          
          // Create notification for customer
          await addDoc(collection(db, 'notifications'), {
            type: 'booking',
            title: 'Booking Cancelled',
            message: `Your booking with ${bookingData.driverName} has been cancelled.`,
            userId: bookingData.customerId,
            recipientId: bookingData.customerId,
            senderId: bookingData.driverId,
            senderName: bookingData.driverName,
            relatedId: bookingId,
            bookingId: bookingId,
            read: false,
            createdAt: serverTimestamp()
          });
        }
      } else {
        console.log(`No pending booking found for ${formattedSender}`);
      }
    } catch (error) {
      console.error('Error processing booking response:', error);
    }
    
    // Respond to Twilio (required)
    res.type('text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    
  } catch (error) {
    console.error('Error processing Twilio webhook:', error);
    res.status(500).send('Error processing webhook');
  }
});

// WhatsApp Business API Webhook - Receive incoming messages
app.post('/api/webhook/whatsapp', express.json(), async (req, res) => {
  try {
    // WhatsApp webhook verification (for initial setup)
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token']) {
      const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'your_verify_token';
      if (req.query['hub.verify_token'] === verifyToken) {
        console.log('✅ WhatsApp webhook verified');
        return res.status(200).send(req.query['hub.challenge']);
      }
      return res.status(403).send('Invalid verify token');
    }
    
    // Handle incoming messages
    const { entry } = req.body;
    
    if (entry && entry[0] && entry[0].changes) {
      const change = entry[0].changes[0];
      
      if (change.value && change.value.messages) {
        const message = change.value.messages[0];
        const from = message.from;
        const text = message.text?.body || '';
        const messageId = message.id;
        
        console.log('📨 Incoming WhatsApp message:');
        console.log('From:', from);
        console.log('Message:', text);
        
        // Format phone number - handle various formats
        let formattedSender = from.replace(/\D/g, '');
        
        // Convert to Sri Lanka format if needed
        if (!formattedSender.startsWith('94')) {
          if (formattedSender.startsWith('0')) {
            formattedSender = '94' + formattedSender.substring(1);
          } else {
            formattedSender = '94' + formattedSender;
          }
        }
        
        // Process the message
        const messageText = text.toLowerCase().trim();
        
        // Find pending booking for this phone number
        // Try multiple phone number formats
        try {
          const bookingsRef = collection(db, 'bookings');
          
          // Try with + prefix
          let q = query(
            bookingsRef,
            where('driverPhone', '==', `+${formattedSender}`),
            where('status', '==', 'pending')
          );
          let querySnapshot = await getDocs(q);
          
          // Try without + prefix
          if (querySnapshot.empty) {
            q = query(
              bookingsRef,
              where('driverPhone', '==', formattedSender),
              where('status', '==', 'pending')
            );
            querySnapshot = await getDocs(q);
          }
          
          // Try with 0 prefix (local format)
          if (querySnapshot.empty && formattedSender.startsWith('94')) {
            const localFormat = '0' + formattedSender.substring(2);
            q = query(
              bookingsRef,
              where('driverPhone', '==', localFormat),
              where('status', '==', 'pending')
            );
            querySnapshot = await getDocs(q);
          }
          
          if (!querySnapshot.empty) {
            const bookingDoc = querySnapshot.docs[0];
            const bookingId = bookingDoc.id;
            const bookingData = bookingDoc.data();
            
            // Process accept/decline
            if (messageText.includes('accept') || messageText.includes('yes') || messageText === '1' || messageText.includes('ok')) {
              console.log(`✅ Driver ${formattedSender} accepted booking ${bookingId} via WhatsApp`);
              
              await updateDoc(doc(db, 'bookings', bookingId), {
                status: 'accepted',
                updatedAt: serverTimestamp(),
                statusUpdatedAt: serverTimestamp()
              });
              
              await addDoc(collection(db, 'notifications'), {
                type: 'booking',
                title: 'Booking Accepted',
                message: `Your booking with ${bookingData.driverName} has been accepted!`,
                userId: bookingData.customerId,
                recipientId: bookingData.customerId,
                senderId: bookingData.driverId,
                senderName: bookingData.driverName,
                relatedId: bookingId,
                bookingId: bookingId,
                read: false,
                createdAt: serverTimestamp()
              });
              
            } else if (messageText.includes('decline') || messageText.includes('no') || messageText.includes('cancel') || messageText === '2') {
              console.log(`❌ Driver ${formattedSender} declined booking ${bookingId} via WhatsApp`);
              
              await updateDoc(doc(db, 'bookings', bookingId), {
                status: 'cancelled',
                cancellationReason: 'Declined by driver via WhatsApp',
                cancelledBy: bookingData.driverId,
                updatedAt: serverTimestamp(),
                statusUpdatedAt: serverTimestamp()
              });
              
              await addDoc(collection(db, 'notifications'), {
                type: 'booking',
                title: 'Booking Cancelled',
                message: `Your booking with ${bookingData.driverName} has been cancelled.`,
                userId: bookingData.customerId,
                recipientId: bookingData.customerId,
                senderId: bookingData.driverId,
                senderName: bookingData.driverName,
                relatedId: bookingId,
                bookingId: bookingId,
                read: false,
                createdAt: serverTimestamp()
              });
            }
          }
        } catch (error) {
          console.error('Error processing WhatsApp booking response:', error);
        }
        
        // Respond to WhatsApp (acknowledge receipt)
        res.status(200).json({ status: 'received' });
        return;
      }
    }
    
    res.status(200).json({ status: 'ok' });
    
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    res.status(500).json({ error: 'Error processing webhook' });
  }
});

// GET endpoint for WhatsApp webhook verification
app.get('/api/webhook/whatsapp', (req, res) => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'your_verify_token';
  
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === verifyToken) {
    console.log('✅ WhatsApp webhook verified');
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.status(403).send('Invalid verify token');
  }
});

// Database simulation
const conversations = new Map();
const users = new Map();
const drivers = new Map();

// Generate conversation ID
const generateConversationId = (userId, driverId) => {
  return `conv_${driverId}_${userId}`;
};

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins conversation
  socket.on('user_join', (data) => {
    const { userId, driverId, userName } = data;
    const conversationId = generateConversationId(userId, driverId);
    
    users.set(userId, socket.id);
    socket.join(`user_${userId}`);
    socket.join(conversationId);
    
    // Initialize conversation
    if (!conversations.has(conversationId)) {
      conversations.set(conversationId, {
        participants: { userId, driverId, userName },
        messages: [],
        createdAt: new Date().toISOString()
      });
    }

    const conversation = conversations.get(conversationId);
    socket.emit('conversation_history', conversation.messages);
  });

  // Driver joins
  socket.on('driver_join', (data) => {
    const { driverId, driverName } = data;
    drivers.set(driverId, socket.id);
    socket.join(`driver_${driverId}`);
    console.log(`Driver ${driverName} joined`);
  });

  // Send message
  socket.on('send_message', (data) => {
    const { userId, driverId, message, senderType, userName } = data;
    const conversationId = generateConversationId(userId, driverId);
    
    const messageData = {
      id: Date.now(),
      conversationId,
      userId,
      driverId,
      message: message.trim(),
      senderType,
      userName: senderType === 'user' ? userName : 'Driver',
      timestamp: new Date().toISOString(),
      read: false
    };

    // Get or create conversation
    let conversation = conversations.get(conversationId);
    if (!conversation) {
      conversation = {
        participants: { userId, driverId, userName },
        messages: [],
        createdAt: new Date().toISOString()
      };
      conversations.set(conversationId, conversation);
    }

    conversation.messages.push(messageData);
    conversation.updatedAt = new Date().toISOString();

    // Send to both participants
    io.to(conversationId).emit('new_message', messageData);

    // Notify the other participant
    if (senderType === 'user') {
      const driverSocketId = drivers.get(driverId);
      if (driverSocketId) {
        io.to(driverSocketId).emit('new_message_notification', messageData);
      }
    } else {
      const userSocketId = users.get(userId);
      if (userSocketId) {
        io.to(userSocketId).emit('new_message_notification', messageData);
      }
    }
  });

  // Mark as read
  socket.on('mark_as_read', (data) => {
    const { conversationId } = data;
    const conversation = conversations.get(conversationId);
    if (conversation) {
      conversation.messages.forEach(msg => {
        if (!msg.read) {
          msg.read = true;
          msg.readAt = new Date().toISOString();
        }
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Clean up user/driver mappings
    for (let [userId, socketId] of users.entries()) {
      if (socketId === socket.id) users.delete(userId);
    }
    for (let [driverId, socketId] of drivers.entries()) {
      if (socketId === socket.id) drivers.delete(driverId);
    }
  });
});

// REST API endpoints
app.get('/api/conversations/:driverId/:userId', (req, res) => {
  const { driverId, userId } = req.params;
  const conversationId = generateConversationId(userId, driverId);
  const conversation = conversations.get(conversationId);
  res.json(conversation ? conversation.messages : []);
});

app.get('/api/driver/conversations/:driverId', (req, res) => {
  const { driverId } = req.params;
  const driverConversations = [];
  
  conversations.forEach((conv, convId) => {
    if (conv.participants.driverId === driverId) {
      driverConversations.push({
        conversationId: convId,
        userId: conv.participants.userId,
        userName: conv.participants.userName,
        lastMessage: conv.messages[conv.messages.length - 1],
        unreadCount: conv.messages.filter(msg => msg.senderType === 'user' && !msg.read).length
      });
    }
  });
  
  res.json(driverConversations);
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`💬 Messaging system ready`);
});