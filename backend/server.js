const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);

// Socket.io configuration
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`💬 Messaging system ready`);
});