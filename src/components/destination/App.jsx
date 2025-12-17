import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

// Only import DestinationHero with correct relative path
import DestinationHero from './destinationhero'
import Navbar from '../home/Navbar'
import Destination2 from './DestinationSection2'
import Footer from '../home/Footer'

// Firebase - use correct relative path to go up two levels to src
import { auth } from '../../firebase'
import { onAuthStateChanged } from 'firebase/auth'

// Import GlobalNotificationBell and ScrollToTopButton from App.jsx
import { GlobalNotificationBell, ScrollToTopButton } from '../../App'

function DestinationApp({ user: propUser, onLogout, onShowAuth, notifications = [], onNotificationClick, onMarkAsRead }) {
  // State Management
  const [user, setUser] = useState(propUser || null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Authentication Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Update user when prop changes
  useEffect(() => {
    if (propUser !== undefined) {
      setUser(propUser)
    }
  }, [propUser])

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

  // Handle login navigation
  const handleLogin = () => {
    navigate('/login')
  }

  // Handle register navigation
  const handleRegister = () => {
    navigate('/register')
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    )
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
          onLogin={handleLogin}
          onRegister={handleRegister}
          onLogout={handleLogout}
          onStartChat={handleStartChat}
        />
        <DestinationHero />
        <Destination2 />
        <Footer />
      </main>
    </div>
  )
}

export default DestinationApp