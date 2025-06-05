import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ 
  children, 
  requireEmailVerification = false,
  requireAuth = true 
}) => {
  const { 
    isAuthenticated, 
    isEmailVerified, 
    isLoading, 
    requiresTwoFactor 
  } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // If user is authenticated but 2FA is required
  if (isAuthenticated && requiresTwoFactor) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // If email verification is required but not verified
  if (requireEmailVerification && isAuthenticated && !isEmailVerified) {
    return (
      <Navigate 
        to="/verify-email" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // If all checks pass, render the protected component
  return children;
};

// Email verification required route
export const EmailVerificationRoute = ({ children }) => {
  return (
    <ProtectedRoute requireEmailVerification={true}>
      {children}
    </ProtectedRoute>
  );
};

// Public route (accessible without authentication)
export const PublicRoute = ({ children, redirectIfAuthenticated = false }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect authenticated users away from auth pages
  if (redirectIfAuthenticated && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
