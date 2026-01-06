/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from "react";
import { STORAGE_KEYS } from "../constants/config.js";
import { post } from "../services/api.js";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialiazeAuth = () => {
      try {
        const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const userData = localStorage.getItem(STORAGE_KEYS.USER);

        if (accessToken && userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
        localStorage.removeItem(STORAGE_KEYS.USER);
      } finally {
        setLoading(false);
      }
    };

    initialiazeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await post('/auth/login', { email, password }, false);

      if (response.success) {
        const { user: userData, session } = response.data;

        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, session.access_token);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, session.refresh_token);

        // calculate and store token expiry
        const expiryTime = Date.now() + (session.expires_in * 1000);
        localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());

        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));

        setUser(userData);

        return userData
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout =  async () => {
    try {
      await post('/auth/logout').catch(() => {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
      localStorage.removeItem(STORAGE_KEYS.USER);

      setUser(null);
      window.location.href = '/login';
    }
  };

  const isAuthenticated = () => {
    return !!user && !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  };

  const hasRole = (roles) => {
    if (!user) return false;

    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }

    return user.role === roles;
  };

  const value = { user, login, logout, isAuthenticated, hasRole, loading };

  if (loading) {
    return null;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};