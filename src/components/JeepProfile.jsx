import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc,
  serverTimestamp,
  setDoc,
  getDocs
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { 
  MapPin, 
  Star, 
  Phone, 
  Mail, 
  Clock, 
  Shield, 
  Award, 
  Languages, 
  Calendar,
  MessageCircle,
  ArrowLeft,
  Send,
  Check,
  CheckCheck,
  Wifi,
  WifiOff
} from "lucide-react";

// Initialize Firebase
const db = getFirestore();
const auth = getAuth();

const JeepProfile = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [onlineStatus, setOnlineStatus] = useState(false);

  // Get driver ID from URL parameters
  const searchParams = new URLSearchParams(location.search);
  const driverId = searchParams.get('driverId');
  const openChat = searchParams.get('openChat');

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check if chat should be opened
  useEffect(() => {
    if (openChat === 'true') {
      setActiveTab('chat');
    }
  }, [openChat]);

  // Get current user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // Determine user role
        try {
          const touristDoc = await getDoc(doc(db, 'tourists', user.uid));
          if (touristDoc.exists()) {
            setUserRole('tourist');
          } else {
            const providerDoc = await getDoc(doc(db, 'serviceProviders', user.uid));
            if (providerDoc.exists()) {
              setUserRole('provider');
            }
          }
        } catch (error) {
          console.error('Error getting user role:', error);
        }
      } else {
        setCurrentUser(null);
        setUserRole('');
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch driver data
  useEffect(() => {
    const fetchDriverData = async () => {
      if (!driverId) {
        setError("No driver ID provided");
        setLoading(false);
        return;
      }

      try {
        const driverDoc = await getDoc(doc(db, 'serviceProviders', driverId));
        
        if (driverDoc.exists()) {
          const driverData = driverDoc.data();
          setDriver({
            id: driverDoc.id,
            ...driverData
          });
          
          // Set online status
          setOnlineStatus(driverData.online || false);
        } else {
          setError("Driver not found");
        }
      } catch (err) {
        console.error("Error fetching driver:", err);
        setError("Failed to load driver information");
      } finally {
        setLoading(false);
      }
    };

    fetchDriverData();
  }, [driverId]);

  // Listen for real-time online status updates
  useEffect(() => {
    if (!driverId) return;

    const driverRef = doc(db, 'serviceProviders', driverId);
    const unsubscribe = onSnapshot(driverRef, (doc) => {
      if (doc.exists()) {
        const driverData = doc.data();
        setOnlineStatus(driverData.online || false);
        
        // Update driver data if needed
        setDriver(prev => prev ? { ...prev, ...driverData } : null);
      }
    });

    return () => unsubscribe();
  }, [driverId]);

  // Load messages for the conversation
  useEffect(() => {
    if (!currentUser || !driverId) return;

    const conversationId = [currentUser.uid, driverId].sort().join('_');
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messagesData);

      // Mark messages as read if they are from the driver and unread
      messagesData.forEach(async (msg) => {
        if (msg.senderId === driverId && !msg.read) {
          const messageRef = doc(db, 'conversations', conversationId, 'messages', msg.id);
          await updateDoc(messageRef, {
            read: true,
            readAt: serverTimestamp()
          });
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser, driverId]);

  // Send message function
  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!message.trim() || !currentUser || !driverId) return;

    setSending(true);
    
    try {
      const conversationId = [currentUser.uid, driverId].sort().join('_');
      
      // Create conversation document if it doesn't exist
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationDoc = await getDoc(conversationRef);
      
      if (!conversationDoc.exists()) {
        await setDoc(conversationRef, {
          participantIds: [currentUser.uid, driverId],
          participantNames: {
            [currentUser.uid]: currentUser.displayName || 'User',
            [driverId]: driver?.fullName || 'Driver'
          },
          lastMessage: message,
          lastMessageTime: serverTimestamp(),
          createdAt: serverTimestamp()
        });
      } else {
        // Update last message
        await updateDoc(conversationRef, {
          lastMessage: message,
          lastMessageTime: serverTimestamp()
        });
      }

      // Add message to subcollection
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      await addDoc(messagesRef, {
        text: message.trim(),
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        receiverId: driverId,
        receiverName: driver?.fullName || 'Driver',
        timestamp: serverTimestamp(),
        read: false
      });

      // Create notification for the driver
      if (driverId) {
        const notificationRef = collection(db, 'notifications');
        await addDoc(notificationRef, {
          type: 'message',
          title: 'New Message',
          message: `You have a new message from ${currentUser.displayName || 'a user'}`,
          recipientId: driverId,
          senderId: currentUser.uid,
          senderName: currentUser.displayName || 'User',
          relatedId: conversationId,
          read: false,
          timestamp: serverTimestamp()
        });
      }

      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    return date.toLocaleDateString();
  };

  // Render star ratings
  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
      />
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading driver profile...</p>
        </div>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Driver Not Found</h2>
          <p className="text-gray-600 mb-4">{error || "The driver you're looking for doesn't exist."}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft size={20} className="mr-2" />
                Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Driver Profile</h1>
            </div>
            
            {/* Online Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${onlineStatus ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-gray-600">
                {onlineStatus ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-8">
              {/* Profile Header */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <img
                    src={driver.profilePicture || "/api/placeholder/120/120"}
                    alt={driver.fullName}
                    className="w-32 h-32 rounded-full object-cover border-4 border-yellow-400 mx-auto mb-4"
                  />
                  <div className={`absolute bottom-4 right-4 w-4 h-4 rounded-full border-2 border-white ${
                    onlineStatus ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{driver.fullName}</h2>
                <p className="text-gray-600">{driver.serviceType}</p>
                
                {/* Rating */}
                <div className="flex items-center justify-center mt-2">
                  <div className="flex items-center">
                    {renderStars(Math.round(driver.rating || 0))}
                    <span className="ml-2 text-sm text-gray-600">
                      ({driver.rating || 0}/5)
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                {driver.contactPhone && (
                  <div className="flex items-center text-gray-600">
                    <Phone size={18} className="mr-3 text-yellow-500" />
                    <span>{driver.contactPhone}</span>
                  </div>
                )}
                
                {driver.contactEmail && (
                  <div className="flex items-center text-gray-600">
                    <Mail size={18} className="mr-3 text-yellow-500" />
                    <span>{driver.contactEmail}</span>
                  </div>
                )}
                
                {driver.location && (
                  <div className="flex items-center text-gray-600">
                    <MapPin size={18} className="mr-3 text-yellow-500" />
                    <span>{driver.location}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-3">
                {currentUser && userRole === 'tourist' && (
                  <button
                    onClick={() => setActiveTab('chat')}
                    className="w-full bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center"
                  >
                    <MessageCircle size={18} className="mr-2" />
                    Send Message
                  </button>
                )}
                
                {!currentUser && (
                  <button
                    onClick={() => navigate('/?showAuth=true')}
                    className="w-full bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors"
                  >
                    Login to Message
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border mb-6">
              <div className="border-b">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                      activeTab === 'overview'
                        ? 'border-yellow-500 text-yellow-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('services')}
                    className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                      activeTab === 'services'
                        ? 'border-yellow-500 text-yellow-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Services & Rates
                  </button>
                  {currentUser && (
                    <button
                      onClick={() => setActiveTab('chat')}
                      className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                        activeTab === 'chat'
                          ? 'border-yellow-500 text-yellow-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Messages
                      {messages.filter(msg => 
                        msg.senderId === driverId && !msg.read
                      ).length > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center inline-block">
                          {messages.filter(msg => 
                            msg.senderId === driverId && !msg.read
                          ).length}
                        </span>
                      )}
                    </button>
                  )}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Experience */}
                    <div className="flex items-start">
                      <Clock className="text-yellow-500 mt-1 mr-4" size={20} />
                      <div>
                        <h3 className="font-semibold text-gray-900">Experience</h3>
                        <p className="text-gray-600">
                          {driver.experienceYears || 0} years of experience as a {driver.serviceType}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {driver.description && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">About</h3>
                        <p className="text-gray-600 leading-relaxed">
                          {driver.description}
                        </p>
                      </div>
                    )}

                    {/* Languages */}
                    {driver.languages && driver.languages.length > 0 && (
                      <div className="flex items-start">
                        <Languages className="text-yellow-500 mt-1 mr-4" size={20} />
                        <div>
                          <h3 className="font-semibold text-gray-900">Languages</h3>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {driver.languages.map((lang, index) => (
                              <span
                                key={index}
                                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                              >
                                {lang}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Destinations */}
                    {driver.destinations && driver.destinations.length > 0 && (
                      <div className="flex items-start">
                        <MapPin className="text-yellow-500 mt-1 mr-4" size={20} />
                        <div>
                          <h3 className="font-semibold text-gray-900">Destinations Covered</h3>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {driver.destinations.map((destination, index) => (
                              <span
                                key={index}
                                className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-sm border border-yellow-200"
                              >
                                {destination}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Certifications */}
                    {driver.certifications && driver.certifications.length > 0 && (
                      <div className="flex items-start">
                        <Award className="text-yellow-500 mt-1 mr-4" size={20} />
                        <div>
                          <h3 className="font-semibold text-gray-900">Certifications</h3>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {driver.certifications.map((cert, index) => (
                              <span
                                key={index}
                                className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm border border-green-200"
                              >
                                {cert}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Special Skills */}
                    {driver.specialSkills && driver.specialSkills.length > 0 && (
                      <div className="flex items-start">
                        <Shield className="text-yellow-500 mt-1 mr-4" size={20} />
                        <div>
                          <h3 className="font-semibold text-gray-900">Special Skills</h3>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {driver.specialSkills.map((skill, index) => (
                              <span
                                key={index}
                                className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm border border-blue-200"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Services & Rates Tab */}
                {activeTab === 'services' && (
                  <div className="space-y-6">
                    {/* Vehicle Type */}
                    {driver.vehicleType && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Vehicle Type</h3>
                        <p className="text-gray-600">{driver.vehicleType}</p>
                      </div>
                    )}

                    {/* Pricing */}
                    {driver.pricePerDay && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Rates</h3>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700">Price per day:</span>
                            <span className="text-2xl font-bold text-yellow-600">
                              LKR {driver.pricePerDay.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Availability */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Availability</h3>
                      {driver.availableDates && driver.availableDates.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-gray-600">
                            Available on {driver.availableDates.length} dates
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {driver.availableDates.slice(0, 5).map((date, index) => (
                              <span
                                key={index}
                                className="bg-green-50 text-green-700 px-3 py-1 rounded text-sm border border-green-200"
                              >
                                {new Date(date).toLocaleDateString()}
                              </span>
                            ))}
                            {driver.availableDates.length > 5 && (
                              <span className="text-gray-500 text-sm">
                                +{driver.availableDates.length - 5} more dates
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-600">Contact for availability</p>
                      )}
                    </div>

                    {/* Service Description */}
                    {driver.description && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Service Details</h3>
                        <p className="text-gray-600 leading-relaxed">{driver.description}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Chat Tab */}
                {activeTab === 'chat' && (
                  <div className="h-96 flex flex-col">
                    {currentUser ? (
                      <>
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-2">
                          {messages.length === 0 ? (
                            <div className="text-center text-gray-500 mt-8">
                              <MessageCircle size={48} className="mx-auto mb-2 text-gray-300" />
                              <p>No messages yet. Start a conversation!</p>
                            </div>
                          ) : (
                            messages.map((msg) => (
                              <div
                                key={msg.id}
                                className={`flex ${
                                  msg.senderId === currentUser.uid ? 'justify-end' : 'justify-start'
                                }`}
                              >
                                <div
                                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                    msg.senderId === currentUser.uid
                                      ? 'bg-yellow-500 text-white'
                                      : 'bg-gray-200 text-gray-800'
                                  }`}
                                >
                                  <p className="text-sm">{msg.text}</p>
                                  <div className={`text-xs mt-1 flex items-center ${
                                    msg.senderId === currentUser.uid 
                                      ? 'text-yellow-100' 
                                      : 'text-gray-500'
                                  }`}>
                                    {formatTime(msg.timestamp)}
                                    {msg.senderId === currentUser.uid && (
                                      <span className="ml-1">
                                        {msg.read ? <CheckCheck size={12} /> : <Check size={12} />}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                          <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <form onSubmit={sendMessage} className="flex space-x-2">
                          <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            disabled={sending}
                          />
                          <button
                            type="submit"
                            disabled={sending || !message.trim()}
                            className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {sending ? (
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Send size={18} />
                            )}
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Login to Message
                        </h3>
                        <p className="text-gray-600 mb-4">
                          Please login to start a conversation with {driver.fullName}
                        </p>
                        <button
                          onClick={() => navigate('/?showAuth=true')}
                          className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
                        >
                          Login Now
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JeepProfile;