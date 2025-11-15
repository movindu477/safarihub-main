import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  User, 
  Clock,
  MessageCircle
} from 'lucide-react';
import { db, getMessages, sendMessage } from '../App';
import { doc, getDoc } from 'firebase/firestore';

const MessagePanel = ({ user, conversationId, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversation, setConversation] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation and messages
  useEffect(() => {
    if (!conversationId || !user) return;

    const loadConversationData = async () => {
      try {
        setLoading(true);
        
        // Get conversation data
        const conversationDoc = await getDoc(doc(db, 'conversations', conversationId));
        if (conversationDoc.exists()) {
          const conversationData = conversationDoc.data();
          setConversation(conversationData);

          // Find other participant
          const otherParticipantId = conversationData.participants.find(id => id !== user.uid);
          if (otherParticipantId) {
            // Try to get user data from tourists collection
            const touristDoc = await getDoc(doc(db, 'tourists', otherParticipantId));
            if (touristDoc.exists()) {
              setOtherUser({
                id: otherParticipantId,
                name: touristDoc.data().fullName,
                photo: touristDoc.data().profilePicture,
                role: 'tourist'
              });
            } else {
              // Try service providers collection
              const providerDoc = await getDoc(doc(db, 'serviceProviders', otherParticipantId));
              if (providerDoc.exists()) {
                setOtherUser({
                  id: otherParticipantId,
                  name: providerDoc.data().fullName,
                  photo: providerDoc.data().profilePicture,
                  role: 'provider'
                });
              } else {
                setOtherUser({
                  id: otherParticipantId,
                  name: 'User',
                  photo: '',
                  role: 'user'
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConversationData();

    // Subscribe to messages
    const unsubscribe = getMessages(conversationId, (messages) => {
      setMessages(messages);
    });

    return () => unsubscribe();
  }, [conversationId, user]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || sending) return;

    try {
      setSending(true);
      
      const messageData = {
        content: newMessage.trim(),
        senderId: user.uid,
        senderName: user.displayName || 'User',
        senderPhoto: user.photoURL || '',
        timestamp: new Date()
      };

      await sendMessage(conversationId, messageData);
      setNewMessage('');

    } catch (error) {
      console.error('Error sending message:', error);
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
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
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
                    <div className={`flex items-center space-x-1 mt-1 text-xs ${
                      message.senderId === user.uid ? 'text-yellow-100' : 'text-gray-500'
                    }`}>
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(message.timestamp)}</span>
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