import React, { useState, useEffect } from "react";
import { 
  Menu, 
  X, 
  User, 
  Settings, 
  LogOut, 
  Heart, 
  Calendar, 
  CreditCard, 
  HelpCircle,
  MapPin,
  Globe,
  Phone,
  Award,
  ChevronDown,
  Map,
  Compass,
  Car,
  ShoppingBag
} from "lucide-react";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";

// Import images from src/assets
import logo from "../../assets/logo.png";
import userImage from "../../assets/user.png";

export default function Navbar({ user, onLogout, onLogin, onRegister, onStartChat }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const auth = getAuth();
  const db = getFirestore();
  const navigate = useNavigate();
  const location = useLocation();

  // Listen to authentication state changes for persistence
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthLoading(false);
      console.log("Navbar auth state:", user ? "User logged in" : "No user");
      
      if (!user) {
        setUserData(null);
        setProfileOpen(false);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  // Add scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch user data from Firestore when profile opens or user changes
  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = user || authUser;
      
      if (currentUser && profileOpen) {
        setLoading(true);
        try {
          let userDocRef;
          
          // Try tourists collection first
          userDocRef = doc(db, "tourists", currentUser.uid);
          let userDoc = await getDoc(userDocRef);
          
          // If not found in tourists, try serviceProviders
          if (!userDoc.exists()) {
            userDocRef = doc(db, "serviceProviders", currentUser.uid);
            userDoc = await getDoc(userDocRef);
          }
          
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          } else {
            console.log("No user data found in Firestore");
            setUserData(null);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserData(null);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserData();
  }, [user, authUser, profileOpen, db]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setProfileOpen(false);
      setUserData(null);
      setMenuOpen(false);
      
      // Call the onLogout callback if provided
      if (onLogout) {
        onLogout();
      }
      
      console.log("User logged out successfully");
      
      // Navigate to home page after logout
      navigate('/');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Handle login navigation
  const handleLoginClick = () => {
    setMenuOpen(false);
    if (onLogin) {
      onLogin();
    }
  };

  // Handle register navigation
  const handleRegisterClick = () => {
    setMenuOpen(false);
    if (onRegister) {
      onRegister();
    }
  };

  // Function to handle Home navigation
  const handleHomeClick = () => {
    navigate('/');
    setServicesDropdownOpen(false);
    setMobileServicesOpen(false);
    setMenuOpen(false);
  };

  // Function to handle Jeep Driver navigation
  const handleJeepDriverClick = () => {
    navigate('/driver');
    setServicesDropdownOpen(false);
    setMobileServicesOpen(false);
    setMenuOpen(false);
  };

  // Function to handle Destination navigation
  const handleDestinationClick = () => {
    navigate('/destination');
    setServicesDropdownOpen(false);
    setMobileServicesOpen(false);
    setMenuOpen(false);
  };

  // Function to handle Guide navigation
  const handleGuideClick = () => {
    navigate('/guide');
    setServicesDropdownOpen(false);
    setMobileServicesOpen(false);
    setMenuOpen(false);
  };

  // Use parent user prop if available, otherwise use local auth state
  const currentUser = user || authUser;

  const profileMenuItems = [
    { icon: User, label: "My Profile", href: "#" },
    { icon: Heart, label: "My Favorites", href: "#" },
    { icon: Calendar, label: "My Bookings", href: "#" },
    { icon: CreditCard, label: "Payment Methods", href: "#" },
    { icon: Settings, label: "Settings", href: "#" },
    { icon: HelpCircle, label: "Help & Support", href: "#" },
  ];

  const servicesItems = [
    { icon: Map, label: "Find a Guide", onClick: handleGuideClick, path: "/guide" },
    { icon: Compass, label: "Explore Destinations", onClick: handleDestinationClick, path: "/destination" },
    { icon: Car, label: "Find a Jeep Driver", onClick: handleJeepDriverClick, path: "/driver" },
    { icon: ShoppingBag, label: "Rent Equipment", href: "#equipment" },
  ];

  // Navigation items
  const navItems = [
    { label: "HOME", onClick: handleHomeClick, path: "/" },
    { label: "ABOUT US", onClick: () => navigate("/about"), path: "/about" },
  ];

  // Default user data if no user is logged in
  const defaultUserData = {
    name: "Guest User",
    email: "Please log in",
    membership: "Free Member",
    joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    avatar: userImage
  };

  const userProfileData = currentUser ? {
    name: currentUser.displayName || userData?.fullName || userData?.fullname || "User",
    email: currentUser.email || "No email",
    membership: userData?.serviceType ? `${userData.serviceType}` : "Tourist",
    joinDate: userData?.createdAt ? new Date(userData.createdAt.toDate()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "Recently",
    avatar: currentUser.photoURL || userData?.profilePicture || userImage,
    phone: userData?.phone || userData?.phoneNumber || "Not provided",
    location: userData?.location || userData?.country || "Not specified",
    experience: userData?.experienceYears,
    languages: userData?.languagesSpoken || userData?.preferredLanguage || "Not specified",
    role: userData?.serviceType ? "Service Provider" : "Tourist"
  } : defaultUserData;

  const normalizePath = (path) => {
    if (!path) return "";
    const trimmed = path === "/" ? "/" : path.replace(/\/+$/, "");
    return trimmed || "/";
  };

  const isActivePath = (path) => {
    if (!path) return false;
    const current = normalizePath(location.pathname || "/");
    const target = normalizePath(path);
    if (target === "/") {
      return current === "/";
    }
    return current === target || current.startsWith(`${target}/`);
  };

  const isServicesActive = servicesItems.some(
    (item) => item.path && isActivePath(item.path)
  );

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 w-[95%] max-w-6xl bg-emerald-500 text-white flex items-center justify-between px-6 md:px-12 py-3 z-50 h-16 rounded-2xl border border-emerald-300/30 shadow-2xl shadow-emerald-800/30">
        <div className="flex items-center space-x-3">
          <img
            src={logo}
            alt="SafariHub Logo"
            className="h-12 md:h-40 w-auto object-contain"
          />
        </div>
        <div className="flex items-center">
          <div className="animate-pulse bg-emerald-400 rounded-lg h-8 w-20"></div>
        </div>
      </nav>
    );
  }

  return (
    <>
      {/* Navbar - Bright Green */}
      <nav className={`fixed top-4 left-1/2 transform -translate-x-1/2 w-[95%] max-w-6xl text-white flex items-center justify-between px-6 md:px-12 py-3 z-50 h-16 rounded-2xl border border-green-700/40 transition-all duration-300 ${
        isScrolled 
          ? 'bg-green-900 shadow-2xl shadow-black/40' 
          : 'bg-green-900 shadow-2xl shadow-black/30'
      }`}>
        {/* Left side - Logo */}
        <div className="flex items-center space-x-3">
          <img
            src={logo}
            alt="SafariHub Logo"
            className="h-12 md:h-40 w-auto object-contain cursor-pointer"
            onClick={handleHomeClick}
          />
        </div>

        {/* Right side - Desktop Links */}
        <div className="hidden md:flex items-center space-x-10">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`text-sm md:text-base font-medium px-3 py-1 rounded-xl transition-colors duration-300 cursor-pointer ${
                isActivePath(item.path)
                  ? "bg-green-800/70 text-emerald-100 border border-green-500/40 shadow-inner"
                  : "text-gray-100 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}

          {/* Services Dropdown */}
          <div 
            className="relative"
            onMouseEnter={() => setServicesDropdownOpen(true)}
            onMouseLeave={() => setServicesDropdownOpen(false)}
          >
            <button
              className={`text-sm md:text-base font-medium px-3 py-1 rounded-xl transition-colors duration-300 flex items-center gap-1 cursor-pointer ${
                isServicesActive
                  ? "bg-green-800/70 text-emerald-100 border border-green-500/40 shadow-inner"
                  : "text-gray-100 hover:text-white"
              }`}
            >
              OUR SERVICES
              <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${servicesDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Invisible connecting bridge to prevent gap */}
            <div 
              className="absolute top-full left-0 w-full h-2 bg-transparent"
              onMouseEnter={() => setServicesDropdownOpen(true)}
            ></div>

            {/* Dropdown Menu */}
            {servicesDropdownOpen && (
              <div 
                className="absolute top-full left-0 w-64 bg-green-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-green-700/40 overflow-hidden animate-fadeIn mt-2"
                onMouseEnter={() => setServicesDropdownOpen(true)}
                onMouseLeave={() => setServicesDropdownOpen(false)}
              >
                <div className="py-2">
                  {servicesItems.map((item, index) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.label}
                        onClick={item.onClick}
                        className={`flex items-center gap-3 px-4 py-3 text-white transition-all duration-300 group cursor-pointer w-full text-left ${
                          item.path && isActivePath(item.path)
                            ? "bg-green-800 text-emerald-100"
                            : "hover:bg-green-800 hover:text-white"
                        }`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <IconComponent className="h-4 w-4 text-gray-200 group-hover:text-white" />
                        <span className="font-medium text-sm">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* User Authentication Buttons - Show when NOT logged in */}
          {!currentUser ? (
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLoginClick}
                className="bg-white hover:bg-emerald-100 text-emerald-700 px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 backdrop-blur-sm border border-emerald-300 shadow-lg shadow-emerald-500/30 cursor-pointer"
              >
                Login
              </button>
              <button
                onClick={handleRegisterClick}
                className="border-2 border-white text-white hover:bg-white hover:text-emerald-700 px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 backdrop-blur-sm shadow-lg shadow-emerald-400/20 cursor-pointer"
              >
                Register
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              {/* User Profile */}
              <div className="relative">
                <img
                  src={userProfileData.avatar}
                  alt="User"
                  className="h-10 w-10 rounded-full cursor-pointer hover:opacity-80 transition duration-300 border-2 border-emerald-300/60 hover:border-emerald-200 shadow-lg shadow-emerald-500/30"
                  onClick={() => setProfileOpen(true)}
                />
                {/* Online indicator */}
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-emerald-700 shadow-sm"></div>
              </div>
            </div>
          )}
        </div>

        {/* Hamburger Menu (Mobile) */}
        <div className="md:hidden flex items-center space-x-4">
          {currentUser ? (
            <div className="flex items-center space-x-2">
              {/* User Profile for Mobile */}
              <div className="relative">
                <img
                  src={userProfileData.avatar}
                  alt="User"
                  className="h-8 w-8 rounded-full cursor-pointer hover:opacity-80 transition duration-300 border-2 border-emerald-300/60 hover:border-emerald-200 shadow-lg shadow-emerald-500/30"
                  onClick={() => setProfileOpen(true)}
                />
                <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full border-2 border-emerald-700"></div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleLoginClick}
                className="bg-white hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg font-medium transition-colors text-sm backdrop-blur-sm border border-emerald-300 shadow-lg shadow-emerald-500/20"
              >
                Login
              </button>
            </div>
          )}
          <Menu
            className="h-8 w-8 text-white cursor-pointer hover:text-emerald-200 transition-colors duration-300"
            onClick={() => setMenuOpen(true)}
          />
        </div>
      </nav>

      {/* Mobile Navigation Side Panel */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-70 z-40 backdrop-blur-sm md:hidden animate-fadeIn"
            onClick={() => setMenuOpen(false)}
          />

          <div className="fixed top-0 left-0 h-full w-full bg-emerald-500 text-white z-50 md:hidden animate-slideInLeft backdrop-blur-xl border-r border-emerald-400/30">
            <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-400/30 bg-emerald-600/40 backdrop-blur-sm">
              <img
                src={logo}
                alt="SafariHub Logo"
                className="h-8 w-auto object-contain cursor-pointer"
                onClick={handleHomeClick}
              />
              <X
                className="h-8 w-8 text-white cursor-pointer hover:text-emerald-200 transition-colors duration-300 bg-emerald-500/30 rounded-lg p-1"
                onClick={() => setMenuOpen(false)}
              />
            </div>

            <div className="h-full flex flex-col justify-between px-6 py-6">
              <div className="space-y-0">
                {navItems.map((item, index) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      if (item.onClick) item.onClick();
                      setMenuOpen(false);
                    }}
                    className={`block transition-all duration-300 py-5 border-b border-emerald-400/20 font-medium text-xl w-full text-left animate-fadeInUp group cursor-pointer ${
                      isActivePath(item.path)
                        ? "text-emerald-100 bg-green-800/40"
                        : "text-white hover:text-emerald-200 hover:border-emerald-300"
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <span className="flex items-center">
                      {item.label}
                      <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">→</span>
                    </span>
                  </button>
                ))}

                <div className="border-b border-green-700/40">
                  <button
                    onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                    className="flex items-center justify-between w-full text-white hover:text-gray-200 transition-all duration-300 py-5 font-medium text-xl text-left animate-fadeInUp group cursor-pointer"
                    style={{ animationDelay: "200ms" }}
                  >
                    <span className="flex items-center">
                      OUR SERVICES
                      <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">→</span>
                    </span>
                    <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${mobileServicesOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {mobileServicesOpen && (
                    <div className="pl-4 pb-2 space-y-0 animate-fadeIn border-l border-green-700/40 ml-2">
                      {servicesItems.map((item, index) => {
                        const IconComponent = item.icon;
                        return (
                          <button
                            key={item.label}
                            onClick={() => {
                              if (item.onClick) item.onClick();
                              setMenuOpen(false);
                            }}
                            className={`flex items-center gap-3 transition-all duration-300 py-4 border-b border-green-800/40 font-medium text-lg w-full text-left animate-fadeInUp cursor-pointer ${
                              item.path && isActivePath(item.path)
                                ? "text-emerald-100 bg-green-800/40 border-green-600"
                                : "text-white hover:text-gray-200 hover:border-green-600"
                            }`}
                            style={{ animationDelay: `${index * 50 + 300}ms` }}
                          >
                            <IconComponent className="h-4 w-4 text-gray-200" />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Authentication Buttons for Mobile - Show when NOT logged in */}
              {!currentUser && (
                <div className="space-y-3 py-4 border-t border-emerald-400/20 pt-6 animate-fadeInUp"
                     style={{ animationDelay: "400ms" }}>
                  <button
                    onClick={handleLoginClick}
                    className="w-full bg-white hover:bg-emerald-100 text-emerald-700 py-3 rounded-xl font-semibold transition-all duration-300 text-lg hover:shadow-lg backdrop-blur-sm border border-emerald-300 shadow-lg shadow-emerald-500/30 cursor-pointer"
                  >
                    Login
                  </button>
                  <button
                    onClick={handleRegisterClick}
                    className="w-full border-2 border-white text-white hover:bg-white hover:text-emerald-700 py-3 rounded-xl font-semibold transition-all duration-300 text-lg hover:shadow-lg backdrop-blur-sm shadow-lg shadow-emerald-400/20 cursor-pointer"
                  >
                    Register
                  </button>
                </div>
              )}

              {currentUser && (
                <div className="space-y-3 pt-6 border-t border-emerald-400/20">
                  {/* User Profile in Mobile Menu */}
                  <div
                    className="flex items-center space-x-3 py-4 animate-fadeInUp cursor-pointer group"
                    style={{ animationDelay: "450ms" }}
                    onClick={() => {
                      setMenuOpen(false);
                      setProfileOpen(true);
                    }}
                  >
                    <div className="relative">
                      <img
                        src={userProfileData.avatar}
                        alt="User"
                        className="h-12 w-12 rounded-full cursor-pointer hover:opacity-80 transition duration-300 border-2 border-emerald-300/60 group-hover:border-emerald-200 shadow-lg shadow-emerald-500/30"
                      />
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-emerald-800"></div>
                    </div>
                    <div>
                      <span className="text-white group-hover:text-emerald-200 transition-colors duration-300 font-medium text-lg block">
                        {userProfileData.name}
                      </span>
                      <span className="text-emerald-200 text-sm">{userProfileData.membership}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Profile Side Panel */}
      {profileOpen && currentUser && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-70 z-40 backdrop-blur-sm animate-fadeIn"
            onClick={() => setProfileOpen(false)}
          />

          <div className="fixed top-0 right-0 h-full w-[90vw] max-w-md bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white shadow-2xl border-l-2 border-green-700/50 overflow-hidden z-50 animate-slideInRight">
            {/* Close Button - Top Right */}
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setProfileOpen(false)}
                className="group relative p-2 bg-green-800/80 hover:bg-green-700 rounded-full border border-green-600/50 hover:border-green-500 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-green-500/30 backdrop-blur-sm cursor-pointer"
                aria-label="Close profile"
              >
                <X className="h-5 w-5 text-green-300 group-hover:text-green-100 transition-colors duration-300" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></span>
              </button>
            </div>

            <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-green-700 scrollbar-track-gray-800">
              <div className="relative">
                <div className="h-40 bg-gradient-to-br from-green-800 via-green-900 to-green-800 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-700/30 to-transparent"></div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-green-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-green-700/10 rounded-full -ml-24 -mb-24 blur-2xl"></div>
                </div>
                
                <div className="px-6 pb-6 -mt-20 relative z-10">
                  <div className="relative inline-block group">
                    <div className="absolute -inset-2 bg-gradient-to-r from-green-500 to-green-600 rounded-full opacity-75 blur-lg group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
                    <img
                      src={userProfileData.avatar}
                      alt="User"
                      className="relative h-24 w-24 rounded-full border-4 border-gray-900 bg-gray-900 shadow-2xl shadow-green-900/50 group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute bottom-2 right-2 w-4 h-4 bg-green-400 rounded-full border-2 border-gray-900 shadow-lg shadow-green-500/50 animate-pulse"></div>
                  </div>

                  <div className="mt-4 animate-fadeInUp" style={{ animationDelay: "100ms" }}>
                    <h2 className="text-2xl font-bold text-white group-hover:text-green-200 transition-colors duration-300">{userProfileData.name}</h2>
                    <p className="text-green-300 text-sm mt-1">{userProfileData.email}</p>
                    <div className="flex flex-col gap-2 mt-3">
                      <span className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-1.5 rounded-full text-xs font-bold w-fit shadow-lg shadow-green-700/50 border border-green-500/30 hover:shadow-green-500/70 transition-all duration-300 hover:scale-105">
                        {userProfileData.membership}
                      </span>
                      <span className="text-green-400 text-sm flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Member since {userProfileData.joinDate}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {!loading && userData && (
                <div className="px-6 py-5 border-y border-green-700/30 bg-gradient-to-b from-gray-800/50 to-gray-900/50 backdrop-blur-sm animate-fadeInUp" style={{ animationDelay: "200ms" }}>
                  <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2 group">
                    <div className="p-1.5 bg-green-800/50 rounded-lg border border-green-600/30 group-hover:bg-green-700/50 transition-colors duration-300">
                      <User className="h-4 w-4 text-green-300" />
                    </div>
                    Profile Information
                  </h3>
                  <div className="space-y-3">
                    {userProfileData.phone !== "Not provided" && (
                      <div className="flex items-center gap-3 text-sm p-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors duration-300 border border-gray-700/30 hover:border-green-700/50">
                        <div className="p-1.5 bg-green-800/40 rounded-lg border border-green-700/30">
                          <Phone className="h-3.5 w-3.5 text-green-400" />
                        </div>
                        <span className="text-green-300 font-medium">Phone: </span>
                        <span className="text-white">{userProfileData.phone}</span>
                      </div>
                    )}
                    
                    {userProfileData.location !== "Not specified" && (
                      <div className="flex items-center gap-3 text-sm p-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors duration-300 border border-gray-700/30 hover:border-green-700/50">
                        <div className="p-1.5 bg-green-800/40 rounded-lg border border-green-700/30">
                          <MapPin className="h-3.5 w-3.5 text-green-400" />
                        </div>
                        <span className="text-green-300 font-medium">
                          {userProfileData.role === "Service Provider" ? "Location: " : "Country: "}
                        </span>
                        <span className="text-white">{userProfileData.location}</span>
                      </div>
                    )}
                    
                    {userProfileData.languages !== "Not specified" && (
                      <div className="flex items-center gap-3 text-sm p-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors duration-300 border border-gray-700/30 hover:border-green-700/50">
                        <div className="p-1.5 bg-green-800/40 rounded-lg border border-green-700/30">
                          <Globe className="h-3.5 w-3.5 text-green-400" />
                        </div>
                        <span className="text-green-300 font-medium">
                          {userProfileData.role === "Service Provider" ? "Languages: " : "Preferred Language: "}
                        </span>
                        <span className="text-white">{userProfileData.languages}</span>
                      </div>
                    )}
                    
                    {userProfileData.experience && (
                      <div className="flex items-center gap-3 text-sm p-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors duration-300 border border-gray-700/30 hover:border-green-700/50">
                        <div className="p-1.5 bg-green-800/40 rounded-lg border border-green-700/30">
                          <Award className="h-3.5 w-3.5 text-green-400" />
                        </div>
                        <span className="text-green-300 font-medium">Experience: </span>
                        <span className="text-white">{userProfileData.experience} years</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3 text-sm p-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors duration-300 border border-gray-700/30 hover:border-green-700/50">
                      <div className="p-1.5 bg-green-800/40 rounded-lg border border-green-700/30">
                        <User className="h-3.5 w-3.5 text-green-400" />
                      </div>
                      <span className="text-green-300 font-medium">Role: </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 hover:scale-105 ${
                        userProfileData.role === "Service Provider" 
                          ? "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-700/50 border border-green-500/30" 
                          : "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-600/50 border border-green-400/30"
                      }`}>
                        {userProfileData.role}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {loading && (
                <div className="px-6 py-8 text-center animate-fadeIn">
                  <div className="relative inline-block">
                    <div className="animate-spin rounded-full h-10 w-10 border-3 border-gray-700 border-t-green-500 mx-auto"></div>
                    <div className="absolute inset-0 animate-ping rounded-full border-2 border-green-500/30"></div>
                  </div>
                  <p className="text-green-300 mt-3 font-medium">Loading profile...</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 px-6 py-5 border-y border-green-700/30 bg-gradient-to-b from-gray-800/50 to-gray-900/50 backdrop-blur-sm animate-fadeInUp" style={{ animationDelay: "300ms" }}>
                <div className="text-center p-3 rounded-xl bg-gray-800/30 border border-gray-700/30 hover:border-green-700/50 hover:bg-gray-800/50 transition-all duration-300 hover:scale-105 group cursor-pointer">
                  <div className="text-xl font-bold text-green-400 group-hover:text-green-300 transition-colors duration-300">12</div>
                  <div className="text-xs text-green-300/80 mt-1">Trips</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-gray-800/30 border border-gray-700/30 hover:border-green-700/50 hover:bg-gray-800/50 transition-all duration-300 hover:scale-105 group cursor-pointer">
                  <div className="text-xl font-bold text-green-400 group-hover:text-green-300 transition-colors duration-300">8</div>
                  <div className="text-xs text-green-300/80 mt-1">Favorites</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-gray-800/30 border border-gray-700/30 hover:border-green-700/50 hover:bg-gray-800/50 transition-all duration-300 hover:scale-105 group cursor-pointer">
                  <div className="text-xl font-bold text-green-400 group-hover:text-green-300 transition-colors duration-300">2</div>
                  <div className="text-xs text-green-300/80 mt-1">Upcoming</div>
                </div>
              </div>

              <div className="p-6 space-y-2 bg-gradient-to-b from-gray-900 to-black animate-fadeInUp" style={{ animationDelay: "400ms" }}>
                {profileMenuItems.map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-green-800/30 transition-all duration-300 group cursor-pointer border border-gray-700/30 hover:border-green-600/50 hover:shadow-lg hover:shadow-green-900/30 hover:scale-[1.02] animate-fadeInUp"
                      style={{ animationDelay: `${index * 50 + 500}ms` }}
                      onClick={() => setProfileOpen(false)}
                    >
                      <div className="p-2 bg-green-800/30 rounded-lg group-hover:bg-green-700/50 group-hover:scale-110 transition-all duration-300 border border-green-700/30 group-hover:border-green-500/50">
                        <IconComponent className="h-5 w-5 text-green-400 group-hover:text-green-200 transition-colors duration-300" />
                      </div>
                      <span className="font-medium text-green-300 group-hover:text-green-100 transition-colors duration-300">
                        {item.label}
                      </span>
                    </a>
                  );
                })}
              </div>

              <div className="px-6 py-5 border-t border-green-700/30 bg-gradient-to-b from-gray-900 to-black mt-auto animate-fadeInUp" style={{ animationDelay: "600ms" }}>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-red-600/40 text-red-400 hover:text-red-300 transition-all duration-300 w-full group border border-red-700/30 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-900/30 hover:scale-[1.02] cursor-pointer"
                >
                  <div className="p-2 bg-red-700/20 rounded-lg group-hover:bg-red-600 group-hover:scale-110 transition-all duration-300 border border-red-600/30 group-hover:border-red-500/50">
                    <LogOut className="h-5 w-5 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <span className="font-medium group-hover:text-red-200 transition-colors duration-300">Log Out</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes slideInRight {
          from { 
            transform: translateX(100%);
            opacity: 0;
          }
          to { 
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { 
            opacity: 0; 
            transform: translateY(20px);
          }
          to { 
            opacity: 1; 
            transform: translateY(0);
          }
        }
        .animate-slideInRight { 
          animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
        }
        .animate-slideInLeft { 
          animation: slideInLeft 0.3s ease-out forwards; 
        }
        .animate-fadeIn { 
          animation: fadeIn 0.3s ease-out forwards; 
        }
        .animate-fadeInUp { 
          animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
          opacity: 0;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(34, 197, 94, 0.5);
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 197, 94, 0.7);
        }
      `}</style>
    </>
  );
}