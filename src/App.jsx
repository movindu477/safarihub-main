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
} from "firebase/firestore";
import {
  getStorage,
  ref as sRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { Eye, EyeOff, Mail, Lock, User, MapPin, Phone, Globe, Camera, ChevronLeft, LogOut, Menu, X, Calendar } from "lucide-react";

// Import images from src/assets
import logo from "./assets/logo.png";

import Navbar from "./components/Navbar";
import Section1 from "./components/Section1";
import Section2 from "./components/Section2";
import Section3 from "./components/Section3";
import Section4 from "./components/Section4";
import Section5 from "./components/Section5";
import Footer from "./components/Footer";
import JeepDriversPage from "./components/JeepMain.jsx";
import JeepProfile from "./components/JeepProfile";

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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Phone number formatting utility
const formatPhoneNumber = (phone) => {
  if (!phone) return "";
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If it starts with 94, add + prefix
  if (cleaned.startsWith('94')) {
    return `+${cleaned}`;
  }
  
  // If it starts with 0, replace with +94
  if (cleaned.startsWith('0')) {
    return `+94${cleaned.substring(1)}`;
  }
  
  // If it doesn't start with +, add it
  if (!cleaned.startsWith('+')) {
    return `+94${cleaned}`;
  }
  
  return phone;
};

// Phone number validation
const isValidSriLankanPhone = (phone) => {
  if (!phone) return false;
  
  const formatted = formatPhoneNumber(phone);
  // Sri Lankan phone number regex: +94 followed by 7, 6, or 0 and 9 digits total
  const sriLankanRegex = /^\+94[0-9]{9}$/;
  return sriLankanRegex.test(formatted);
};

// Main App Component with Authentication
function MainApp({ user, onLogout, onLogin, onRegister }) {
  const [screen, setScreen] = useState("home");
  const [role, setRole] = useState(null);
  const [msg, setMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  // ADD THESE NEW STATE VARIABLES HERE:
  const [vehicleType, setVehicleType] = useState("");
  const [pricePerDay, setPricePerDay] = useState("");
  const [destinations, setDestinations] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [specialSkills, setSpecialSkills] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [description, setDescription] = useState("");
  const [availableDates, setAvailableDates] = useState([]); // NEW: Calendar dates

  const [busy, setBusy] = useState(false);

  // Handle phone number input with formatting
  const handlePhoneChange = (value) => {
    // Allow only numbers and + sign
    const cleaned = value.replace(/[^\d+]/g, '');
    setPhone(cleaned);
  };

  // Reset form function - UPDATED to include new fields
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
    // Reset new fields
    setVehicleType("");
    setPricePerDay("");
    setDestinations([]);
    setLanguages([]);
    setSpecialSkills([]);
    setCertifications([]);
    setDescription("");
    setAvailableDates([]); // NEW: Reset calendar dates
    setMsg("");
    setBusy(false);
  };

  // DEVELOPMENT BYPASS: Auto-login for testing
  useEffect(() => {
    console.log("App component mounted - DEVELOPMENT MODE");
    console.log("Current screen:", screen);
    
    const developmentBypass = () => {
      console.log("Development bypass active - showing home page");
      setScreen("home");
    };
    
    developmentBypass();
  }, []);

  // Splash timer
  useEffect(() => {
    if (screen === "splash") {
      const t = setTimeout(() => setScreen("login"), 2000);
      return () => clearTimeout(t);
    }
  }, [screen]);

  // Reset form when changing screens
  useEffect(() => {
    if (screen === "login" || screen === "register") {
      resetForm();
    }
  }, [screen]);

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

  // NEW: Handle date selection for calendar
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

  // Enhanced Register Function with phone validation
  const handleRegister = async (e) => {
    e.preventDefault();
    
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
      
      // Format phone number for storage
      const formattedPhone = phone ? formatPhoneNumber(phone) : "";

      const userData = {
        uid,
        email,
        fullName: fullName,
        phone: formattedPhone,
        profilePicture: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      let collectionName = "";
      
      if (role === "tourist") {
        collectionName = "tourists";
        Object.assign(userData, {
          country: country || "",
          preferredLanguage: language || "",
        });
      } else {
        collectionName = "serviceProviders";
        Object.assign(userData, {
          // Basic Info
          location: locationBase || "",
          experienceYears: parseInt(experience) || 0,
          serviceType: serviceType || "Jeep Driver",
          
          // Filtering Fields
          vehicleType: vehicleType || "",
          pricePerDay: parseInt(pricePerDay) || 0,
          rating: 0, // Default rating
          totalRatings: 0,
          
          // Arrays for filtering
          destinations: destinations || [],
          languages: languages || [],
          specialSkills: specialSkills || [],
          certifications: certifications || [],
          
          // NEW: Calendar availability
          availableDates: availableDates || [],
          availability: availableDates.length > 0, // Auto-set availability based on dates
          
          // Additional Info
          description: description || "",
          featured: false, // Default not featured
          
          // Contact
          contactEmail: email,
          contactPhone: formattedPhone,
        });
      }

      await setDoc(doc(db, collectionName, uid), userData);
      
      let photoURL = null;
      if (profileFile) {
        try {
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
          console.log("Profile image upload failed, but account created successfully");
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
      console.error("Registration error:", error);
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
        errorMessage += "Please try again.";
      }
      
      setMsg(errorMessage);
      setBusy(false);
    }
  };

  // ✅ Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setMsg(`✅ Welcome back! Redirecting...`);
      setTimeout(() => {
        setScreen("home");
        resetForm();
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

  // Handle login button click - navigate to login screen
  const handleLoginClick = () => {
    setScreen("login");
  };

  // Handle register button click - navigate to register screen
  const handleRegisterClick = () => {
    setScreen("register");
  };

  // DEVELOPMENT: Quick navigation buttons
  const DevNavigation = () => (
    <div className="fixed top-4 right-4 z-50 flex gap-2 bg-black/80 p-2 rounded-lg">
      <button 
        onClick={() => setScreen("home")}
        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
      >
        Home
      </button>
      <button 
        onClick={() => setScreen("login")}
        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
      >
        Login
      </button>
      <button 
        onClick={() => setScreen("register")}
        className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
      >
        Register
      </button>
    </div>
  );

  // ✅ Modern Splash Screen
  if (screen === "splash")
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800 flex flex-col items-center justify-center z-50">
        <DevNavigation />
        <div className="mb-8 transform scale-110">
          <img
            src={logo}
            alt="SafariHub Logo"
            className="h-32 w-auto object-contain mb-4"
          />
        </div>
        
        <div className="text-center">
          <p className="text-yellow-400 font-bold text-xl mb-3">
            WELCOME TO SAFARIHUB
          </p>
          <div className="flex gap-2 mt-4">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce delay-200"></div>
          </div>
        </div>
      </div>
    );

  // ✅ Login Page
  if (screen === "login")
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-4">
        <DevNavigation />
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
        <DevNavigation />
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
                // ADD THESE NEW FIELDS:
                vehicleType, pricePerDay, destinations, languages, 
                specialSkills, certifications, description,
                availableDates // NEW: Calendar dates
              }}
              handlers={{ 
                setEmail, setFullName, setPassword, setConfirm, setCountry, setPhone: handlePhoneChange, setLanguage,
                setLocationBase, setExperience, setLanguagesSpoken, setServiceType,
                // ADD THESE NEW HANDLERS:
                setVehicleType, setPricePerDay, setDestinations, setLanguages,
                setSpecialSkills, setCertifications, setDescription,
                setAvailableDates, // NEW: Calendar handler
                handleDateSelect // NEW: Date selection handler
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

  // ✅ Home Page
  console.log("Rendering Home Page with all sections");
  return (
    <div className="min-h-screen bg-white">
      <DevNavigation />
      <Navbar 
        user={user} 
        onLogout={onLogout} 
        onLogin={handleLoginClick}
        onRegister={handleRegisterClick}
      />
      <Section1 />
      <div className="h-1 bg-black"></div>
      <Section2 />
      <div className="h-1 bg-black"></div>
      <Section3 />
      <div className="h-1 bg-black"></div>
      <Section4 />
      <div className="h-1 bg-black"></div>
      <Section5 />
      <div className="h-1 bg-black"></div>
      <Footer />
    </div>
  );
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

// Enhanced RegistrationForm Component with Calendar and Phone Validation
const RegistrationForm = ({ role, formData, handlers, profilePreview, onProfileImageSelect, onSubmit, busy, msg }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const isTourist = role === 'tourist';

  // UPDATED: Only 3 Service Types
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

  // NEW: Calendar functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const isDateSelected = (date) => {
    const dateString = date.toISOString().split('T')[0];
    return formData.availableDates?.includes(dateString);
  };

  const isDateInPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isSelected = isDateSelected(date);
      const isPast = isDateInPast(date);

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => !isPast && handlers.handleDateSelect(date)}
          disabled={isPast}
          className={`h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
            isSelected
              ? 'bg-yellow-500 text-white'
              : isPast
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:bg-yellow-100'
          }`}
        >
          {day}
        </button>
      );
    }

    return days;
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
              Full Name
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
              Email Address
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
              Password
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
              Confirm Password
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
              {isTourist ? 'Country' : 'Base Location'}
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

        {/* Service Provider Specific Fields */}
        {!isTourist && (
          <>
            {/* Service Type and Vehicle Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-white font-medium text-xs">
                  <User className="h-3 w-3 text-yellow-400" />
                  Service Type
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
                  📅 Experience (Years)
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

            {/* NEW: Calendar for Available Dates */}
            <div className="md:col-span-2 space-y-1">
              <label className="flex items-center gap-2 text-white font-medium text-xs">
                <Calendar className="h-3 w-3 text-yellow-400" />
                Available Dates (Select your available days)
              </label>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={() => navigateMonth(-1)}
                    className="p-1 text-gray-400 hover:text-yellow-400"
                  >
                    ‹
                  </button>
                  <h3 className="text-white text-sm font-medium">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <button
                    type="button"
                    onClick={() => navigateMonth(1)}
                    className="p-1 text-gray-400 hover:text-yellow-400"
                  >
                    ›
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-gray-400 text-xs font-medium">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {renderCalendar()}
                </div>

                {/* Selected Dates Summary */}
                {formData.availableDates && formData.availableDates.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-300 text-xs font-medium mb-2">
                      Selected Dates ({formData.availableDates.length}):
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {formData.availableDates.slice(0, 5).map(date => (
                        <span key={date} className="bg-yellow-500 text-white px-2 py-1 rounded text-xs">
                          {new Date(date).toLocaleDateString()}
                        </span>
                      ))}
                      {formData.availableDates.length > 5 && (
                        <span className="text-yellow-300 text-xs">
                          +{formData.availableDates.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
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

            {/* Special Skills (Multi-select) */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-white font-medium text-xs">
                🎯 Special Skills & Services
              </label>
              <div className="max-h-24 overflow-y-auto border border-white/10 rounded-lg p-2 bg-white/5">
                {specialSkills.map(skill => (
                  <div key={skill} className="flex items-center mb-1">
                    <input
                      type="checkbox"
                      id={`skill-${skill}`}
                      checked={formData.specialSkills?.includes(skill) || false}
                      onChange={(e) => {
                        const updatedSkills = formData.specialSkills || [];
                        if (e.target.checked) {
                          handlers.setSpecialSkills([...updatedSkills, skill]);
                        } else {
                          handlers.setSpecialSkills(updatedSkills.filter(s => s !== skill));
                        }
                      }}
                      className="mr-2 h-3 w-3 text-yellow-400 focus:ring-yellow-400 border-gray-300 rounded"
                    />
                    <label htmlFor={`skill-${skill}`} className="text-white text-xs">
                      {skill}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Certifications (Multi-select) */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-white font-medium text-xs">
                📜 Certifications
              </label>
              <div className="max-h-24 overflow-y-auto border border-white/10 rounded-lg p-2 bg-white/5">
                {certifications.map(cert => (
                  <div key={cert} className="flex items-center mb-1">
                    <input
                      type="checkbox"
                      id={`cert-${cert}`}
                      checked={formData.certifications?.includes(cert) || false}
                      onChange={(e) => {
                        const updatedCerts = formData.certifications || [];
                        if (e.target.checked) {
                          handlers.setCertifications([...updatedCerts, cert]);
                        } else {
                          handlers.setCertifications(updatedCerts.filter(c => c !== cert));
                        }
                      }}
                      className="mr-2 h-3 w-3 text-yellow-400 focus:ring-yellow-400 border-gray-300 rounded"
                    />
                    <label htmlFor={`cert-${cert}`} className="text-white text-xs">
                      {cert}
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
              <option value="">Select language</option>
              <option value="english">English</option>
              <option value="sinhala">Sinhala</option>
              <option value="tamil">Tamil</option>
            </select>
          </div>
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

// Main Router Component
function App() {
  const [user, setUser] = useState(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            <MainApp 
              user={user}
              onLogout={handleLogout}
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
        {/* NEW: Jeep Profile Route */}
        <Route 
          path="/jeepprofile" 
          element={<JeepProfile />} 
        />
        {/* FIXED: Added closing bracket for the catch-all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;