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
  Award
} from "lucide-react";
import { getAuth, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

// Import images from src/assets
import logo from "../assets/logo.png";
import userImage from "../assets/user.png";

export default function Navbar({ user, onLogout, onLogin, onRegister }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const db = getFirestore();

  // Fetch user data from Firestore when profile opens or user changes
  useEffect(() => {
    const fetchUserData = async () => {
      if (user && profileOpen) {
        setLoading(true);
        try {
          // Determine which collection to query based on user role
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

  const handleLoginClick = () => {
    if (onLogin) {
      onLogin();
    }
  };

  const handleRegisterClick = () => {
    if (onRegister) {
      onRegister();
    }
  };

  const profileMenuItems = [
    { icon: User, label: "My Profile", href: "#" },
    { icon: Heart, label: "My Favorites", href: "#" },
    { icon: Calendar, label: "My Bookings", href: "#" },
    { icon: CreditCard, label: "Payment Methods", href: "#" },
    { icon: Settings, label: "Settings", href: "#" },
    { icon: HelpCircle, label: "Help & Support", href: "#" },
  ];

  // Default user data if no user is logged in
  const defaultUserData = {
    name: "Guest User",
    email: "Please log in",
    membership: "Free Member",
    joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    avatar: userImage
  };

  // In Navbar.jsx, update the currentUser object:
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
      {/* Navbar */}
      <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 w-[95%] max-w-6xl bg-gradient-to-r from-safari-dark via-safari-medium to-safari-dark text-white flex items-center justify-between px-6 md:px-12 py-3 shadow-safari z-50 h-16 rounded-2xl border border-safari-border backdrop-blur-sm">
        {/* Left side - Logo */}
        <div className="flex items-center space-x-3">
          <img
            src={logo}
            alt="SafariHub Logo"
            className="h-12 md:h-40 w-auto object-contain"
          />
        </div>

        {/* Right side - Desktop Links */}
        <div className="hidden md:flex items-center space-x-10">
          {["HOME", "ABOUT US", "OUR SERVICES", "RENTS"].map((link) => (
            <a
              key={link}
              href="#"
              className="hover:text-safari-gold transition-colors duration-300 text-sm md:text-base font-medium hover:scale-105 transform relative group"
            >
              {link}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-safari-gold transition-all duration-300 group-hover:w-full"></span>
            </a>
          ))}

          {/* User Icon - Only show if user is logged in */}
          {user ? (
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt="User"
                className="h-10 w-10 rounded-full cursor-pointer hover:opacity-80 transition duration-300 border-2 border-safari-light hover:border-safari-gold"
                onClick={() => setProfileOpen(true)}
              />
              {/* Online indicator */}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-safari-dark"></div>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLoginClick}
                className="bg-safari-gold hover:bg-safari-gold-dark text-safari-dark px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105"
              >
                Login
              </button>
              <button
                onClick={handleRegisterClick}
                className="border-2 border-safari-gold text-safari-gold hover:bg-safari-gold hover:text-safari-dark px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105"
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
                className="h-8 w-8 rounded-full cursor-pointer hover:opacity-80 transition duration-300 border-2 border-safari-light hover:border-safari-gold"
                onClick={() => setProfileOpen(true)}
              />
              {/* Online indicator */}
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-safari-dark"></div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleLoginClick}
                className="bg-safari-gold hover:bg-safari-gold-dark text-safari-dark px-3 py-1.5 rounded-lg font-medium transition-colors text-sm"
              >
                Login
              </button>
            </div>
          )}
          <Menu
            className="h-8 w-8 text-white cursor-pointer hover:text-safari-gold transition-colors duration-300"
            onClick={() => setMenuOpen(true)}
          />
        </div>
      </nav>

      {/* Mobile Navigation Side Panel */}
      {menuOpen && (
        <>
          {/* Full screen overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-70 z-40 backdrop-blur-sm md:hidden animate-fadeIn"
            onClick={() => setMenuOpen(false)}
          />

          {/* Side panel */}
          <div className="fixed top-0 left-0 h-full w-full bg-gradient-to-br from-safari-dark via-safari-medium to-safari-dark text-white z-50 md:hidden animate-slideInLeft">
            {/* Close header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-safari-border bg-safari-dark/80 backdrop-blur-sm">
              <img
                src={logo}
                alt="SafariHub Logo"
                className="h-8 w-auto object-contain"
              />
              <X
                className="h-8 w-8 text-white cursor-pointer hover:text-safari-gold transition-colors duration-300"
                onClick={() => setMenuOpen(false)}
              />
            </div>

            {/* Navigation content */}
            <div className="h-full flex flex-col justify-between px-6 py-6">
              {/* Navigation Links */}
              <div className="space-y-0">
                {["HOME", "ABOUT US", "OUR SERVICES", "RENTS"].map(
                  (link, index) => (
                    <a
                      key={link}
                      href="#"
                      onClick={() => setMenuOpen(false)}
                      className="block text-white hover:text-safari-gold transition-all duration-300 py-5 border-b border-safari-border hover:border-safari-gold font-medium text-xl w-full text-left animate-fadeInUp group"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <span className="flex items-center">
                        {link}
                        <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">→</span>
                      </span>
                    </a>
                  )
                )}
              </div>

              {/* Auth Buttons - Show when user is NOT logged in */}
              {!user && (
                <div className="space-y-3 py-4 border-t border-safari-border pt-6 animate-fadeInUp"
                     style={{ animationDelay: "400ms" }}>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleLoginClick();
                    }}
                    className="w-full bg-safari-gold hover:bg-safari-gold-dark text-safari-dark py-3 rounded-xl font-semibold transition-all duration-300 text-lg hover:shadow-lg"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleRegisterClick();
                    }}
                    className="w-full border-2 border-safari-gold text-safari-gold hover:bg-safari-gold hover:text-safari-dark py-3 rounded-xl font-semibold transition-all duration-300 text-lg hover:shadow-lg"
                  >
                    Register
                  </button>
                </div>
              )}

              {/* User section - Only show if user is logged in */}
              {user && (
                <div
                  className="flex items-center space-x-3 py-4 border-t border-safari-border pt-6 animate-fadeInUp cursor-pointer group"
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
                      className="h-12 w-12 rounded-full cursor-pointer hover:opacity-80 transition duration-300 border-2 border-safari-light group-hover:border-safari-gold"
                    />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-safari-dark"></div>
                  </div>
                  <div>
                    <span className="text-white group-hover:text-safari-gold transition-colors duration-300 font-medium text-lg block">
                      {currentUser.name}
                    </span>
                    <span className="text-safari-light text-sm">{currentUser.membership}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Profile Side Panel - Fixed to open from RIGHT side */}
      {profileOpen && user && (
        <>
          {/* Full screen overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-70 z-40 backdrop-blur-sm animate-fadeIn"
            onClick={() => setProfileOpen(false)}
          />

          {/* Profile Panel - Fixed to RIGHT side */}
          <div className="fixed top-0 right-0 h-full w-[90vw] max-w-md bg-gradient-to-b from-safari-dark to-safari-medium text-white shadow-2xl border-l border-safari-border overflow-hidden z-50 animate-slideInRight">
            {/* Close button */}
            <div className="absolute top-4 left-4 z-10">
              <X
                className="h-6 w-6 text-white cursor-pointer hover:text-safari-gold transition-colors duration-300 bg-safari-dark/50 rounded-full p-1 backdrop-blur-sm"
                onClick={() => setProfileOpen(false)}
              />
            </div>

            {/* Profile Content */}
            <div className="h-full overflow-y-auto">
              {/* Profile Header */}
              <div className="relative">
                {/* Background Banner */}
                <div className="h-32 bg-gradient-to-r from-safari-gold to-safari-gold-light"></div>
                
                {/* Profile Info */}
                <div className="px-6 pb-6 -mt-16">
                  {/* Avatar */}
                  <div className="relative inline-block">
                    <img
                      src={currentUser.avatar}
                      alt="User"
                      className="h-24 w-24 rounded-full border-4 border-safari-dark bg-safari-dark"
                    />
                    <div className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-safari-dark"></div>
                  </div>

                  {/* User Details */}
                  <div className="mt-4">
                    <h2 className="text-2xl font-bold text-white">{currentUser.name}</h2>
                    <p className="text-safari-light text-sm mt-1">{currentUser.email}</p>
                    <div className="flex flex-col gap-2 mt-3">
                      <span className="bg-safari-gold text-safari-dark px-3 py-1 rounded-full text-xs font-bold w-fit">
                        {currentUser.membership}
                      </span>
                      <span className="text-safari-light text-sm">
                        Member since {currentUser.joinDate}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional User Information */}
              {!loading && userData && (
                <div className="px-6 py-4 border-y border-safari-border bg-safari-dark/20 backdrop-blur-sm">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <User className="h-5 w-5 text-safari-gold" />
                    Profile Information
                  </h3>
                  <div className="space-y-3">
                    {/* Phone Number */}
                    {currentUser.phone !== "Not provided" && (
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="h-4 w-4 text-safari-gold" />
                        <span className="text-safari-light">Phone: </span>
                        <span className="text-white">{currentUser.phone}</span>
                      </div>
                    )}
                    
                    {/* Location/Country */}
                    {currentUser.location !== "Not specified" && (
                      <div className="flex items-center gap-3 text-sm">
                        <MapPin className="h-4 w-4 text-safari-gold" />
                        <span className="text-safari-light">
                          {currentUser.role === "Service Provider" ? "Location: " : "Country: "}
                        </span>
                        <span className="text-white">{currentUser.location}</span>
                      </div>
                    )}
                    
                    {/* Languages */}
                    {currentUser.languages !== "Not specified" && (
                      <div className="flex items-center gap-3 text-sm">
                        <Globe className="h-4 w-4 text-safari-gold" />
                        <span className="text-safari-light">
                          {currentUser.role === "Service Provider" ? "Languages: " : "Preferred Language: "}
                        </span>
                        <span className="text-white">{currentUser.languages}</span>
                      </div>
                    )}
                    
                    {/* Experience Years (for providers) */}
                    {currentUser.experience && (
                      <div className="flex items-center gap-3 text-sm">
                        <Award className="h-4 w-4 text-safari-gold" />
                        <span className="text-safari-light">Experience: </span>
                        <span className="text-white">{currentUser.experience} years</span>
                      </div>
                    )}
                    
                    {/* Role Badge */}
                    <div className="flex items-center gap-3 text-sm">
                      <User className="h-4 w-4 text-safari-gold" />
                      <span className="text-safari-light">Role: </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        currentUser.role === "Service Provider" 
                          ? "bg-blue-500 text-white" 
                          : "bg-green-500 text-white"
                      }`}>
                        {currentUser.role}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="px-6 py-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-safari-gold mx-auto"></div>
                  <p className="text-safari-light mt-2">Loading profile...</p>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 px-6 py-4 border-y border-safari-border bg-safari-dark/20 backdrop-blur-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-safari-gold">12</div>
                  <div className="text-xs text-safari-light">Trips</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-safari-gold">8</div>
                  <div className="text-xs text-safari-light">Favorites</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-safari-gold">2</div>
                  <div className="text-xs text-safari-light">Upcoming</div>
                </div>
              </div>

              {/* Profile Menu */}
              <div className="p-6 space-y-2">
                {profileMenuItems.map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-safari-dark/50 transition-all duration-300 group cursor-pointer animate-fadeInUp backdrop-blur-sm"
                      style={{ animationDelay: `${index * 50 + 200}ms` }}
                      onClick={() => setProfileOpen(false)}
                    >
                      <div className="p-2 bg-safari-dark rounded-lg group-hover:bg-safari-gold group-hover:text-safari-dark transition-all duration-300">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <span className="font-medium text-safari-light group-hover:text-white">
                        {item.label}
                      </span>
                    </a>
                  );
                })}
              </div>

              {/* Logout Section */}
              <div className="px-6 py-4 border-t border-safari-border bg-safari-dark/30 mt-auto backdrop-blur-sm">
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-red-900/30 text-red-400 hover:text-red-300 transition-all duration-300 w-full group"
                >
                  <div className="p-2 bg-red-900/20 rounded-lg group-hover:bg-red-500 group-hover:text-white transition-all duration-300">
                    <LogOut className="h-5 w-5" />
                  </div>
                  <span className="font-medium">Log Out</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Custom animations and safari theme colors */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
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
          animation: slideInRight 0.3s ease-out forwards;
        }

        .animate-slideInLeft {
          animation: slideInLeft 0.3s ease-out forwards;
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.4s ease-out forwards;
          opacity: 0;
        }

        /* Safari Theme Colors */
        .bg-safari-dark {
          background-color: #1a2f1a;
        }
        
        .bg-safari-medium {
          background-color: #2d4a2d;
        }
        
        .border-safari-border {
          border-color: #3a5c3a;
        }
        
        .text-safari-gold {
          color: #d4af37;
        }
        
        .bg-safari-gold {
          background-color: #d4af37;
        }
        
        .bg-safari-gold-dark {
          background-color: #b8941f;
        }
        
        .bg-safari-gold-light {
          background-color: #e5c158;
        }
        
        .text-safari-light {
          color: #a8c6a8;
        }
        
        .bg-safari-light {
          background-color: #a8c6a8;
        }
        
        .text-safari-dark {
          color: #1a2f1a;
        }
        
        .shadow-safari {
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(212, 175, 55, 0.1);
        }

        /* Gradient backgrounds */
        .from-safari-dark {
          --tw-gradient-from: #1a2f1a;
          --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(26, 47, 26, 0));
        }
        
        .via-safari-medium {
          --tw-gradient-stops: var(--tw-gradient-from), #2d4a2d, var(--tw-gradient-to, rgba(45, 74, 45, 0));
        }
        
        .to-safari-dark {
          --tw-gradient-to: #1a2f1a;
        }
      `}</style>
    </>
  );
}