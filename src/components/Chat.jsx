import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  User,
  MessageCircle,
  Check,
  CheckCheck,
  Search,
  MoreVertical,
  Image as ImageIcon,
  Paperclip,
  Smile
} from 'lucide-react';
import {
  getChatMessages,
  sendChatMessage,
  createOrGetChat,
  markChatMessagesAsRead,
  createNotification,
  getUserChats
} from '../App';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../App';

const Chat = ({ user, otherUserId, otherUserName, otherUserPhoto, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatId, setChatId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat and load user data
  useEffect(() => {
    if (!user || !otherUserId) {
      console.warn('Chat initialization skipped: missing user or otherUserId', { user: !!user, otherUserId });
      return;
    }

    const initializeChat = async () => {
      try {
        setLoading(true);
        console.log('Initializing chat between:', user.uid, 'and', otherUserId);

        // Get other user data
        let userData = null;

        try {
          // Try tourists collection
          const touristDoc = await getDoc(doc(db, 'tourists', otherUserId));
          if (touristDoc.exists()) {
            userData = {
              id: otherUserId,
              name: touristDoc.data().fullName || otherUserName,
              photo: touristDoc.data().profilePicture || otherUserPhoto,
              role: 'tourist'
            };
          } else {
            // Try service providers collection
            const providerDoc = await getDoc(doc(db, 'serviceProviders', otherUserId));
            if (providerDoc.exists()) {
              userData = {
                id: otherUserId,
                name: providerDoc.data().fullName || otherUserName,
                photo: providerDoc.data().profilePicture || otherUserPhoto,
                role: providerDoc.data().serviceType === 'Tour Guide' ? 'guide' : 'driver'
              };
            } else {
              userData = {
                id: otherUserId,
                name: otherUserName || 'User',
                photo: otherUserPhoto || '',
                role: 'user'
              };
            }
          }
        } catch (userDataError) {
          console.warn('Error fetching user data, using defaults:', userDataError);
          userData = {
            id: otherUserId,
            name: otherUserName || 'User',
            photo: otherUserPhoto || '',
            role: 'user'
          };
        }

        setOtherUser(userData);

        // Create or get chat
        console.log('Creating/getting chat...');
        const chatIdValue = await createOrGetChat(
          user.uid,
          otherUserId,
          user.displayName || user.email || 'User',
          userData.name
        );

        if (!chatIdValue) {
          throw new Error('Failed to create or get chat - chatId is null');
        }

        console.log('Chat ID obtained:', chatIdValue);
        setChatId(chatIdValue);

        // Mark existing messages as read (don't block on this)
        try {
          await markChatMessagesAsRead(chatIdValue, user.uid);
        } catch (readError) {
          console.warn('Error marking messages as read (non-critical):', readError);
        }

      } catch (error) {
        console.error('Error initializing chat:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          stack: error.stack
        });
        alert(`Failed to initialize chat: ${error.message || 'Unknown error'}. Please refresh and try again.`);
      } finally {
        setLoading(false);
      }
    };

    initializeChat();
  }, [user, otherUserId, otherUserName, otherUserPhoto]);

  // Load messages
  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = getChatMessages(chatId, (messagesData) => {
      setMessages(messagesData);

      // Mark new messages as read
      const unreadMessages = messagesData.filter(msg =>
        msg.senderId !== user?.uid && !msg.read
      );

      if (unreadMessages.length > 0 && user) {
        markChatMessagesAsRead(chatId, user.uid);
      }
    });

    return () => unsubscribe();
  }, [chatId, user]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !user || !otherUserId) {
      if (!chatId) {
        alert('Chat is not ready yet. Please wait a moment and try again.');
      }
      return;
    }

    try {
      setSending(true);

      // Ensure chat exists before sending
      let currentChatId = chatId;
      if (!currentChatId) {
        console.log('Chat ID missing, creating chat...');
        currentChatId = await createOrGetChat(
          user.uid,
          otherUserId,
          user.displayName || user.email || 'User',
          otherUser?.name || otherUserName || 'User'
        );
        setChatId(currentChatId);
      }

      const messageData = {
        content: newMessage.trim(),
        senderId: user.uid,
        senderName: user.displayName || user.email || 'User',
        receiverId: otherUserId,
        timestamp: new Date()
      };

      console.log('Sending message to chat:', currentChatId, messageData);

      // Send the message (notification is created inside sendChatMessage)
      await sendChatMessage(currentChatId, messageData);

      setNewMessage('');
      inputRef.current?.focus();

    } catch (error) {
      console.error('Error sending message:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      alert(`Failed to send message: ${error.message || 'Unknown error'}. Please check the console for details.`);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '';
    }
  };

  const formatMessageTime = (timestamp) => {
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
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center space-y-4 shadow-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
          <span className="text-gray-700 font-medium">Loading conversation...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-green-600 to-green-700 text-white">
          <div className="flex items-center space-x-3">
            {otherUser?.photo ? (
              <img
                src={otherUser.photo}
                alt={otherUser.name}
                className="w-12 h-12 rounded-full border-2 border-white shadow-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center border-2 border-white">
                <User className="h-6 w-6" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-lg">{otherUser?.name || 'User'}</h3>
              <p className="text-green-100 text-sm">
                {otherUser?.role === 'tourist' ? 'Tourist' :
                  otherUser?.role === 'guide' ? 'Tour Guide' :
                    otherUser?.role === 'driver' ? 'Jeep Driver' : 'User'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <div className="bg-green-100 rounded-full p-6 mb-4">
                <MessageCircle className="h-16 w-16 text-green-600" />
              </div>
              <p className="text-xl font-semibold text-gray-700 mb-2">No messages yet</p>
              <p className="text-sm text-gray-500">Start a conversation with {otherUser?.name || 'this user'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => {
                const isOwnMessage = message.senderId === user.uid;
                const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;
                const showTime = index === messages.length - 1 ||
                  (messages[index + 1] &&
                    new Date(messages[index + 1].timestampValue || messages[index + 1].timestamp) -
                    new Date(message.timestampValue || message.timestamp) > 300000); // 5 minutes

                return (
                  <div
                    key={message.id}
                    className={`flex items-end space-x-2 ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}
                  >
                    {!isOwnMessage && showAvatar && (
                      <div className="flex-shrink-0">
                        {otherUser?.photo ? (
                          <img
                            src={otherUser.photo}
                            alt={otherUser.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-600" />
                          </div>
                        )}
                      </div>
                    )}
                    {isOwnMessage && !showAvatar && <div className="w-8"></div>}

                    <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[70%]`}>
                      <div
                        className={`px-4 py-3 rounded-2xl shadow-sm ${isOwnMessage
                            ? 'bg-green-600 text-white rounded-br-md'
                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                          }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <div className={`flex items-center space-x-2 mt-1.5 text-xs ${isOwnMessage ? 'text-green-100' : 'text-gray-500'
                          }`}>
                          <span>{formatMessageTime(message.timestamp)}</span>
                          {isOwnMessage && (
                            <span className="flex items-center">
                              {message.read ? (
                                <CheckCheck size={14} className="text-green-100" />
                              ) : (
                                <Check size={14} className="text-green-100" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      {showTime && (
                        <span className={`text-xs mt-1 px-2 ${isOwnMessage ? 'text-gray-500' : 'text-gray-400'}`}>
                          {formatTime(message.timestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-end space-x-3">
            <button
              type="button"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              title="Attach file"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              title="Add image"
            >
              <ImageIcon className="h-5 w-5" />
            </button>
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                disabled={sending}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700 rounded-full transition-colors"
                title="Emoji"
              >
                <Smile className="h-5 w-5" />
              </button>
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="bg-green-600 text-white p-3 rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
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

export default Chat;
