import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

// Only import DestinationHero with correct relative path
import DestinationHero from './destinationhero'
import Navbar from '../home/Navbar'
import Destination2 from './DestinationSection2'
import Footer from '../home/Footer'
import ChatList from '../ChatList'

// Firebase - use correct relative path to go up two levels to src
import { auth, db } from '../../firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { getDoc, doc } from 'firebase/firestore'

// Import GlobalNotificationBell and ScrollToTopButton from App.jsx
import { GlobalNotificationBell, ScrollToTopButton } from '../../App'
import LoadingScreen from '../LoadingScreen'

function DestinationApp({ user: propUser, onLogout, onShowAuth, notifications = [], onNotificationClick, onMarkAsRead }) {
  // State Management
  const [user, setUser] = useState(propUser || null)
  const [loading, setLoading] = useState(true)
  const [checkingRole, setCheckingRole] = useState(true)
  const [showChatList, setShowChatList] = useState(false)
  const navigate = useNavigate()

  // Authentication Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)

      // Check if user is a service provider before allowing page to render
      if (user) {
        try {
          const providerDoc = await getDoc(doc(db, 'serviceProviders', user.uid));
          if (providerDoc.exists()) {
            const providerData = providerDoc.data();
            if (providerData.serviceType === 'Jeep Driver' || providerData.serviceType === 'Tour Guide') {
              // Redirect immediately without showing page content
              navigate('/', { replace: true });
              return;
            }
          }
        } catch (error) {
          console.error('Error checking user role:', error);
        }
      }

      setCheckingRole(false);
      setLoading(false);
    })

    return () => unsubscribe()
  }, [navigate])

  // Update user when prop changes
  useEffect(() => {
    if (propUser !== undefined) {
      const checkAndRedirect = async () => {
        if (propUser) {
          try {
            const providerDoc = await getDoc(doc(db, 'serviceProviders', propUser.uid));
            if (providerDoc.exists()) {
              const providerData = providerDoc.data();
              if (providerData.serviceType === 'Jeep Driver' || providerData.serviceType === 'Tour Guide') {
                navigate('/', { replace: true });
                return;
              }
            }
          } catch (error) {
            console.error('Error checking user role:', error);
          }
        }
        setUser(propUser);
      };
      checkAndRedirect();
    }
  }, [propUser, navigate])

  // Scroll to top when page loads or navigates (including back button)
  const location = useLocation()
  useEffect(() => {
    // Scroll to top on mount and when location changes
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [location.pathname])

  // Also handle popstate (back/forward button)
  useEffect(() => {
    const handlePopState = () => {
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      }, 0)
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  // Handle smooth scrolling to sections based on hash
  useEffect(() => {
    const handleHashScroll = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash) {
        setTimeout(() => {
          const element = document.getElementById(hash)
          if (element) {
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
              inline: 'nearest'
            })
          }
        }, 300) // Wait for page to render
      }
    }

    // Check for hash on mount
    handleHashScroll()

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashScroll)
    return () => window.removeEventListener('hashchange', handleHashScroll)
  }, [])

  // Handle login navigation (legacy - kept for compatibility)
  const handleLogin = () => {
    if (onShowAuth) {
      onShowAuth('login');
    }
  }

  // Handle register navigation (legacy - kept for compatibility)
  const handleRegister = () => {
    if (onShowAuth) {
      onShowAuth('register');
    }
  }

  // Handle logout
  const handleLogout = () => {
    setUser(null)
    if (onLogout) {
      onLogout()
    }
  }

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    if (onNotificationClick) {
      await onNotificationClick(notification)
    }
  }

  // Handle mark as read
  const handleMarkAsRead = async (notificationId) => {
    if (onMarkAsRead) {
      await onMarkAsRead(notificationId)
    }
  }

  // Handle start chat (if needed)
  const handleStartChat = (type, title) => {
    console.log(`Starting chat: ${type} - ${title}`)
    // Implement your chat logic here or navigate to chat page
    // navigate('/chat')
  }

  if (loading || checkingRole) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Global Notification Bell (Bottom Right) */}
      <GlobalNotificationBell
        user={user}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAsRead={handleMarkAsRead}
      />

      <ScrollToTopButton />

      {/* Main Content */}
      <main className="relative">
        <Navbar
          user={user}
          onLogin={(screen) => (onShowAuth ? onShowAuth(screen || 'login') : handleLogin())}
          onRegister={(screen) => (onShowAuth ? onShowAuth(screen || 'register') : handleRegister())}
          onLogout={handleLogout}
          onStartChat={handleStartChat}
          onOpenChatList={() => setShowChatList(true)}
        />

        {/* Chat List Modal */}
        {showChatList && user && (
          <ChatList
            user={user}
            onClose={() => setShowChatList(false)}
          />
        )}
        <DestinationHero />
        <Destination2 />
        <Footer />
      </main>
    </div>
  )
}

export default DestinationApp