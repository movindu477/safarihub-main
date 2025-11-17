import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  User, 
  Clock,
  MessageCircle,
  Check,
  CheckCheck
} from 'lucide-react';
import { 
  getMessages, 
  sendMessage, 
  createOrGetConversation, 
  markMessagesAsRead,
  createNotification 
} from '../App';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../App';

const MessagePanel = ({ user, otherUserId, otherUserName, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize conversation and load user data
  useEffect(() => {
    if (!user || !otherUserId) return;

    const initializeConversation = async () => {
      try {
        setLoading(true);
        
        // Get other user data
        let userData = null;
        
        // Try tourists collection
        const touristDoc = await getDoc(doc(db, 'tourists', otherUserId));
        if (touristDoc.exists()) {
          userData = {
            id: otherUserId,
            name: touristDoc.data().fullName || otherUserName,
            photo: touristDoc.data().profilePicture,
            role: 'tourist'
          };
        } else {
          // Try service providers collection
          const providerDoc = await getDoc(doc(db, 'serviceProviders', otherUserId));
          if (providerDoc.exists()) {
            userData = {
              id: otherUserId,
              name: providerDoc.data().fullName || otherUserName,
              photo: providerDoc.data().profilePicture,
              role: 'provider'
            };
          } else {
            userData = {
              id: otherUserId,
              name: otherUserName || 'User',
              photo: '',
              role: 'user'
            };
          }
        }
        
        setOtherUser(userData);

        // Create or get conversation
        const convId = await createOrGetConversation(
          user.uid,
          otherUserId,
          user.displayName || 'User',
          userData.name
        );
        
        setConversationId(convId);
        
        // Mark existing messages as read
        await markMessagesAsRead(convId, user.uid);
        
      } catch (error) {
        console.error('Error initializing conversation:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeConversation();
  }, [user, otherUserId, otherUserName]);

  // Load messages
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = getMessages(conversationId, (messagesData) => {
      setMessages(messagesData);
      
      // Mark new messages as read
      const unreadMessages = messagesData.filter(msg => 
        msg.senderId !== user?.uid && !msg.read
      );
      
      if (unreadMessages.length > 0 && user) {
        markMessagesAsRead(conversationId, user.uid);
      }
    });

    return () => unsubscribe();
  }, [conversationId, user]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || sending || !user) return;

    try {
      setSending(true);
      
      const messageData = {
        content: newMessage.trim(),
        senderId: user.uid,
        senderName: user.displayName || 'User',
        receiverId: otherUserId,
        timestamp: new Date()
      };

      // Send the message
      await sendMessage(conversationId, messageData);

      // Create notification for the recipient
      await createNotification({
        type: 'message',
        title: 'New Message',
        message: `You have a new message from ${user.displayName || 'a user'}`,
        recipientId: otherUserId,
        senderId: user.uid,
        senderName: user.displayName || 'User',
        relatedId: conversationId,
        conversationId: conversationId
      });

      setNewMessage('');

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (error) {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
          <span>Loading conversation...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-t-xl">
          <div className="flex items-center space-x-3">
            {otherUser?.photo ? (
              <img 
                src={otherUser.photo} 
                alt={otherUser.name}
                className="w-10 h-10 rounded-full border-2 border-white"
              />
            ) : (
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-lg">{otherUser?.name || 'User'}</h3>
              <p className="text-yellow-100 text-sm">
                {otherUser?.role === 'tourist' ? 'Tourist' : 
                 otherUser?.role === 'provider' ? 'Service Provider' : 'User'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageCircle className="h-12 w-12 mb-3 text-gray-300" />
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm">Start a conversation with {otherUser?.name || 'this user'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === user.uid ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      message.senderId === user.uid
                        ? 'bg-yellow-500 text-white rounded-br-none'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <div className={`flex items-center space-x-2 mt-1 text-xs ${
                      message.senderId === user.uid ? 'text-yellow-100' : 'text-gray-500'
                    }`}>
                      <span>{formatTime(message.timestamp)}</span>
                      {message.senderId === user.uid && (
                        <span>
                          {message.read ? <CheckCheck size={12} /> : <Check size={12} />}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
          <div className="flex space-x-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="bg-yellow-500 text-white p-3 rounded-full hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MessagePanel;