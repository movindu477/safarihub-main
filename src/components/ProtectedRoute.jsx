import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute - Component to protect routes based on user role
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Component to render if authorized
 * @param {boolean} props.requireAdmin - If true, only admins can access
 * @param {boolean} props.requireAuth - If true, any authenticated user can access
 * @param {string} props.redirectTo - Path to redirect if unauthorized (default: '/')
 */
const ProtectedRoute = ({ 
  children, 
  requireAdmin = false, 
  requireAuth = false,
  redirectTo = '/' 
}) => {
  const { user, isAdmin, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Check if admin access is required
  if (requireAdmin) {
    if (!user) {
      console.log('❌ Admin route: No user authenticated, redirecting to home');
      return <Navigate to={redirectTo} replace />;
    }
    
    if (!isAdmin) {
      console.log('❌ Admin route: User is not admin, redirecting to home');
      return <Navigate to={redirectTo} replace />;
    }
    
    console.log('✅ Admin route: Access granted');
    return children;
  }

  // Check if any authentication is required
  if (requireAuth) {
    if (!user) {
      console.log('❌ Protected route: No user authenticated, redirecting');
      return <Navigate to={redirectTo} replace />;
    }
    
    console.log('✅ Protected route: Access granted');
    return children;
  }

  // No restrictions, render children
  return children;
};

export default ProtectedRoute;
