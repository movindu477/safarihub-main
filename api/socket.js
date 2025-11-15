// api/socket.js
import { Server } from 'socket.io';

// In-memory storage (for demo - use Redis in production)
const conversations = new Map();
const users = new Map();
const drivers = new Map();

const generateConversationId = (userId, driverId) => {
  return `conv_${driverId}_${userId}`;
};

export default function handler(req, res) {
  if (res.socket.server.io) {
    console.log('Socket is already running');
    res.end();
    return;
  }

  const io = new Server(res.socket.server, {
    path: '/api/socket',
    addTrailingSlash: false
  });
  
  res.socket.server.io = io;

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // User joins conversation
    socket.on('user_join', (data) => {
      const { userId, driverId, userName } = data;
      const conversationId = generateConversationId(userId, driverId);
      
      users.set(userId, socket.id);
      socket.join(`user_${userId}`);
      socket.join(conversationId);
      
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

      io.to(conversationId).emit('new_message', messageData);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      for (let [userId, socketId] of users.entries()) {
        if (socketId === socket.id) users.delete(userId);
      }
      for (let [driverId, socketId] of drivers.entries()) {
        if (socketId === socket.id) drivers.delete(driverId);
      }
    });
  });

  console.log('Socket server started successfully');
  res.end();
}

export const config = {
  api: {
    bodyParser: false,
  },
};