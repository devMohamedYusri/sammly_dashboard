'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { User } from '@/types';
import { loginAdmin, setToken, clearToken, getToken } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function getInitialAuth(): { user: User | null; isLoggedIn: boolean } {
  if (typeof window === 'undefined') {
    return { user: null, isLoggedIn: false };
  }
  const token = getToken();
  const savedAuth = localStorage.getItem('sammly-auth');
  if (token && savedAuth) {
    try {
      const decoded = decodeJwt(token);
      if (decoded && decoded.exp) {
        const currentTime = Math.floor(Date.now() / 1000);
        if (decoded.exp < currentTime) {
          clearToken();
          return { user: null, isLoggedIn: false };
        }
      }
      const auth = JSON.parse(savedAuth);
      return { user: auth.user, isLoggedIn: auth.isLoggedIn };
    } catch {
      return { user: null, isLoggedIn: false };
    }
  }
  return { user: null, isLoggedIn: false };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<{ user: User | null; isLoggedIn: boolean }>(() => getInitialAuth());
  const [isLoaded, setIsLoaded] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      setIsLoaded(true);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const data = await loginAdmin(email, password);
    if (data.token) {
      setToken(data.token);
      const decoded = decodeJwt(data.token);
      const user: User = {
        id: decoded?.id || 'admin-id',
        name: decoded?.email ? decoded.email.split('@')[0] : 'Admin',
        email: decoded?.email || email,
        role: decoded?.role || 'admin',
      };
      const newState = { user, isLoggedIn: true };
      setAuthState(newState);
      localStorage.setItem('sammly-auth', JSON.stringify(newState));
    }
  };

  const logout = () => {
    clearToken();
    setAuthState({ user: null, isLoggedIn: false });
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user: authState.user, isLoggedIn: authState.isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

