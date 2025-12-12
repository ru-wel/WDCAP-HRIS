import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();

  // if not logged in, redirect to login page
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace/>;
  }

  // if roles are specified, check if user has required role
  if (allowedRoles) {
    const userHasRole = Array.isArray(allowedRoles) ? allowedRoles.includes(user.role) : user.role === allowedRoles;

    // if user doesn't have required role, show unauthorized message
    if (!userHasRole) {
      return (
        <div className='flex items-center justify-center min-h-screen'>
          <div className='text-center'>
            <h1 className='text-2xl font-bold text-gray-800 mb-2'>Access Denied</h1>
            <p className='text-gray-600'>You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }

  } 
  
  // user is authenticated and has required role
  return children;
};

export default ProtectedRoute;