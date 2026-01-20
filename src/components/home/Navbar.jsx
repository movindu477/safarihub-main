import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Menu,
  X,
  User,
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
  ShoppingBag,
  FileText
} from "lucide-react";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, onSnapshot, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";

// Import images from src/assets
import logo from "../../assets/logo.png";
import userImage from "../../assets/user.png";

// Import Chat component for Help & Support
import Chat from "../Chat";

export default function Navbar({ user, onLogout, onLogin, onRegister }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showProviderSupport, setShowProviderSupport] = useState(false);
  const [showUserSupport, setShowUserSupport] = useState(false);

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

  // Add scroll effect for navbar with optimized throttling
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          // Only update state if scroll position actually changed significantly
          if (Math.abs(currentScrollY - lastScrollY) > 5) {
            setIsScrolled(currentScrollY > 10);
            lastScrollY = currentScrollY;
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch user data from Firestore when user changes (not just when profile opens)
  // Use real-time listener to automatically update when profilePicture changes
  // Optimized with useRef to prevent unnecessary re-renders
  const userDataRef = useRef(null);
  const currentUserIdRef = useRef(null);

  useEffect(() => {
    const currentUser = user || authUser;

    if (!currentUser) {
      console.log('🔍 No user found, clearing user data');
      setUserData(null);
      setLoading(false);
      userDataRef.current = null;
      currentUserIdRef.current = null;
      return;
    }

    // Skip if same user to prevent unnecessary re-fetching
    if (currentUserIdRef.current === currentUser.uid && userDataRef.current) {
      return;
    }

    currentUserIdRef.current = currentUser.uid;
    console.log('🔍 Setting up database listeners for user:', currentUser.uid);
    let unsubscribeTourist = null;
    let unsubscribeProvider = null;

    const setupListeners = async () => {
      try {
        // Try tourists collection first
        const touristDocRef = doc(db, "tourists", currentUser.uid);
        const touristDoc = await getDoc(touristDocRef);

        if (touristDoc.exists()) {
          const initialData = touristDoc.data();
          console.log('✅ Found user in tourists collection:', {
            uid: currentUser.uid,
            name: initialData.fullName,
            profilePicture: initialData.profilePicture || '❌ No image',
            hasProfilePicture: !!initialData.profilePicture
          });

          // Set initial data immediately
          userDataRef.current = initialData;
          setUserData(initialData);
          setLoading(false);

          // Set up real-time listener for tourists with debouncing
          unsubscribeTourist = onSnapshot(touristDocRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              // Only update if data actually changed
              if (JSON.stringify(data) !== JSON.stringify(userDataRef.current)) {
                console.log('📸 User data updated (tourist)');
                userDataRef.current = data;
                setUserData(data);
              }
            } else {
              console.log('⚠️ Tourist document no longer exists');
              userDataRef.current = null;
              setUserData(null);
            }
            setLoading(false);
          }, (error) => {
            console.error("❌ Error in tourist listener:", error);
            setLoading(false);
          });
        } else {
          // Try serviceProviders collection
          const providerDocRef = doc(db, "serviceProviders", currentUser.uid);
          const providerDoc = await getDoc(providerDocRef);

          if (providerDoc.exists()) {
            const initialData = providerDoc.data();
            console.log('✅ Found user in serviceProviders collection:', {
              uid: currentUser.uid,
              name: initialData.fullName,
              serviceType: initialData.serviceType,
              profilePicture: initialData.profilePicture || '❌ No image',
              hasProfilePicture: !!initialData.profilePicture
            });

            // Set initial data immediately
            userDataRef.current = initialData;
            setUserData(initialData);
            setLoading(false);

            // Set up real-time listener for service providers with debouncing
            unsubscribeProvider = onSnapshot(providerDocRef, (snapshot) => {
              if (snapshot.exists()) {
                const data = snapshot.data();
                // Only update if data actually changed
                if (JSON.stringify(data) !== JSON.stringify(userDataRef.current)) {
                  console.log('📸 User data updated (provider)');
                  userDataRef.current = data;
                  setUserData(data);
                }
              } else {
                console.log('⚠️ Provider document no longer exists');
                userDataRef.current = null;
                setUserData(null);
              }
              setLoading(false);
            }, (error) => {
              console.error("❌ Error in provider listener:", error);
              setLoading(false);
            });
          } else {
            console.log("⚠️ No user data found in Firestore for:", currentUser.uid);
            userDataRef.current = null;
            setUserData(null);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("❌ Error setting up user data listeners:", error);
        userDataRef.current = null;
        setUserData(null);
        setLoading(false);
      }
    };

    setupListeners();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up database listeners');
      if (unsubscribeTourist) unsubscribeTourist();
      if (unsubscribeProvider) unsubscribeProvider();
    };
  }, [user, authUser, db]);


  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      setProfileOpen(false);
      setUserData(null);
      userDataRef.current = null;
      currentUserIdRef.current = null;
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
  }, [auth, onLogout, navigate]);

  // Handle login navigation - memoized for performance
  const handleLoginClick = useCallback(() => {
    setMenuOpen(false);
    if (onLogin) {
      onLogin('login');
    }
  }, [onLogin]);

  // Handle register navigation - memoized for performance
  const handleRegisterClick = useCallback(() => {
    setMenuOpen(false);
    if (onRegister) {
      onRegister('register');
    }
  }, [onRegister]);

  // Function to handle Home navigation - memoized for performance
  const handleHomeClick = useCallback(() => {
    navigate('/');
    setServicesDropdownOpen(false);
    setMobileServicesOpen(false);
    setMenuOpen(false);
  }, [navigate]);

  // Function to handle Jeep Driver navigation - memoized for performance
  const handleJeepDriverClick = useCallback(() => {
    navigate('/driver');
    setServicesDropdownOpen(false);
    setMobileServicesOpen(false);
    setMenuOpen(false);
  }, [navigate]);

  // Function to handle Destination navigation - memoized for performance
  const handleDestinationClick = useCallback(() => {
    navigate('/destination');
    setServicesDropdownOpen(false);
    setMobileServicesOpen(false);
    setMenuOpen(false);
  }, [navigate]);

  // Function to handle Guide navigation - memoized for performance
  const handleGuideClick = useCallback(() => {
    navigate('/guide');
    setServicesDropdownOpen(false);
    setMobileServicesOpen(false);
    setMenuOpen(false);
  }, [navigate]);

  // Function to handle Renting navigation - memoized for performance
  const handleRentClick = useCallback(() => {
    navigate('/rent');
    setServicesDropdownOpen(false);
    setMobileServicesOpen(false);
    setMenuOpen(false);
  }, [navigate]);

  // Use parent user prop if available, otherwise use local auth state
  const currentUser = user || authUser;

  // Determine user role (must be after userData is set) - memoized
  const userRole = useMemo(() => userData?.serviceType || null, [userData?.serviceType]);
  const isServiceProvider = useMemo(() => 
    Boolean(userData && (userRole === "Jeep Driver" || userRole === "Tour Guide")),
    [userData, userRole]
  );

  // Memoize profile navigation handlers
  const handleProfileClick = useCallback(() => {
    setProfileOpen(false);
    navigate('/profile');
  }, [navigate]);

  const handleFavoritesClick = useCallback(() => {
    setProfileOpen(false);
    navigate('/favorites');
  }, [navigate]);

  const handlePaymentWalletClick = useCallback(() => {
    setProfileOpen(false);
    navigate('/payment-wallet');
  }, [navigate]);

  const handleBookingHistoryClick = useCallback(() => {
    setProfileOpen(false);
    navigate('/booking-history');
  }, [navigate]);

  const handleUserSupportClick = useCallback(() => {
    setProfileOpen(false);
    setShowUserSupport(true);
  }, []);

  const handleMyBookingsClick = useCallback(() => {
    setProfileOpen(false);
    navigate('/my-bookings');
  }, [navigate]);

  // Memoize profile menu items
  const profileMenuItems = useMemo(() => {
    if (isServiceProvider) {
      // Service providers don't see My Favorites, Settings, or Help & Support
      return [];
    } else {
      return [
        { icon: User, label: "My Profile", href: "/profile", onClick: handleProfileClick },
        { icon: Calendar, label: "My Bookings", href: "/my-bookings", onClick: handleMyBookingsClick },
        { icon: Heart, label: "My Favorites", href: "/favorites", onClick: handleFavoritesClick },
        { icon: CreditCard, label: "Payment Wallet", href: "/payment-wallet", onClick: handlePaymentWalletClick },
        { icon: HelpCircle, label: "Help & Support", href: "#", onClick: handleUserSupportClick },
      ];
    }
  }, [isServiceProvider, handleProfileClick, handleMyBookingsClick, handleFavoritesClick, handlePaymentWalletClick, handleUserSupportClick]);

  // Memoize navigation handlers
  const handleAdminClick = useCallback(() => navigate("/admin"), [navigate]);
  const handleAboutClick = useCallback(() => navigate("/about"), [navigate]);

  // Memoize navigation items
  const navItems = useMemo(() => {
    if (isServiceProvider) {
      return [
        { label: "HOME", onClick: handleHomeClick, path: "/" },
        { label: "ABOUT US", onClick: handleAboutClick, path: "/about" },
        { label: "PROFILE DASHBOARD", onClick: handleAdminClick, path: "/admin" },
      ];
    }
    return [
      { label: "HOME", onClick: handleHomeClick, path: "/" },
      { label: "ABOUT US", onClick: handleAboutClick, path: "/about" },
    ];
  }, [isServiceProvider, handleHomeClick, handleAboutClick, handleAdminClick]);

  // Default user data if no user is logged in
  const defaultUserData = {
    name: "Guest User",
    email: "Please log in",
    membership: "Free Member",
    joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    avatar: userImage
  };

  // Memoize profile picture getter
  const getProfilePicture = useCallback(() => {
    if (userData?.profilePicture && userData.profilePicture.trim() !== '') {
      return userData.profilePicture;
    }
    if (currentUser?.photoURL && currentUser.photoURL.trim() !== '') {
      return currentUser.photoURL;
    }
    return userImage;
  }, [userData?.profilePicture, currentUser?.photoURL]);

  // Memoize user profile data to prevent unnecessary recalculations
  const userProfileData = useMemo(() => {
    if (!currentUser) return defaultUserData;
    
    const joinDate = userData?.createdAt 
      ? (userData.createdAt.toDate 
          ? new Date(userData.createdAt.toDate()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          : new Date(userData.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
      : "Recently";
    
    return {
      name: currentUser.displayName || userData?.fullName || userData?.fullname || "User",
      email: currentUser.email || "No email",
      membership: userData?.serviceType ? `${userData.serviceType}` : "Tourist",
      joinDate,
      avatar: getProfilePicture(),
      phone: userData?.phone || userData?.phoneNumber || "Not provided",
      location: userData?.location || userData?.country || "Not specified",
      experience: userData?.experienceYears,
      languages: userData?.languagesSpoken || userData?.preferredLanguage || "Not specified",
      role: userData?.serviceType ? "Service Provider" : "Tourist"
    };
  }, [currentUser, userData, getProfilePicture]);

  // Memoize path normalization and active path checking
  const normalizePath = useCallback((path) => {
    if (!path) return "";
    const trimmed = path === "/" ? "/" : path.replace(/\/+$/, "");
    return trimmed || "/";
  }, []);

  const currentPath = useMemo(() => normalizePath(location.pathname || "/"), [location.pathname, normalizePath]);

  const isActivePath = useCallback((path) => {
    if (!path) return false;
    const target = normalizePath(path);
    if (target === "/") {
      return currentPath === "/";
    }
    return currentPath === target || currentPath.startsWith(`${target}/`);
  }, [currentPath, normalizePath]);

  // Memoize services items to prevent recreation
  const servicesItems = useMemo(() => [
    { icon: Compass, label: "Find a Destination", onClick: handleDestinationClick, path: "/destination" },
    { icon: Map, label: "Find a Guide", onClick: handleGuideClick, path: "/guide" },
    { icon: Car, label: "Find a Jeep Driver", onClick: handleJeepDriverClick, path: "/driver" },
    { icon: ShoppingBag, label: "Find a Renting Store", onClick: handleRentClick, path: "/rent" },
  ], [handleGuideClick, handleDestinationClick, handleJeepDriverClick, handleRentClick]);

  const isServicesActive = useMemo(() => 
    servicesItems.some((item) => item.path && isActivePath(item.path)),
    [servicesItems, isActivePath]
  );

  // Memoize dropdown handlers
  const handleServicesMouseEnter = useCallback(() => setServicesDropdownOpen(true), []);
  const handleServicesMouseLeave = useCallback(() => setServicesDropdownOpen(false), []);

  return (
    <>
      {/* Navbar - Modern Full Width - Optimized for performance */}
      <nav className={`fixed top-0 left-0 right-0 w-full text-white flex items-center justify-between px-4 sm:px-6 md:px-8 lg:px-12 py-3 z-50 h-16 border-b border-gray-700/40 transition-[background-color,backdrop-filter,box-shadow] duration-200 ease-out will-change-[background-color,backdrop-filter,box-shadow] transform-gpu ${isScrolled
        ? 'bg-black/95 backdrop-blur-md shadow-lg shadow-black/20'
        : 'bg-black/90 backdrop-blur-sm shadow-md shadow-black/10'
        }`}>
        {/* Left side - Logo */}
        <div className="flex items-center space-x-3 flex-shrink-0 z-10">
          <img
            src={logo}
            alt="SafariHub Logo"
            className="h-14 sm:h-16 md:h-16 lg:h-16 w-auto object-contain cursor-pointer transition-transform duration-200 ease-out will-change-transform"
            onClick={handleHomeClick}
            loading="eager"
            decoding="async"
          />
        </div>

        {/* Center - Desktop Links */}
        <div className="hidden md:flex items-center space-x-4 lg:space-x-6 xl:space-x-8 absolute left-1/2 transform -translate-x-1/2">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`text-sm lg:text-base font-medium px-3 lg:px-4 py-2 rounded-lg transition-all duration-200 ease-out cursor-pointer whitespace-nowrap will-change-[background-color,color] ${isActivePath(item.path)
                ? "bg-gray-800/70 text-gray-100 border border-gray-500/40 shadow-inner"
                : "text-gray-100 hover:text-white hover:bg-gray-800/30"
                }`}
            >
              {item.label}
            </button>
          ))}

          {/* Services Dropdown - Only show for tourists, hide for service providers (jeep drivers & guides) */}
          {/* Wait for user data to load before showing to prevent glitch */}
          {!loading && !isServiceProvider && (
            <div
              className="relative"
              onMouseEnter={handleServicesMouseEnter}
              onMouseLeave={handleServicesMouseLeave}
            >
              <button
                className={`text-sm lg:text-base font-medium px-3 lg:px-4 py-2 rounded-lg transition-all duration-200 ease-out flex items-center gap-1 cursor-pointer whitespace-nowrap will-change-[background-color,color] ${isServicesActive
                  ? "bg-gray-800/70 text-gray-100 border border-gray-500/40 shadow-inner"
                  : "text-gray-100 hover:text-white hover:bg-gray-800/30"
                  }`}
              >
                OUR SERVICES
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ease-out will-change-transform ${servicesDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Invisible connecting bridge to prevent gap */}
              <div
                className="absolute top-full left-0 w-full h-2 bg-transparent"
                onMouseEnter={handleServicesMouseEnter}
              ></div>

              {/* Dropdown Menu */}
              {servicesDropdownOpen && (
                <div
                  className="absolute top-full left-0 w-64 bg-black/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-700/40 overflow-hidden animate-fadeIn mt-2 will-change-[opacity,transform] transform-gpu"
                  style={{ contain: 'layout style paint' }}
                  onMouseEnter={handleServicesMouseEnter}
                  onMouseLeave={handleServicesMouseLeave}
                >
                  <div className="py-2">
                    {servicesItems.map((item, index) => {
                      const IconComponent = item.icon;
                      return (
                        <button
                          key={item.label}
                          onClick={item.onClick}
                          className={`flex items-center gap-3 px-4 py-3 text-white transition-all duration-200 ease-out group cursor-pointer w-full text-left will-change-[background-color,color] ${item.path && isActivePath(item.path)
                            ? "bg-gray-800 text-gray-100"
                            : "hover:bg-gray-800 hover:text-white"
                            }`}
                          style={{ animationDelay: `${index * 30}ms` }}
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
          )}
        </div>

        {/* Right side - User Authentication Buttons or Profile */}
        <div className="hidden md:flex items-center space-x-2 lg:space-x-3 flex-shrink-0 z-10 ml-auto">
          {!currentUser ? (
            <>
              <button
                onClick={handleLoginClick}
                className="bg-white hover:bg-gray-100 text-black px-4 lg:px-6 py-2 lg:py-2.5 rounded-lg font-semibold transition-all duration-200 ease-out hover:shadow-lg hover:scale-105 backdrop-blur-sm border border-gray-300 shadow-lg shadow-black/30 cursor-pointer text-sm lg:text-base whitespace-nowrap will-change-[background-color,transform,box-shadow]"
              >
                Login
              </button>
              <button
                onClick={handleRegisterClick}
                className="border-2 border-white text-white hover:bg-white hover:text-black px-4 lg:px-6 py-2 lg:py-2.5 rounded-lg font-semibold transition-all duration-200 ease-out hover:shadow-lg hover:scale-105 backdrop-blur-sm shadow-lg shadow-gray-400/20 cursor-pointer text-sm lg:text-base whitespace-nowrap will-change-[background-color,color,transform,box-shadow]"
              >
                Register
              </button>
            </>
          ) : (
            <div className="relative">
              {userProfileData.avatar && userProfileData.avatar !== userImage ? (
                <img
                  src={userProfileData.avatar}
                  alt="User"
                  className="h-9 w-9 lg:h-10 lg:w-10 rounded-full cursor-pointer hover:opacity-80 transition duration-200 ease-out border-2 border-gray-300/60 hover:border-gray-200 shadow-lg shadow-gray-500/30 object-cover will-change-[opacity,border-color]"
                  onClick={() => setProfileOpen(true)}
                  onError={(e) => {
                    console.error('❌ Profile image failed to load in navbar:', userProfileData.avatar);
                    console.error('   Attempting fallback to default image');
                    e.target.src = userImage;
                    e.target.onerror = null; // Prevent infinite loop
                  }}
                  onLoad={() => {
                    console.log('✅ Profile image loaded successfully in navbar');
                  }}
                />
              ) : (
                <div
                  className="h-9 w-9 lg:h-10 lg:w-10 rounded-full cursor-pointer hover:opacity-80 transition duration-300 border-2 border-gray-300/60 hover:border-gray-200 shadow-lg shadow-gray-500/30 bg-gray-700 flex items-center justify-center"
                  onClick={() => setProfileOpen(true)}
                >
                  <User className="h-5 w-5 lg:h-6 lg:w-6 text-gray-400" />
                </div>
              )}
              {/* Online indicator */}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-400 rounded-full border-2 border-gray-700 shadow-sm"></div>
            </div>
          )}
        </div>

        {/* Hamburger Menu (Mobile) */}
        <div className="md:hidden flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          {currentUser ? (
            <div className="flex items-center space-x-2">
              {/* User Profile for Mobile */}
              <div className="relative">
                {userProfileData.avatar && userProfileData.avatar !== userImage ? (
                  <img
                    src={userProfileData.avatar}
                    alt="User"
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full cursor-pointer hover:opacity-80 transition duration-300 border-2 border-gray-300/60 hover:border-gray-200 shadow-lg shadow-gray-500/30 object-cover"
                    onClick={() => setProfileOpen(true)}
                    onError={(e) => {
                      console.error('❌ Profile image failed to load:', userProfileData.avatar);
                      e.target.src = userImage;
                    }}
                  />
                ) : (
                  <div
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full cursor-pointer hover:opacity-80 transition duration-300 border-2 border-gray-300/60 hover:border-gray-200 shadow-lg shadow-gray-500/30 bg-gray-700 flex items-center justify-center"
                    onClick={() => setProfileOpen(true)}
                  >
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-2 h-2 bg-gray-400 rounded-full border-2 border-gray-700"></div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleLoginClick}
                className="bg-white hover:bg-gray-100 text-black px-3 py-1.5 rounded-lg font-medium transition-colors text-sm backdrop-blur-sm border border-gray-300 shadow-lg shadow-black/20 whitespace-nowrap"
              >
                Login
              </button>
            </div>
          )}
          <Menu
            className="h-7 w-7 sm:h-8 sm:w-8 text-white cursor-pointer hover:text-gray-200 transition-colors duration-300 flex-shrink-0"
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

          <div className="fixed top-0 left-0 h-full w-full bg-black text-white z-50 md:hidden animate-slideInLeft backdrop-blur-xl border-r border-gray-700/30">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/30 bg-gray-900/40 backdrop-blur-sm">
              <img
                src={logo}
                alt="SafariHub Logo"
                className="h-8 w-auto object-contain cursor-pointer"
                onClick={handleHomeClick}
              />
              <X
                className="h-8 w-8 text-white cursor-pointer hover:text-gray-200 transition-colors duration-300 bg-gray-800/30 rounded-lg p-1"
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
                    className={`block transition-all duration-300 py-5 border-b border-gray-700/20 font-medium text-xl w-full text-left animate-fadeInUp group cursor-pointer ${isActivePath(item.path)
                      ? "text-gray-100 bg-gray-900/60"
                      : "text-white hover:text-gray-200 hover:border-gray-600"
                      }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <span className="flex items-center">
                      {item.label}
                      <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">→</span>
                    </span>
                  </button>
                ))}

                {/* Services Dropdown - Only show for tourists, hide for service providers (jeep drivers & guides) */}
                {/* Wait for user data to load before showing to prevent glitch */}
                {!loading && !isServiceProvider && (
                  <div className="border-b border-gray-700/40">
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
                      <div className="pl-4 pb-2 space-y-0 animate-fadeIn border-l border-gray-700/40 ml-2">
                        {servicesItems.map((item, index) => {
                          const IconComponent = item.icon;
                          return (
                            <button
                              key={item.label}
                              onClick={() => {
                                if (item.onClick) item.onClick();
                                setMenuOpen(false);
                              }}
                              className={`flex items-center gap-3 transition-all duration-300 py-4 border-b border-gray-800/40 font-medium text-lg w-full text-left animate-fadeInUp cursor-pointer ${item.path && isActivePath(item.path)
                                ? "text-gray-100 bg-gray-900/60 border-gray-700"
                                : "text-white hover:text-gray-200 hover:border-gray-700"
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
                )}
              </div>

              {/* Authentication Buttons for Mobile - Show when NOT logged in */}
              {!currentUser && (
                <div className="space-y-3 py-4 border-t border-gray-700/20 pt-6 animate-fadeInUp"
                  style={{ animationDelay: "400ms" }}>
                  <button
                    onClick={handleLoginClick}
                    className="w-full bg-white hover:bg-gray-100 text-black py-3 rounded-xl font-semibold transition-all duration-300 text-lg hover:shadow-lg backdrop-blur-sm border border-gray-300 shadow-lg shadow-black/30 cursor-pointer"
                  >
                    Login
                  </button>
                  <button
                    onClick={handleRegisterClick}
                    className="w-full border-2 border-white text-white hover:bg-white hover:text-black py-3 rounded-xl font-semibold transition-all duration-300 text-lg hover:shadow-lg backdrop-blur-sm shadow-lg shadow-gray-400/20 cursor-pointer"
                  >
                    Register
                  </button>
                </div>
              )}

              {currentUser && (
                <div className="space-y-3 pt-6 border-t border-gray-400/20">
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
                      {userProfileData.avatar && userProfileData.avatar !== userImage ? (
                        <img
                          src={userProfileData.avatar}
                          alt="User"
                          className="h-12 w-12 rounded-full cursor-pointer hover:opacity-80 transition duration-300 border-2 border-gray-300/60 group-hover:border-gray-200 shadow-lg shadow-gray-500/30 object-cover"
                          onError={(e) => {
                            console.error('❌ Profile image failed to load:', userProfileData.avatar);
                            e.target.src = userImage;
                          }}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full cursor-pointer hover:opacity-80 transition duration-300 border-2 border-gray-300/60 group-hover:border-gray-200 shadow-lg shadow-gray-500/30 bg-gray-700 flex items-center justify-center">
                          <User className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-400 rounded-full border-2 border-gray-800"></div>
                    </div>
                    <div>
                      <span className="text-white group-hover:text-gray-200 transition-colors duration-300 font-medium text-lg block">
                        {userProfileData.name}
                      </span>
                      <span className="text-gray-200 text-sm">{userProfileData.membership}</span>
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

          <div className="fixed top-0 right-0 h-full w-[90vw] max-w-md bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white shadow-2xl border-l-2 border-gray-700/50 overflow-hidden z-50 animate-slideInRight">
            {/* Close Button - Top Right - Fixed position to stay visible when scrolling */}
            <div className="fixed top-4 right-4 z-[60]">
              <button
                onClick={() => setProfileOpen(false)}
                className="p-2 cursor-pointer bg-gray-800/80 rounded-full hover:bg-gray-700/80 transition-colors backdrop-blur-sm"
                aria-label="Close profile"
              >
                <X className="h-5 w-5 text-gray-300" />
              </button>
            </div>

            <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
              <div className="relative">
                <div className="h-40 bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-700/30 to-transparent"></div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gray-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-gray-700/10 rounded-full -ml-24 -mb-24 blur-2xl"></div>
                </div>

                <div className="px-6 pb-6 -mt-20 relative z-10">
                  <div className="relative inline-block">
                    {userProfileData.avatar && userProfileData.avatar !== userImage ? (
                      <img
                        src={userProfileData.avatar}
                        alt="User"
                        className="relative h-32 w-32 rounded-full border-4 border-gray-900 bg-gray-900 shadow-2xl shadow-gray-900/50 object-cover"
                        onError={(e) => {
                          console.error('❌ Profile image failed to load in slide panel:', userProfileData.avatar);
                          console.error('   User data:', userData);
                          console.error('   Current user:', currentUser);
                          e.target.src = userImage;
                          e.target.onerror = null; // Prevent infinite loop
                        }}
                        onLoad={() => {
                          console.log('✅ Profile image loaded successfully in slide panel');
                        }}
                      />
                    ) : (
                      <div className="relative h-32 w-32 rounded-full border-4 border-gray-900 bg-gray-800 shadow-2xl shadow-gray-900/50 flex items-center justify-center">
                        <User className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 w-4 h-4 bg-gray-400 rounded-full border-2 border-gray-900 shadow-lg shadow-gray-500/50 animate-pulse"></div>
                  </div>

                  <div className="mt-4 animate-fadeInUp" style={{ animationDelay: "100ms" }}>
                    <h2 className="text-2xl font-bold text-white">{userProfileData.name}</h2>
                    <p className="text-gray-300 text-sm mt-1">{userProfileData.email}</p>
                    <div className="flex flex-col gap-2 mt-3">
                      <span className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-1.5 rounded-full text-xs font-bold w-fit shadow-lg shadow-gray-700/50 border border-gray-500/30">
                        {userProfileData.membership}
                      </span>
                      <span className="text-gray-400 text-sm flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Member since {userProfileData.joinDate}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {userData && (
                <div className="px-6 py-5 border-y border-gray-700/30 bg-gradient-to-b from-gray-800/50 to-gray-900/50 backdrop-blur-sm animate-fadeInUp" style={{ animationDelay: "200ms" }}>
                  <h3 className="text-lg font-bold text-gray-400 mb-4 flex items-center gap-2">
                    <div className="p-1.5 bg-gray-800/50 rounded-lg border border-gray-600/30">
                      <User className="h-4 w-4 text-gray-300" />
                    </div>
                    Profile Information
                  </h3>
                  <div className="space-y-3">
                    {userProfileData.phone !== "Not provided" && (
                      <div className="flex items-center gap-3 text-sm p-2 rounded-lg bg-gray-800/30 border border-gray-700/30">
                        <div className="p-1.5 bg-gray-800/40 rounded-lg border border-gray-700/30">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                        </div>
                        <span className="text-gray-300 font-medium">Phone: </span>
                        <span className="text-white">{userProfileData.phone}</span>
                      </div>
                    )}

                    {userProfileData.location !== "Not specified" && (
                      <div className="flex items-center gap-3 text-sm p-2 rounded-lg bg-gray-800/30 border border-gray-700/30">
                        <div className="p-1.5 bg-gray-800/40 rounded-lg border border-gray-700/30">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        </div>
                        <span className="text-gray-300 font-medium">
                          {userProfileData.role === "Service Provider" ? "Location: " : "Country: "}
                        </span>
                        <span className="text-white">{userProfileData.location}</span>
                      </div>
                    )}

                    {userProfileData.languages !== "Not specified" && (
                      <div className="flex items-center gap-3 text-sm p-2 rounded-lg bg-gray-800/30 border border-gray-700/30">
                        <div className="p-1.5 bg-gray-800/40 rounded-lg border border-gray-700/30">
                          <Globe className="h-3.5 w-3.5 text-gray-400" />
                        </div>
                        <span className="text-gray-300 font-medium">
                          {userProfileData.role === "Service Provider" ? "Languages: " : "Preferred Language: "}
                        </span>
                        <span className="text-white">{userProfileData.languages}</span>
                      </div>
                    )}

                    {userProfileData.experience && (
                      <div className="flex items-center gap-3 text-sm p-2 rounded-lg bg-gray-800/30 border border-gray-700/30">
                        <div className="p-1.5 bg-gray-800/40 rounded-lg border border-gray-700/30">
                          <Award className="h-3.5 w-3.5 text-gray-400" />
                        </div>
                        <span className="text-gray-300 font-medium">Experience: </span>
                        <span className="text-white">{userProfileData.experience} years</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-sm p-2 rounded-lg bg-gray-800/30 border border-gray-700/30">
                      <div className="p-1.5 bg-gray-800/40 rounded-lg border border-gray-700/30">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                      </div>
                      <span className="text-gray-300 font-medium">Role: </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${userProfileData.role === "Service Provider"
                        ? "bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg shadow-gray-700/50 border border-gray-500/30"
                        : "bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg shadow-gray-600/50 border border-gray-400/30"
                        }`}>
                        {userProfileData.role}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Button for Service Providers */}
              {isServiceProvider && (
                <div className="p-6 pb-4 space-y-2 bg-gradient-to-b from-gray-900 to-black animate-fadeInUp" style={{ animationDelay: "400ms" }}>
                  {/* My Profile */}
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/admin?tab=profile');
                    }}
                    className="w-full flex items-center gap-4 p-3.5 rounded-xl cursor-pointer border border-gray-600/50 animate-fadeInUp bg-gray-800/20 hover:bg-gray-800/30 transition-colors"
                    style={{ animationDelay: "500ms" }}
                  >
                    <div className="p-2 bg-gray-700/50 rounded-lg border border-gray-600/50">
                      <User className="h-5 w-5 text-gray-300" />
                    </div>
                    <span className="font-medium text-gray-200">
                      My Profile
                    </span>
                  </button>

                  {/* My Bookings */}
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/admin?tab=bookings');
                    }}
                    className="w-full flex items-center gap-4 p-3.5 rounded-xl cursor-pointer border border-gray-600/50 animate-fadeInUp bg-gray-800/20 hover:bg-gray-800/30 transition-colors"
                    style={{ animationDelay: "550ms" }}
                  >
                    <div className="p-2 bg-gray-700/50 rounded-lg border border-gray-600/50">
                      <Calendar className="h-5 w-5 text-gray-300" />
                    </div>
                    <span className="font-medium text-gray-200">
                      My Bookings
                    </span>
                  </button>

                  {/* Help & Support */}
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      setShowProviderSupport(true);
                    }}
                    className="w-full flex items-center gap-4 p-3.5 rounded-xl cursor-pointer border border-gray-600/50 animate-fadeInUp bg-gray-800/20 hover:bg-gray-800/30 transition-colors"
                    style={{ animationDelay: "600ms" }}
                  >
                    <div className="p-2 bg-gray-700/50 rounded-lg border border-gray-600/50">
                      <HelpCircle className="h-5 w-5 text-gray-300" />
                    </div>
                    <span className="font-medium text-gray-200">
                      Help & Support
                    </span>
                  </button>

                </div>
              )}

              {profileMenuItems.length > 0 && (
                <div className={`p-6 space-y-2 bg-gradient-to-b from-gray-900 to-black animate-fadeInUp ${isServiceProvider ? 'pt-4' : ''}`} style={{ animationDelay: "400ms" }}>
                  {profileMenuItems.map((item, index) => {
                    const IconComponent = item.icon;
                    return (
                      <a
                        key={item.label}
                        href={item.href}
                        className="flex items-center gap-4 p-3.5 rounded-xl cursor-pointer border border-gray-700/30 animate-fadeInUp hover:bg-gray-800/30 transition-colors relative"
                        style={{ animationDelay: `${index * 50 + 500}ms` }}
                        onClick={(e) => {
                          e.preventDefault();
                          if (item.onClick) {
                            item.onClick();
                          } else {
                            setProfileOpen(false);
                          }
                        }}
                      >
                        <div className="p-2 bg-gray-800/30 rounded-lg border border-gray-700/30">
                          <IconComponent className="h-5 w-5 text-gray-400" />
                        </div>
                        <span className="font-medium text-gray-300">
                          {item.label}
                        </span>
                      </a>
                    );
                  })}
                </div>
              )}

              <div className="px-6 py-5 border-t border-gray-700/30 bg-gradient-to-b from-gray-900 to-black mt-auto animate-fadeInUp" style={{ animationDelay: "600ms" }}>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-4 p-3.5 rounded-xl text-red-400 w-full border border-red-700/30 cursor-pointer"
                >
                  <div className="p-2 bg-red-700/20 rounded-lg border border-red-600/30">
                    <LogOut className="h-5 w-5" />
                  </div>
                  <span className="font-medium">Log Out</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Help & Support Chat Modal for Service Providers */}
      {showProviderSupport && currentUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl h-[90vh] bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HelpCircle className="h-6 w-6" />
                <div>
                  <h3 className="font-semibold text-lg">Help & Support</h3>
                  <p className="text-xs text-emerald-100">Chat with Admin</p>
                </div>
              </div>
              <button
                onClick={() => setShowProviderSupport(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Close support chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Chat Component */}
            <div className="h-[calc(100%-4rem)]">
              <Chat
                user={currentUser}
                otherUserId="admin-support"
                otherUserName="Admin Support"
                otherUserPhoto=""
                onClose={() => setShowProviderSupport(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Help & Support Chat Modal for Users/Tourists */}
      {showUserSupport && currentUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl h-[90vh] bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HelpCircle className="h-6 w-6" />
                <div>
                  <h3 className="font-semibold text-lg">Help & Support</h3>
                  <p className="text-xs text-emerald-100">Chat with Admin</p>
                </div>
              </div>
              <button
                onClick={() => setShowUserSupport(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Close support chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Chat Component */}
            <div className="h-[calc(100%-4rem)]">
              <Chat
                user={currentUser}
                otherUserId="admin-support"
                otherUserName="Admin Support"
                otherUserPhoto=""
                onClose={() => setShowUserSupport(false)}
              />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { 
            transform: translate3d(100%, 0, 0);
            opacity: 0;
          }
          to { 
            transform: translate3d(0, 0, 0);
            opacity: 1;
          }
        }
        @keyframes slideInLeft {
          from { transform: translate3d(-100%, 0, 0); }
          to { transform: translate3d(0, 0, 0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { 
            opacity: 0; 
            transform: translate3d(0, 20px, 0);
          }
          to { 
            opacity: 1; 
            transform: translate3d(0, 0, 0);
          }
        }
        .animate-slideInRight { 
          animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          will-change: transform, opacity;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        .animate-slideInLeft { 
          animation: slideInLeft 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          will-change: transform;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        .animate-fadeIn { 
          animation: fadeIn 0.15s ease-out forwards;
          will-change: opacity;
        }
        .animate-fadeInUp { 
          animation: fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
          opacity: 0;
          will-change: opacity, transform;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(107, 114, 128, 0.5);
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.7);
        }
      `}</style>
    </>
  );
}