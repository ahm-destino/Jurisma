import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing auth on mount
  useEffect(() => {
    const storedUser = api.getStoredUser();
    if (storedUser && api.isAuthenticated()) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await api.login(email, password);
      if (response.success && response.data.user) {
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      }
      throw new Error(response.message || 'Login failed');
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const register = async (name, email, password, role = 'student') => {
    setError(null);
    try {
      const response = await api.register(name, email, password, role);
      if (response.success && response.data.user) {
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      }
      throw new Error(response.message || 'Registration failed');
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  // Listen for unauthorized events (401) from api service
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const refreshProfile = async () => {
    try {
      const profile = await api.getProfile();
      setUser(profile);
      localStorage.setItem('user', JSON.stringify(profile));
      return profile;
    } catch (err) {
      console.error('Error refreshing profile:', err);
      return null;
    }
  };

  const upgradeRole = (newRole) => {
    if (user) {
      setUser(prev => ({ ...prev, role: newRole }));
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      logout,
      upgradeRole,
      refreshProfile,
      loading,
      error,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
