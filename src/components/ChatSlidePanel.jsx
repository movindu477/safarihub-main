import React, { useState, useEffect, useRef } from 'react';

const ChatSlidePanel = ({ user, activeChat, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // Simulate sending message
    const tempMessage = {
      id: Date.now().toString(),
      content: newMessage,
      senderId: user.uid,
      senderName: user.displayName || 'You',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-50 border-l border-gray-200">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-amber-500 text-white p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Chat with {activeChat?.otherUserName}</h3>
              <p className="text-amber-100 text-sm">Online</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-amber-200"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.senderId === user.uid ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.senderId === user.uid
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatSlidePanel;