import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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
import { Eye, EyeOff, Mail, Lock, User, MapPin, Phone, Globe, Camera, ChevronLeft, LogOut, Menu, X } from "lucide-react";

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

// Main App Component with Authentication
function MainApp({ user, onLogin, onRegister, onLogout }) {
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

  const [busy, setBusy] = useState(false);

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

  // ✅ FAST Register (Tourist or Provider)
  const handleRegister = async (e) => {
    e.preventDefault();
    
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
      
      const userData = {
        uid,
        email,
        fullName: fullName,
        phone: phone || "",
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
          location: locationBase || "",
          experienceYears: parseInt(experience) || 0,
          languagesSpoken: languagesSpoken ? languagesSpoken.split(",").map(lang => lang.trim()) : [],
          serviceType: serviceType || "Jeep Driver",
          availability: [],
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
                locationBase, experience, languagesSpoken, serviceType 
              }}
              handlers={{ 
                setEmail, setFullName, setPassword, setConfirm, setCountry, setPhone, setLanguage,
                setLocationBase, setExperience, setLanguagesSpoken, setServiceType 
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
        onLogin={onLogin}
        onRegister={onRegister}
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

// Unified Registration Form Component
const RegistrationForm = ({ role, formData, handlers, profilePreview, onProfileImageSelect, onSubmit, busy, msg }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isTourist = role === 'tourist';

  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-white">
          {isTourist ? 'Tourist Registration' : 'Service Provider Registration'}
        </h2>
        <p className="text-gray-300 text-xs mt-1">
          {isTourist ? 'Create your adventure account' : 'Join our network of service providers'}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-white font-medium text-xs">
              <Phone className="h-3 w-3 text-yellow-400" />
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handlers.setPhone(e.target.value)}
              required={!isTourist}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
              placeholder="Your phone number"
            />
          </div>

          <div className="space-y-1">
            <label className="flex items-center gap-2 text-white font-medium text-xs">
              <MapPin className="h-3 w-3 text-yellow-400" />
              {isTourist ? 'Country' : 'Base City'}
            </label>
            <input
              type="text"
              value={isTourist ? formData.country : formData.locationBase}
              onChange={(e) => isTourist ? handlers.setCountry(e.target.value) : handlers.setLocationBase(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
              placeholder={isTourist ? 'Your country' : 'Your base city'}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-white font-medium text-xs">
              <Globe className="h-3 w-3 text-yellow-400" />
              {isTourist ? 'Preferred Language' : 'Experience (Years)'}
            </label>
            {isTourist ? (
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
            ) : (
              <input
                type="number"
                value={formData.experience}
                onChange={(e) => handlers.setExperience(e.target.value)}
                required
                min="0"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                placeholder="Years of experience"
              />
            )}
          </div>

          {!isTourist && (
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
                style={{ 
                  backgroundColor: '#1f2937',
                  color: 'white'
                }}
              >
                <option value="Jeep Driver">Jeep Driver</option>
                <option value="Tour Guide">Tour Guide</option>
                <option value="Renting">Renting</option>
              </select>
            </div>
          )}
        </div>

        {!isTourist && (
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-white font-medium text-xs">
              <Globe className="h-3 w-3 text-yellow-400" />
              Languages Spoken
            </label>
            <input
              type="text"
              value={formData.languagesSpoken}
              onChange={(e) => handlers.setLanguagesSpoken(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
              placeholder="e.g., English, Sinhala, Tamil"
            />
            <p className="text-gray-400 text-xs mt-1">Separate languages with commas</p>
          </div>
        )}

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

  const handleLogin = () => {
    // This will be handled by the individual components
    console.log("Login requested");
  };

  const handleRegister = () => {
    // This will be handled by the individual components
    console.log("Register requested");
  };

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
              onLogin={handleLogin}
              onRegister={handleRegister}
              onLogout={handleLogout}
            />
          } 
        />
        <Route 
          path="/driver" 
          element={
            <JeepDriversPage 
              user={user}
              onLogin={handleLogin}
              onRegister={handleRegister}
              onLogout={handleLogout}
            />
          } 
        />
        {/* Add more routes as needed */}
      </Routes>
    </Router>
  );
}

export default App;