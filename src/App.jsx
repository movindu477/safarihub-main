import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  setDoc,
  doc,
  serverTimestamp,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  getDocs,
} from "firebase/firestore";
import {
  getStorage,
  ref as sRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { Eye, EyeOff, Mail, Lock, User, MapPin, Phone, Globe, Camera, ChevronLeft, Bell, X, Send, Check, CheckCheck, MessageCircle } from "lucide-react";

// Import images from src/assets
import logo from "./assets/logo.png";

// Import components
import Navbar from "./components/Navbar";
import Section1 from "./components/Section1";
import Section2 from "./components/Section2";
import Section3 from "./components/Section3";
import Section4 from "./components/Section4";
import Section5 from "./components/Section5";
import Footer from "./components/Footer";
import JeepDriversPage from "./components/JeepMain";
import JeepProfile from "./components/JeepProfile";
import NotificationPanel from "./components/NotificationPanel";

// 🔥 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAXjQQ9BYX4upBJx_Ko5jTUq9nTCIDItSA",
  authDomain: "safarihub-a80bd.firebaseapp.com",
  projectId: "safarihub-a80bd",
  storageBucket: "safarihub-a80bd.firebasestorage.app",
  messagingSenderId: "212343673085",
  appId: "1:212343673085:web:708338fc194fbea7f5ee94",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ==================== FIREBASE FUNCTIONS ====================

// User Status Management
export const setUserOnline = async (userId, userRole, userData) => {
  try {
    const userRef = doc(db, userRole === 'tourist' ? 'tourists' : 'serviceProviders', userId);
    await updateDoc(userRef, {
      online: true,
      lastSeen: serverTimestamp(),
      ...userData
    });
    console.log(`✅ User ${userId} set online as ${userRole}`);
  } catch (error) {
    console.error('Error setting user online:', error);
  }
};

export const setUserOffline = async (userId) => {
  try {
    const touristDoc = await getDoc(doc(db, 'tourists', userId));
    if (touristDoc.exists()) {
      await updateDoc(doc(db, 'tourists', userId), {
        online: false,
        lastSeen: serverTimestamp()
      });
    } else {
      const providerDoc = await getDoc(doc(db, 'serviceProviders', userId));
      if (providerDoc.exists()) {
        await updateDoc(doc(db, 'serviceProviders', userId), {
          online: false,
          lastSeen: serverTimestamp()
        });
      }
    }
    console.log(`✅ User ${userId} set offline`);
  } catch (error) {
    console.error('Error setting user offline:', error);
  }
};

// Conversation Management
export const createOrGetConversation = async (user1Id, user2Id, user1Name, user2Name) => {
  try {
    const conversationId = [user1Id, user2Id].sort().join('_');
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);

    if (!conversationDoc.exists()) {
      await setDoc(conversationRef, {
        participantIds: [user1Id, user2Id],
        participantNames: {
          [user1Id]: user1Name,
          [user2Id]: user2Name
        },
        lastMessage: '',
        lastMessageTime: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    return conversationId;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

export const getConversationById = async (conversationId) => {
  try {
    const conversationDoc = await getDoc(doc(db, 'conversations', conversationId));
    if (conversationDoc.exists()) {
      return {
        id: conversationDoc.id,
        ...conversationDoc.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting conversation:', error);
    return null;
  }
};

export const getOtherParticipant = (conversation, currentUserId) => {
  if (!conversation || !conversation.participantIds) return null;
  
  const otherParticipantId = conversation.participantIds.find(id => id !== currentUserId);
  return {
    id: otherParticipantId,
    name: conversation.participantNames?.[otherParticipantId] || 'User'
  };
};

export const getUserConversations = (userId, callback) => {
  try {
    const conversationsRef = collection(db, 'conversations');
    const userConversationsQuery = query(
      conversationsRef,
      where('participantIds', 'array-contains', userId),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribe = onSnapshot(userConversationsQuery, (snapshot) => {
      const conversations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(conversations);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error getting conversations:', error);
    callback([]);
    return () => {};
  }
};

// Message Management
export const getMessages = (conversationId, callback) => {
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(messages);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error getting messages:', error);
    callback([]);
    return () => {};
  }
};

export const sendMessage = async (conversationId, messageData) => {
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messageDoc = await addDoc(messagesRef, {
      ...messageData,
      timestamp: serverTimestamp(),
      read: false
    });

    // Update conversation last message
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      lastMessage: messageData.content,
      lastMessageTime: serverTimestamp(),
      lastMessageSender: messageData.senderId,
      updatedAt: serverTimestamp()
    });

    return messageDoc.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const markMessagesAsRead = async (conversationId, userId) => {
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const unreadMessagesQuery = query(
      messagesRef,
      where('senderId', '!=', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(unreadMessagesQuery);
    const updatePromises = snapshot.docs.map(doc =>
      updateDoc(doc.ref, {
        read: true,
        readAt: serverTimestamp()
      })
    );

    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
};

// Notification Management
export const getUserNotifications = (userId, callback) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const notificationsQuery = query(
      notificationsRef,
      where('recipientId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(notifications);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error getting notifications:', error);
    callback([]);
    return () => {};
  }
};

export const createNotification = async (notificationData) => {
  try {
    const notificationRef = collection(db, 'notifications');
    const notificationDoc = await addDoc(notificationRef, {
      ...notificationData,
      read: false,
      timestamp: serverTimestamp()
    });
    return notificationDoc.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true,
      readAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

// Chat Modal Component
const ChatModal = ({ 
  isOpen, 
  onClose, 
  conversationId, 
  otherUser, 
  currentUser 
}) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = React.useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!conversationId || !isOpen) return;

    const unsubscribe = getMessages(conversationId, (messagesData) => {
      setMessages(messagesData);
      
      // Mark messages as read
      if (currentUser) {
        markMessagesAsRead(conversationId, currentUser.uid);
      }
    });

    return () => unsubscribe();
  }, [conversationId, isOpen, currentUser]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !conversationId || sending || !currentUser) return;

    try {
      setSending(true);
      
      const messageData = {
        content: message.trim(),
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        receiverId: otherUser?.id,
        timestamp: new Date()
      };

      await sendMessage(conversationId, messageData);

      // Create notification for the recipient
      await createNotification({
        type: 'message',
        title: 'New Message',
        message: `You have a new message from ${currentUser.displayName || 'a user'}`,
        recipientId: otherUser?.id,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        conversationId: conversationId
      });

      setMessage('');

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{otherUser?.name || 'User'}</h3>
              <p className="text-yellow-100 text-sm">Online</p>
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
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      msg.senderId === currentUser?.uid
                        ? 'bg-yellow-500 text-white rounded-br-none'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <div className={`flex items-center space-x-2 mt-1 text-xs ${
                      msg.senderId === currentUser?.uid ? 'text-yellow-100' : 'text-gray-500'
                    }`}>
                      <span>{formatTime(msg.timestamp)}</span>
                      {msg.senderId === currentUser?.uid && (
                        <span>
                          {msg.read ? <CheckCheck size={12} /> : <Check size={12} />}
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
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!message.trim() || sending}
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

// Phone number formatting utility
const formatPhoneNumber = (phone) => {
  if (!phone) return "";
  
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('94')) {
    return `+${cleaned}`;
  }
  
  if (cleaned.startsWith('0')) {
    return `+94${cleaned.substring(1)}`;
  }
  
  if (!cleaned.startsWith('+')) {
    return `+94${cleaned}`;
  }
  
  return phone;
};

// Phone number validation
const isValidSriLankanPhone = (phone) => {
  if (!phone) return false;
  
  const formatted = formatPhoneNumber(phone);
  const sriLankanRegex = /^\+94[0-9]{9}$/;
  return sriLankanRegex.test(formatted);
};

// Authentication Component
function Authentication({ onAuthSuccess }) {
  const [screen, setScreen] = useState("login");
  const [role, setRole] = useState(null);
  const [msg, setMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  // Common Fields
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("");
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);

  // Provider fields
  const [locationBase, setLocationBase] = useState("");
  const [experience, setExperience] = useState("");
  const [languagesSpoken, setLanguagesSpoken] = useState("");
  const [serviceType, setServiceType] = useState("Jeep Driver");
  const [vehicleType, setVehicleType] = useState("");
  const [pricePerDay, setPricePerDay] = useState("");
  const [destinations, setDestinations] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [specialSkills, setSpecialSkills] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [description, setDescription] = useState("");
  const [availableDates, setAvailableDates] = useState([]);

  // Handle phone number input with formatting
  const handlePhoneChange = (value) => {
    const cleaned = value.replace(/[^\d+]/g, '');
    setPhone(cleaned);
  };

  // Reset form function
  const resetForm = () => {
    setEmail("");
    setFullName("");
    setPassword("");
    setConfirm("");
    setCountry("");
    setPhone("");
    setLanguage("");
    setProfileFile(null);
    setProfilePreview(null);
    setLocationBase("");
    setExperience("");
    setLanguagesSpoken("");
    setServiceType("Jeep Driver");
    setVehicleType("");
    setPricePerDay("");
    setDestinations([]);
    setLanguages([]);
    setSpecialSkills([]);
    setCertifications([]);
    setDescription("");
    setAvailableDates([]);
    setMsg("");
    setBusy(false);
  };

  // Handle profile image selection
  const handleProfileImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMsg("❌ Image size should be less than 2MB");
        return;
      }
      setProfileFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setProfilePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Handle date selection for calendar
  const handleDateSelect = (date) => {
    const dateString = date.toISOString().split('T')[0];
    setAvailableDates(prev => {
      if (prev.includes(dateString)) {
        return prev.filter(d => d !== dateString);
      } else {
        return [...prev, dateString];
      }
    });
  };

  // Enhanced Register Function
  const handleRegister = async (e) => {
    e.preventDefault();
    
    console.log("🔄 Starting registration process...");
    
    // Phone validation for service providers
    if (role === 'provider' && phone && !isValidSriLankanPhone(phone)) {
      setMsg("❌ Please enter a valid Sri Lankan phone number (e.g., +94701234567)");
      return;
    }
    
    if (password !== confirm) {
      setMsg("❌ Passwords do not match!");
      return;
    }
    if (password.length < 6) {
      setMsg("❌ Password must be at least 6 characters!");
      return;
    }
    
    setBusy(true);
    setMsg("⏳ Creating your account...");
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      
      console.log("✅ User created with UID:", uid);
      
      // Format phone number for storage
      const formattedPhone = phone ? formatPhoneNumber(phone) : "";

      let userData = {
        uid,
        email,
        fullName: fullName.trim(),
        phone: formattedPhone,
        profilePicture: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        role: role,
      };

      let collectionName = "";
      
      if (role === "tourist") {
        collectionName = "tourists";
        userData = {
          ...userData,
          country: country?.trim() || "",
          preferredLanguage: language || "english",
          bookings: [],
          favorites: [],
        };
      } else {
        collectionName = "serviceProviders";
        userData = {
          ...userData,
          location: locationBase?.trim() || "",
          experienceYears: parseInt(experience) || 0,
          serviceType: serviceType || "Jeep Driver",
          vehicleType: vehicleType || "",
          pricePerDay: parseInt(pricePerDay) || 0,
          rating: 0,
          totalRatings: 0,
          destinations: destinations || [],
          languages: languages || [],
          specialSkills: specialSkills || [],
          certifications: certifications || [],
          availableDates: availableDates || [],
          availability: availableDates.length > 0,
          description: description?.trim() || "",
          featured: false,
          contactEmail: email,
          contactPhone: formattedPhone,
        };
      }

      await setDoc(doc(db, collectionName, uid), userData);
      console.log("✅ User data saved to Firestore successfully!");

      // Handle profile picture upload
      let photoURL = null;
      if (profileFile) {
        try {
          console.log("📸 Uploading profile picture...");
          const ext = profileFile.name.split(".").pop();
          const storageRef = sRef(storage, `profile-pictures/${role === 'tourist' ? 'tourists' : 'service-providers'}/${uid}.${ext}`);
          const snap = await uploadBytes(storageRef, profileFile);
          photoURL = await getDownloadURL(snap.ref);
          
          await setDoc(doc(db, collectionName, uid), {
            profilePicture: photoURL,
            updatedAt: serverTimestamp(),
          }, { merge: true });
          
          await updateProfile(userCredential.user, { 
            displayName: fullName, 
            photoURL: photoURL 
          });
          
        } catch (uploadError) {
          console.error("❌ Profile image upload failed:", uploadError);
        }
      } else {
        await updateProfile(userCredential.user, { 
          displayName: fullName 
        });
      }

      setMsg("🎉 Account created successfully! Redirecting to login...");
      setBusy(false);
      
      setTimeout(() => {
        signOut(auth);
        setScreen("login");
        resetForm();
      }, 1500);
      
    } catch (error) {
      console.error("❌ Registration error:", error);
      let errorMessage = "❌ Registration failed! ";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage += "Email is already registered.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage += "Invalid email address.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage += "Password is too weak.";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage += "Network error. Please check your connection.";
      } else {
        errorMessage += `Error: ${error.message}`;
      }
      
      setMsg(errorMessage);
      setBusy(false);
    }
  };

  // Login Function
  const handleLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setMsg("✅ Welcome back! Redirecting...");
      setTimeout(() => {
        onAuthSuccess();
      }, 1000);
    } catch (error) {
      let errorMessage = "❌ Login failed! ";
      
      if (error.code === 'auth/invalid-credential') {
        errorMessage += "Invalid email or password.";
      } else if (error.code === 'auth/user-not-found') {
        errorMessage += "No account found with this email.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage += "Incorrect password.";
      } else {
        errorMessage += "Please try again.";
      }
      
      setMsg(errorMessage);
    } finally {
      setBusy(false);
    }
  };

  // Reset form when changing screens
  useEffect(() => {
    if (screen === "login" || screen === "register") {
      resetForm();
    }
  }, [screen]);

  // ✅ Login Page
  if (screen === "login")
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <img
                src={logo}
                alt="SafariHub Logo"
                className="h-16 w-auto object-contain mx-auto mb-4"
              />
              <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
              <p className="text-gray-300 mt-2">Sign in to continue your adventure</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-white font-medium text-sm">
                  <Mail className="h-4 w-4 text-yellow-400" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-sm"
                  placeholder="Enter your email"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-white font-medium text-sm">
                  <Lock className="h-4 w-4 text-yellow-400" />
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-sm pr-12"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-400"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {busy ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Signing In...
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>

              <div className="text-center pt-4 border-t border-white/10">
                <p className="text-gray-300 text-sm">
                  New to site?{" "}
                  <button
                    type="button"
                    onClick={() => setScreen("register")}
                    className="text-yellow-400 hover:text-yellow-300 font-semibold underline"
                  >
                    REGISTER
                  </button>
                </p>
              </div>
            </form>

            {msg && (
              <div className={`mt-4 p-3 rounded-xl text-center text-sm font-medium ${
                msg.includes("❌") 
                  ? "bg-red-500/20 text-red-300 border border-red-500/30" 
                  : "bg-green-500/20 text-green-300 border border-green-500/30"
              }`}>
                {msg}
              </div>
            )}
          </div>
        </div>
      </div>
    );

  // ✅ Register Page
  if (screen === "register")
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-4">
        <div className="relative w-full max-w-2xl">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => {
                if (role) {
                  setRole(null);
                  resetForm();
                } else {
                  setScreen("login");
                }
              }}
              className="text-yellow-400 hover:text-yellow-300 font-semibold flex items-center gap-2 text-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to {role ? 'Selection' : 'Login'}
            </button>
          </div>

          {!role ? (
            <UserTypeSelection onSelect={setRole} logo={logo} />
          ) : (
            <RegistrationForm 
              role={role}
              formData={{ 
                email, fullName, password, confirm, country, phone, language,
                locationBase, experience, languagesSpoken, serviceType,
                vehicleType, pricePerDay, destinations, languages, 
                specialSkills, certifications, description,
                availableDates
              }}
              handlers={{ 
                setEmail, setFullName, setPassword, setConfirm, setCountry, setPhone: handlePhoneChange, setLanguage,
                setLocationBase, setExperience, setLanguagesSpoken, setServiceType,
                setVehicleType, setPricePerDay, setDestinations, setLanguages,
                setSpecialSkills, setCertifications, setDescription,
                setAvailableDates,
                handleDateSelect
              }}
              profilePreview={profilePreview}
              onProfileImageSelect={handleProfileImageSelect}
              onSubmit={handleRegister}
              busy={busy}
              msg={msg}
            />
          )}
        </div>
      </div>
    );

  return null;
}

// User Type Selection Component
const UserTypeSelection = ({ onSelect, logo }) => (
  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">
    <div className="text-center mb-6">
      <img
        src={logo}
        alt="SafariHub Logo"
        className="h-12 w-auto object-contain mx-auto mb-4"
      />
      <h2 className="text-xl font-bold text-white">Join SafariHub</h2>
      <p className="text-gray-300 text-sm mt-1">Choose your adventure type</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button
        onClick={() => onSelect('tourist')}
        className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-yellow-400 rounded-xl p-4 text-center transition-all duration-200"
      >
        <div className="w-12 h-12 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-xl">🧳</span>
        </div>
        <h3 className="text-lg font-bold text-white mb-1">Tourist</h3>
        <p className="text-gray-300 text-xs">
          Explore amazing destinations
        </p>
      </button>

      <button
        onClick={() => onSelect('provider')}
        className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-yellow-400 rounded-xl p-4 text-center transition-all duration-200"
      >
        <div className="w-12 h-12 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-xl">🚙</span>
        </div>
        <h3 className="text-lg font-bold text-white mb-1">Service Provider</h3>
        <p className="text-gray-300 text-xs">
          Offer your services
        </p>
      </button>
    </div>
  </div>
);

// Enhanced RegistrationForm Component
const RegistrationForm = ({ role, formData, handlers, profilePreview, onProfileImageSelect, onSubmit, busy, msg }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isTourist = role === 'tourist';

  const serviceTypes = [
    "Jeep Driver",
    "Tour Guide", 
    "Renting"
  ];

  const vehicleTypes = [
    "Standard Safari Jeep",
    "Luxury Safari Jeep", 
    "Open Roof Jeep",
    "4x4 Modified Jeep"
  ];

  const destinations = [
    "Yala National Park",
    "Wilpattu National Park",
    "Udawalawe National Park",
    "Minneriya National Park",
    "Horton Plains",
    "Sinharaja Forest"
  ];

  const languages = [
    "English", "Sinhala", "Tamil", "Hindi",
    "French", "German", "Chinese", "Japanese"
  ];

  const specialSkills = [
    "Wildlife photography knowledge",
    "Birdwatching expertise", 
    "Family-friendly tours",
    "Private tours",
    "Full-day safari",
    "Half-day safari"
  ];

  const certifications = [
    "Wildlife Department Certified",
    "Tourism Board Licensed",
    "First Aid Certified",
    "Eco Tourism Certified"
  ];

  // Phone input helper text
  const getPhoneHelperText = () => {
    if (!formData.phone) return "Enter your Sri Lankan phone number";
    
    const formatted = formData.phone.startsWith('+') ? formData.phone : `+94${formData.phone.replace(/^0/, '')}`;
    const isValid = /^\+94[0-9]{9}$/.test(formatted);
    
    if (isValid) {
      return "✓ Valid Sri Lankan number";
    } else {
      return "Enter a valid Sri Lankan number (e.g., +94701234567)";
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl max-h-[80vh] overflow-y-auto">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-white">
          {isTourist ? 'Tourist Registration' : 'Service Provider Registration'}
        </h2>
        <p className="text-gray-300 text-xs mt-1">
          {isTourist ? 'Create your adventure account' : 'Join our network of service providers'}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-white font-medium text-xs">
              <User className="h-3 w-3 text-yellow-400" />
              Full Name *
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => handlers.setFullName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
              placeholder="Enter your full name"
            />
          </div>

          <div className="space-y-1">
            <label className="flex items-center gap-2 text-white font-medium text-xs">
              <Mail className="h-3 w-3 text-yellow-400" />
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handlers.setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
              placeholder="Enter your email"
            />
          </div>
        </div>

        {/* Password Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-white font-medium text-xs">
              <Lock className="h-3 w-3 text-yellow-400" />
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => handlers.setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs pr-8"
                placeholder="Create password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-400"
              >
                {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="flex items-center gap-2 text-white font-medium text-xs">
              <Lock className="h-3 w-3 text-yellow-400" />
              Confirm Password *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirm}
                onChange={(e) => handlers.setConfirm(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs pr-8"
                placeholder="Confirm password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-400"
              >
                {showConfirmPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-white font-medium text-xs">
              <Phone className="h-3 w-3 text-yellow-400" />
              Phone Number {!isTourist && <span className="text-red-400">*</span>}
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handlers.setPhone(e.target.value)}
              required={!isTourist}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
              placeholder="+94701234567"
            />
            <p className="text-xs text-gray-400 mt-1">
              {getPhoneHelperText()}
            </p>
          </div>

          <div className="space-y-1">
            <label className="flex items-center gap-2 text-white font-medium text-xs">
              <MapPin className="h-3 w-3 text-yellow-400" />
              {isTourist ? 'Country' : 'Base Location'} *
            </label>
            <input
              type="text"
              value={isTourist ? formData.country : formData.locationBase}
              onChange={(e) => isTourist ? handlers.setCountry(e.target.value) : handlers.setLocationBase(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
              placeholder={isTourist ? 'Your country' : 'Your base city/location'}
            />
          </div>
        </div>

        {/* Tourist Specific Fields */}
        {isTourist && (
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-white font-medium text-xs">
              <Globe className="h-3 w-3 text-yellow-400" />
              Preferred Language
            </label>
            <select
              value={formData.language}
              onChange={(e) => handlers.setLanguage(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-400 text-xs"
            >
              <option value="english">English</option>
              <option value="sinhala">Sinhala</option>
              <option value="tamil">Tamil</option>
              <option value="hindi">Hindi</option>
              <option value="other">Other</option>
            </select>
          </div>
        )}

        {/* Service Provider Specific Fields */}
        {!isTourist && (
          <>
            {/* Service Type and Vehicle Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-white font-medium text-xs">
                  <User className="h-3 w-3 text-yellow-400" />
                  Service Type *
                </label>
                <select
                  value={formData.serviceType}
                  onChange={(e) => handlers.setServiceType(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-400 text-xs"
                >
                  <option value="">Select Service Type</option>
                  {serviceTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Vehicle Type (only show for Jeep Driver) */}
              {formData.serviceType === "Jeep Driver" && (
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-white font-medium text-xs">
                    🚙 Vehicle Type
                  </label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => handlers.setVehicleType(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-400 text-xs"
                  >
                    <option value="">Select Vehicle Type</option>
                    {vehicleTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Experience and Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-white font-medium text-xs">
                  📅 Experience (Years) *
                </label>
                <input
                  type="number"
                  value={formData.experience}
                  onChange={(e) => handlers.setExperience(e.target.value)}
                  required
                  min="0"
                  max="50"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                  placeholder="Years of experience"
                />
              </div>

              {/* Price per Day (for Jeep Drivers and Tour Guides) */}
              {(formData.serviceType === "Jeep Driver" || formData.serviceType === "Tour Guide") && (
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-white font-medium text-xs">
                    💰 Price per Day (LKR)
                  </label>
                  <input
                    type="number"
                    value={formData.pricePerDay}
                    onChange={(e) => handlers.setPricePerDay(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                    placeholder="e.g., 12000"
                  />
                </div>
              )}
            </div>

            {/* Destinations (Multi-select) */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-white font-medium text-xs">
                🗺️ Destinations Covered
              </label>
              <div className="max-h-24 overflow-y-auto border border-white/10 rounded-lg p-2 bg-white/5">
                {destinations.map(destination => (
                  <div key={destination} className="flex items-center mb-1">
                    <input
                      type="checkbox"
                      id={`dest-${destination}`}
                      checked={formData.destinations?.includes(destination) || false}
                      onChange={(e) => {
                        const updatedDestinations = formData.destinations || [];
                        if (e.target.checked) {
                          handlers.setDestinations([...updatedDestinations, destination]);
                        } else {
                          handlers.setDestinations(updatedDestinations.filter(d => d !== destination));
                        }
                      }}
                      className="mr-2 h-3 w-3 text-yellow-400 focus:ring-yellow-400 border-gray-300 rounded"
                    />
                    <label htmlFor={`dest-${destination}`} className="text-white text-xs">
                      {destination}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Languages Spoken (Multi-select) */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-white font-medium text-xs">
                🌐 Languages Spoken
              </label>
              <div className="max-h-24 overflow-y-auto border border-white/10 rounded-lg p-2 bg-white/5">
                {languages.map(language => (
                  <div key={language} className="flex items-center mb-1">
                    <input
                      type="checkbox"
                      id={`lang-${language}`}
                      checked={formData.languages?.includes(language) || false}
                      onChange={(e) => {
                        const updatedLanguages = formData.languages || [];
                        if (e.target.checked) {
                          handlers.setLanguages([...updatedLanguages, language]);
                        } else {
                          handlers.setLanguages(updatedLanguages.filter(l => l !== language));
                        }
                      }}
                      className="mr-2 h-3 w-3 text-yellow-400 focus:ring-yellow-400 border-gray-300 rounded"
                    />
                    <label htmlFor={`lang-${language}`} className="text-white text-xs">
                      {language}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-white font-medium text-xs">
                📝 Service Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handlers.setDescription(e.target.value)}
                rows="2"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                placeholder="Describe your services, expertise, and what makes you unique..."
              />
            </div>
          </>
        )}

        {/* Profile Picture */}
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-white font-medium text-xs">
            <Camera className="h-3 w-3 text-yellow-400" />
            Profile Picture (Optional)
          </label>
          <div className="flex items-center gap-2">
            {profilePreview && (
              <img src={profilePreview} alt="Profile preview" className="w-8 h-8 rounded-full object-cover border border-yellow-400" />
            )}
            <input
              type="file"
              onChange={onProfileImageSelect}
              accept="image/*"
              className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-white file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-yellow-400 file:text-black hover:file:bg-yellow-500 text-xs"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {busy ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating Account...
              </div>
            ) : (
              isTourist ? "Create Tourist Account" : "Register as Provider"
            )}
          </button>
        </div>
      </form>

      {msg && (
        <div className={`mt-3 p-2 rounded text-center text-xs font-medium ${
          msg.includes("❌") 
            ? "bg-red-500/20 text-red-300 border border-red-500/30" 
            : msg.includes("⏳")
            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
            : "bg-green-500/20 text-green-300 border border-green-500/30"
        }`}>
          {msg}
        </div>
      )}
    </div>
  );
};

// Global Notification Bell Component
const GlobalNotificationBell = ({ user, notifications, onNotificationClick, onMarkAsRead }) => {
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notification-container')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
  };

  const handleNotificationItemClick = async (notification) => {
    if (!notification.read) {
      await onMarkAsRead(notification.id);
    }
    onNotificationClick(notification);
    setShowNotifications(false);
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 notification-container">
      <div className="relative">
        {showNotifications && (
          <div className="absolute bottom-full right-0 mb-3 w-80 sm:w-96 max-h-96 overflow-hidden">
            <NotificationPanel 
              notifications={notifications}
              onClose={() => setShowNotifications(false)}
              onNotificationClick={handleNotificationItemClick}
              onMarkAsRead={onMarkAsRead}
            />
          </div>
        )}

        <button
          onClick={handleBellClick}
          className="relative bg-yellow-500 p-4 rounded-full shadow-lg border-2 border-white hover:shadow-xl transition-all duration-300 hover:scale-110"
        >
          <Bell className="h-6 w-6 text-white" />
          {notifications.filter(n => !n.read).length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
              {notifications.filter(n => !n.read).length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

// Home Page Component
const HomePage = ({ user, onLogout, onShowAuth }) => {
  const [notifications, setNotifications] = useState([]);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatConversationId, setChatConversationId] = useState(null);
  const [chatOtherUser, setChatOtherUser] = useState(null);

  // Load notifications when user is logged in
  useEffect(() => {
    if (user) {
      const unsubscribe = getUserNotifications(user.uid, (notifications) => {
        setNotifications(notifications);
      });
      
      return () => unsubscribe();
    } else {
      setNotifications([]);
    }
  }, [user]);

  // Handle notification click - OPEN CHAT MODAL
  const handleNotificationClick = async (notification) => {
    console.log('Notification clicked:', notification);
    
    // Mark notification as read
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
    }
    
    if (notification.type === 'message' && notification.conversationId) {
      // Open chat modal with the conversation
      const conversation = await getConversationById(notification.conversationId);
      if (conversation && user) {
        const otherUser = getOtherParticipant(conversation, user.uid);
        setChatConversationId(notification.conversationId);
        setChatOtherUser(otherUser);
        setShowChatModal(true);
      }
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    await markNotificationAsRead(notificationId);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Chat Modal */}
      <ChatModal 
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        conversationId={chatConversationId}
        otherUser={chatOtherUser}
        currentUser={user}
      />
      
      <GlobalNotificationBell 
        user={user}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAsRead={handleMarkAsRead}
      />
      
      <Navbar 
        user={user} 
        onLogout={onLogout} 
        onLogin={onShowAuth}
        onRegister={onShowAuth}
      />
      
      {/* Home Content with All Sections */}
      <div className="pt-16">
        <Section1 />
        <Section2 />
        <Section3 />
        <Section4 />
        <Section5 />
        <Footer />
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      
      if (user) {
        try {
          let userRole = 'tourist';
          let userName = user.displayName || 'User';
          
          const touristDoc = await getDoc(doc(db, 'tourists', user.uid));
          if (touristDoc.exists()) {
            userRole = 'tourist';
            userName = touristDoc.data().fullName || userName;
          } else {
            const providerDoc = await getDoc(doc(db, 'serviceProviders', user.uid));
            if (providerDoc.exists()) {
              userRole = 'provider';
              userName = providerDoc.data().fullName || userName;
            }
          }
          
          await setUserOnline(user.uid, userRole, {
            userName: userName,
            email: user.email
          });
        } catch (error) {
          console.log('Error setting user online status:', error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      if (user) {
        await setUserOffline(user.uid);
      }
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuth(false);
  };

  const handleShowAuth = () => {
    setShowAuth(true);
  };

  useEffect(() => {
    return () => {
      if (user) {
        setUserOffline(user.uid);
      }
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (showAuth) {
    return <Authentication onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            <HomePage 
              user={user}
              onLogout={handleLogout}
              onShowAuth={handleShowAuth}
            />
          } 
        />
        <Route 
          path="/driver" 
          element={
            <JeepDriversPage 
              user={user}
              onLogout={handleLogout}
            />
          } 
        />
        <Route 
          path="/jeepprofile" 
          element={<JeepProfile />} 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;