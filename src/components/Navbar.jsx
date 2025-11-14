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
import { getAuth, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";

// Import images from src/assets
import logo from "../assets/logo.png";
import userImage from "../assets/user.png";

export default function Navbar({ user, onLogout, onLogin, onRegister }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);

  const auth = getAuth();
  const db = getFirestore();
  const navigate = useNavigate();
  const location = useLocation();

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
      if (user && profileOpen) {
        setLoading(true);
        try {
          let userDocRef;
          
          // Try tourists collection first
          userDocRef = doc(db, "tourists", user.uid);
          let userDoc = await getDoc(userDocRef);
          
          // If not found in tourists, try serviceProviders
          if (!userDoc.exists()) {
            userDocRef = doc(db, "serviceProviders", user.uid);
            userDoc = await getDoc(userDocRef);
          }
          
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          } else {
            console.log("No user data found in Firestore");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserData();
  }, [user, profileOpen, db]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setProfileOpen(false);
      setUserData(null);
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Handle login navigation - only navigate if we're not already on auth pages
  const handleLoginClick = () => {
    if (onLogin) {
      onLogin();
    } else {
      // If no onLogin prop provided (like on JeepDriver page), navigate to home for auth
      navigate('/');
      // You might want to add a state to indicate login should open
    }
  };

  // Handle register navigation - only navigate if we're not already on auth pages
  const handleRegisterClick = () => {
    if (onRegister) {
      onRegister();
    } else {
      // If no onRegister prop provided (like on JeepDriver page), navigate to home for auth
      navigate('/');
      // You might want to add a state to indicate register should open
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

  // Check if we're on the auth screen (login/register)
  const isOnAuthScreen = location.pathname === '/' && (window.location.hash === '#login' || window.location.hash === '#register');

  // Check if we're on the JeepDriver page
  const isOnJeepDriverPage = location.pathname === '/driver';

  const profileMenuItems = [
    { icon: User, label: "My Profile", href: "#" },
    { icon: Heart, label: "My Favorites", href: "#" },
    { icon: Calendar, label: "My Bookings", href: "#" },
    { icon: CreditCard, label: "Payment Methods", href: "#" },
    { icon: Settings, label: "Settings", href: "#" },
    { icon: HelpCircle, label: "Help & Support", href: "#" },
  ];

  const servicesItems = [
    { icon: Map, label: "Find a Guide", href: "#guides" },
    { icon: Compass, label: "Explore Destinations", href: "#destinations" },
    { icon: Car, label: "Find a Jeep Driver", onClick: handleJeepDriverClick },
    { icon: ShoppingBag, label: "Rent Equipment", href: "#equipment" },
  ];

  // Navigation items
  const navItems = [
    { label: "HOME", onClick: handleHomeClick },
    { label: "ABOUT US", href: "#" },
  ];

  // Default user data if no user is logged in
  const defaultUserData = {
    name: "Guest User",
    email: "Please log in",
    membership: "Free Member",
    joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    avatar: userImage
  };

  const currentUser = user ? {
    name: user.displayName || userData?.fullName || userData?.fullname || "User",
    email: user.email || "No email",
    membership: userData?.serviceType ? `${userData.serviceType}` : "Tourist",
    joinDate: userData?.createdAt ? new Date(userData.createdAt.toDate()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "Recently",
    avatar: user.photoURL || userData?.profilePicture || userImage,
    phone: userData?.phone || userData?.phoneNumber || "Not provided",
    location: userData?.location || userData?.country || "Not specified",
    experience: userData?.experienceYears,
    languages: userData?.languagesSpoken || userData?.preferredLanguage || "Not specified",
    role: userData?.serviceType ? "Service Provider" : "Tourist"
  } : defaultUserData;

  return (
    <>
      {/* Navbar - Bright Green */}
      <nav className={`fixed top-4 left-1/2 transform -translate-x-1/2 w-[95%] max-w-6xl text-white flex items-center justify-between px-6 md:px-12 py-3 z-50 h-16 rounded-2xl border border-emerald-300/30 transition-all duration-300 ${
        isScrolled 
          ? 'bg-emerald-500 shadow-2xl shadow-emerald-900/40' 
          : 'bg-emerald-500 shadow-2xl shadow-emerald-800/30'
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
              className="hover:text-emerald-200 transition-colors duration-300 text-sm md:text-base font-medium hover:scale-105 transform relative group"
            >
              {item.label}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-200 transition-all duration-300 group-hover:w-full"></span>
            </button>
          ))}

          {/* Services Dropdown */}
          <div 
            className="relative"
            onMouseEnter={() => setServicesDropdownOpen(true)}
            onMouseLeave={() => setServicesDropdownOpen(false)}
          >
            <button className="hover:text-emerald-200 transition-colors duration-300 text-sm md:text-base font-medium hover:scale-105 transform relative group flex items-center gap-1">
              OUR SERVICES
              <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${servicesDropdownOpen ? 'rotate-180' : ''}`} />
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-200 transition-all duration-300 group-hover:w-full"></span>
            </button>

            {/* Invisible connecting bridge to prevent gap */}
            <div 
              className="absolute top-full left-0 w-full h-2 bg-transparent"
              onMouseEnter={() => setServicesDropdownOpen(true)}
            ></div>

            {/* Dropdown Menu */}
            {servicesDropdownOpen && (
              <div 
                className="absolute top-full left-0 w-64 bg-emerald-600/95 backdrop-blur-xl rounded-xl shadow-2xl border border-emerald-400/30 overflow-hidden animate-fadeIn mt-2"
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
                        className="flex items-center gap-3 px-4 py-3 text-white hover:bg-emerald-500 hover:text-white transition-all duration-300 group cursor-pointer w-full text-left"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <IconComponent className="h-4 w-4 text-emerald-200 group-hover:text-white" />
                        <span className="font-medium text-sm">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* User Icon - Only show if user is logged in */}
          {user ? (
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt="User"
                className="h-10 w-10 rounded-full cursor-pointer hover:opacity-80 transition duration-300 border-2 border-emerald-300/60 hover:border-emerald-200 shadow-lg shadow-emerald-500/30"
                onClick={() => setProfileOpen(true)}
              />
              {/* Online indicator */}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-emerald-700 shadow-sm"></div>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLoginClick}
                className="bg-white hover:bg-emerald-100 text-emerald-700 px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 backdrop-blur-sm border border-emerald-300 shadow-lg shadow-emerald-500/30"
              >
                Login
              </button>
              <button
                onClick={handleRegisterClick}
                className="border-2 border-white text-white hover:bg-white hover:text-emerald-700 px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 backdrop-blur-sm shadow-lg shadow-emerald-400/20"
              >
                Register
              </button>
            </div>
          )}
        </div>

        {/* Hamburger Menu (Mobile) */}
        <div className="md:hidden flex items-center space-x-4">
          {user ? (
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt="User"
                className="h-8 w-8 rounded-full cursor-pointer hover:opacity-80 transition duration-300 border-2 border-emerald-300/60 hover:border-emerald-200 shadow-lg shadow-emerald-500/30"
                onClick={() => setProfileOpen(true)}
              />
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full border-2 border-emerald-700"></div>
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
                    className="block text-white hover:text-emerald-200 transition-all duration-300 py-5 border-b border-emerald-400/20 hover:border-emerald-300 font-medium text-xl w-full text-left animate-fadeInUp group"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <span className="flex items-center">
                      {item.label}
                      <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">→</span>
                    </span>
                  </button>
                ))}

                <div className="border-b border-emerald-400/20">
                  <button
                    onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                    className="flex items-center justify-between w-full text-white hover:text-emerald-200 transition-all duration-300 py-5 font-medium text-xl text-left animate-fadeInUp group"
                    style={{ animationDelay: "200ms" }}
                  >
                    <span className="flex items-center">
                      OUR SERVICES
                      <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">→</span>
                    </span>
                    <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${mobileServicesOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {mobileServicesOpen && (
                    <div className="pl-4 pb-2 space-y-0 animate-fadeIn border-l border-emerald-400/20 ml-2">
                      {servicesItems.map((item, index) => {
                        const IconComponent = item.icon;
                        return (
                          <button
                            key={item.label}
                            onClick={() => {
                              if (item.onClick) item.onClick();
                              setMenuOpen(false);
                            }}
                            className="flex items-center gap-3 text-white hover:text-emerald-200 transition-all duration-300 py-4 border-b border-emerald-400/10 hover:border-emerald-300 font-medium text-lg w-full text-left animate-fadeInUp cursor-pointer"
                            style={{ animationDelay: `${index * 50 + 300}ms` }}
                          >
                            <IconComponent className="h-4 w-4 text-emerald-300" />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {!user && (
                <div className="space-y-3 py-4 border-t border-emerald-400/20 pt-6 animate-fadeInUp"
                     style={{ animationDelay: "400ms" }}>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleLoginClick();
                    }}
                    className="w-full bg-white hover:bg-emerald-100 text-emerald-700 py-3 rounded-xl font-semibold transition-all duration-300 text-lg hover:shadow-lg backdrop-blur-sm border border-emerald-300 shadow-lg shadow-emerald-500/30"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleRegisterClick();
                    }}
                    className="w-full border-2 border-white text-white hover:bg-white hover:text-emerald-700 py-3 rounded-xl font-semibold transition-all duration-300 text-lg hover:shadow-lg backdrop-blur-sm shadow-lg shadow-emerald-400/20"
                  >
                    Register
                  </button>
                </div>
              )}

              {user && (
                <div
                  className="flex items-center space-x-3 py-4 border-t border-emerald-400/20 pt-6 animate-fadeInUp cursor-pointer group"
                  style={{ animationDelay: "400ms" }}
                  onClick={() => {
                    setMenuOpen(false);
                    setProfileOpen(true);
                  }}
                >
                  <div className="relative">
                    <img
                      src={currentUser.avatar}
                      alt="User"
                      className="h-12 w-12 rounded-full cursor-pointer hover:opacity-80 transition duration-300 border-2 border-emerald-300/60 group-hover:border-emerald-200 shadow-lg shadow-emerald-500/30"
                    />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-emerald-800"></div>
                  </div>
                  <div>
                    <span className="text-white group-hover:text-emerald-200 transition-colors duration-300 font-medium text-lg block">
                      {currentUser.name}
                    </span>
                    <span className="text-emerald-200 text-sm">{currentUser.membership}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Profile Side Panel */}
      {profileOpen && user && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-70 z-40 backdrop-blur-sm animate-fadeIn"
            onClick={() => setProfileOpen(false)}
          />

          <div className="fixed top-0 right-0 h-full w-[90vw] max-w-md bg-black text-white shadow-2xl border-l border-yellow-500/30 overflow-hidden z-50 animate-slideInRight">
            <div className="absolute top-4 left-4 z-10">
              <X
                className="h-6 w-6 text-yellow-400 cursor-pointer hover:text-yellow-300 transition-colors duration-300 bg-yellow-500/20 rounded-full p-1 border border-yellow-500/30"
                onClick={() => setProfileOpen(false)}
              />
            </div>

            <div className="h-full overflow-y-auto">
              <div className="relative">
                <div className="h-32 bg-gradient-to-r from-yellow-500 to-yellow-400"></div>
                
                <div className="px-6 pb-6 -mt-16">
                  <div className="relative inline-block">
                    <img
                      src={currentUser.avatar}
                      alt="User"
                      className="h-24 w-24 rounded-full border-4 border-black bg-black shadow-lg shadow-yellow-500/30"
                    />
                    <div className="absolute bottom-2 right-2 w-4 h-4 bg-yellow-400 rounded-full border-2 border-black shadow-sm"></div>
                  </div>

                  <div className="mt-4">
                    <h2 className="text-2xl font-bold text-white">{currentUser.name}</h2>
                    <p className="text-yellow-200 text-sm mt-1">{currentUser.email}</p>
                    <div className="flex flex-col gap-2 mt-3">
                      <span className="bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold w-fit shadow-lg shadow-yellow-500/30">
                        {currentUser.membership}
                      </span>
                      <span className="text-yellow-300 text-sm">
                        Member since {currentUser.joinDate}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {!loading && userData && (
                <div className="px-6 py-4 border-y border-yellow-500/20 bg-gray-900">
                  <h3 className="text-lg font-bold text-yellow-400 mb-3 flex items-center gap-2">
                    <User className="h-5 w-5 text-yellow-400" />
                    Profile Information
                  </h3>
                  <div className="space-y-3">
                    {currentUser.phone !== "Not provided" && (
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="h-4 w-4 text-yellow-400" />
                        <span className="text-yellow-300">Phone: </span>
                        <span className="text-white">{currentUser.phone}</span>
                      </div>
                    )}
                    
                    {currentUser.location !== "Not specified" && (
                      <div className="flex items-center gap-3 text-sm">
                        <MapPin className="h-4 w-4 text-yellow-400" />
                        <span className="text-yellow-300">
                          {currentUser.role === "Service Provider" ? "Location: " : "Country: "}
                        </span>
                        <span className="text-white">{currentUser.location}</span>
                      </div>
                    )}
                    
                    {currentUser.languages !== "Not specified" && (
                      <div className="flex items-center gap-3 text-sm">
                        <Globe className="h-4 w-4 text-yellow-400" />
                        <span className="text-yellow-300">
                          {currentUser.role === "Service Provider" ? "Languages: " : "Preferred Language: "}
                        </span>
                        <span className="text-white">{currentUser.languages}</span>
                      </div>
                    )}
                    
                    {currentUser.experience && (
                      <div className="flex items-center gap-3 text-sm">
                        <Award className="h-4 w-4 text-yellow-400" />
                        <span className="text-yellow-300">Experience: </span>
                        <span className="text-white">{currentUser.experience} years</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3 text-sm">
                      <User className="h-4 w-4 text-yellow-400" />
                      <span className="text-yellow-300">Role: </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        currentUser.role === "Service Provider" 
                          ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/30" 
                          : "bg-yellow-600 text-black shadow-lg shadow-yellow-600/30"
                      }`}>
                        {currentUser.role}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {loading && (
                <div className="px-6 py-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
                  <p className="text-yellow-300 mt-2">Loading profile...</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 px-6 py-4 border-y border-yellow-500/20 bg-gray-900">
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-400">12</div>
                  <div className="text-xs text-yellow-300">Trips</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-400">8</div>
                  <div className="text-xs text-yellow-300">Favorites</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-400">2</div>
                  <div className="text-xs text-yellow-300">Upcoming</div>
                </div>
              </div>

              <div className="p-6 space-y-2 bg-black">
                {profileMenuItems.map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-yellow-500/20 transition-all duration-300 group cursor-pointer animate-fadeInUp border border-yellow-500/20 hover:border-yellow-400/50"
                      style={{ animationDelay: `${index * 50 + 200}ms` }}
                      onClick={() => setProfileOpen(false)}
                    >
                      <div className="p-2 bg-yellow-500/20 rounded-lg group-hover:bg-yellow-500 group-hover:text-black transition-all duration-300 border border-yellow-500/30">
                        <IconComponent className="h-5 w-5 text-yellow-400 group-hover:text-black" />
                      </div>
                      <span className="font-medium text-yellow-300 group-hover:text-yellow-200">
                        {item.label}
                      </span>
                    </a>
                  );
                })}
              </div>

              <div className="px-6 py-4 border-t border-yellow-500/20 bg-gray-900 mt-auto">
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-red-600/40 text-red-400 hover:text-red-300 transition-all duration-300 w-full group border border-red-500/30 hover:border-red-400/50"
                >
                  <div className="p-2 bg-red-600/20 rounded-lg group-hover:bg-red-500 group-hover:text-white transition-all duration-300 border border-red-500/30">
                    <LogOut className="h-5 w-5" />
                  </div>
                  <span className="font-medium">Log Out</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
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
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideInRight { animation: slideInRight 0.3s ease-out forwards; }
        .animate-slideInLeft { animation: slideInLeft 0.3s ease-out forwards; }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
        .animate-fadeInUp { animation: fadeInUp 0.4s ease-out forwards; opacity: 0; }
      `}</style>
    </>
  );
}