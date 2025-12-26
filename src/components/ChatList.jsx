import React, { useState, useEffect } from 'react';
import { MessageCircle, Search, X, User } from 'lucide-react';
import { getUserChats } from '../App';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../App';
import Chat from './Chat';

const ChatList = ({ user, onClose }) => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = getUserChats(user.uid, (chatsData) => {
        setChats(chatsData || []);
        setLoading(false);
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    } catch (error) {
      console.error('Error loading chats:', error);
      setChats([]);
      setLoading(false);
    }
  }, [user]);

  const getOtherParticipant = (chat) => {
    if (!chat || !chat.participantIds || !Array.isArray(chat.participantIds)) return null;
    const otherId = chat.participantIds.find(id => id !== user?.uid);
    if (!otherId) return null;
    return {
      id: otherId,
      name: chat.participantNames?.[otherId] || 'User',
      photo: chat.participantPhotos?.[otherId] || '',
      role: chat.participantRoles?.[otherId] || 'user'
    };
  };

  const formatLastMessageTime = (timestamp) => {
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
        day: 'numeric'
      });
    } catch (error) {
      return '';
    }
  };

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    const other = getOtherParticipant(chat);
    return other?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleChatSelect = async (chat) => {
    const other = getOtherParticipant(chat);
    if (other) {
      // Fetch other user's photo
      let photo = other.photo;
      if (!photo) {
        try {
          const touristDoc = await getDoc(doc(db, 'tourists', other.id));
          if (touristDoc.exists()) {
            photo = touristDoc.data().profilePicture;
          } else {
            const providerDoc = await getDoc(doc(db, 'serviceProviders', other.id));
            if (providerDoc.exists()) {
              photo = providerDoc.data().profilePicture;
            }
          }
        } catch (error) {
          console.error('Error fetching user photo:', error);
        }
      }

      setSelectedChat({
        ...other,
        photo: photo
      });
    }
  };

  if (selectedChat) {
    return (
      <Chat
        user={user}
        otherUserId={selectedChat.id}
        otherUserName={selectedChat.name}
        otherUserPhoto={selectedChat.photo}
        onClose={() => {
          setSelectedChat(null);
          // Return to chat list view
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-green-600 to-green-700 text-white">
          <div className="flex items-center space-x-3">
            <MessageCircle className="h-6 w-6" />
            <h2 className="text-xl font-semibold">Messages</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent"></div>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
              <MessageCircle className="h-16 w-16 text-gray-300 mb-4" />
              <p className="text-lg font-medium">No conversations yet</p>
              <p className="text-sm text-center mt-2">
                {searchQuery ? 'No conversations match your search' : 'Start chatting with service providers or tourists'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredChats
                .map((chat) => {
                  const other = getOtherParticipant(chat);
                  if (!other) return null; // Skip if we can't get the other participant
                  const unreadCount = chat.unreadCount?.[user?.uid] || 0;

                  return (
                    <button
                      key={chat.id}
                      onClick={() => handleChatSelect(chat)}
                      className="w-full p-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center space-x-3">
                        {other?.photo ? (
                          <img
                            src={other.photo}
                            alt={other.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-gray-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {other?.name || 'User'}
                            </h3>
                            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                              {formatLastMessageTime(chat.lastMessageTime)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600 truncate">
                              {chat.lastMessageSender === user?.uid ? 'You: ' : ''}
                              {chat.lastMessage || 'No messages yet'}
                            </p>
                            {unreadCount > 0 && (
                              <span className="ml-2 bg-green-600 text-white text-xs font-semibold rounded-full px-2 py-0.5 flex-shrink-0">
                                {unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {other?.role === 'tourist' ? 'Tourist' :
                              other?.role === 'guide' ? 'Tour Guide' :
                                other?.role === 'driver' ? 'Jeep Driver' : 'User'}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
                .filter(Boolean) // Remove null entries
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatList;
