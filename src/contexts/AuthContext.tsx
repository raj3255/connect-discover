import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '@/types';
import SocketService from '@/services/SocketService';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  verifyEmail: (code: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  age: number;
  gender: 'male' | 'female' | 'other';
}

interface ApiResponse<T> {
  message?: string;
  user?: T;
  data?: T;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  token?: string;
  error?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const [error, setError] = useState<string | null>(null);

  // Initialize socket connection when user is authenticated
  useEffect(() => {
    console.log('🔍 Auth state changed:', { isAuthenticated: state.isAuthenticated, hasUser: !!state.user });
    
    if (state.isAuthenticated && state.user) {
      const token = localStorage.getItem('auth_token');
      console.log('📍 Token from storage:', token ? 'Found' : 'Not found');
      
      if (token) {
        console.log('🔌 Connecting socket with token...');
        try {
          SocketService.connect(token);
          console.log('✅ SocketService.connect() called successfully');
        } catch (err) {
          console.error('❌ Error connecting socket:', err);
        }
      }
    } else {
      // Disconnect socket if user logs out
      console.log('🔌 Disconnecting socket...');
      SocketService.disconnect();
    }
  }, [state.isAuthenticated, state.user]);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          const res = await fetch(`${API_BASE_URL}/auth/me`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (res.ok) {
            const data: ApiResponse<User> = await res.json();
            setState({
              user: data.user || data.data || null,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            localStorage.removeItem('auth_token');
            setState(prev => ({ ...prev, isLoading: false }));
          }
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setState(prev => ({ ...prev, isLoading: true }));

      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data: ApiResponse<User> = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Handle both response formats
      const token = data.tokens?.accessToken || data.token;
      const userData = data.user || data.data;

      if (!token || !userData) {
        throw new Error('Invalid response from server');
      }

      // Store tokens
      localStorage.setItem('auth_token', token);
      if (data.tokens?.refreshToken) {
        localStorage.setItem('refresh_token', data.tokens.refreshToken);
      }

      setState({
        user: userData,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      setState(prev => ({ ...prev, isLoading: false }));
      throw err;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setError(null);
      setState(prev => ({ ...prev, isLoading: true }));

      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const response: ApiResponse<User> = await res.json();

      if (!res.ok) {
        throw new Error(response.error || 'Registration failed');
      }

      // Registration successful - user will need to verify email
      console.log('✅ Registration successful, redirecting to email verification');
      setState(prev => ({ ...prev, isLoading: false }));
      
      // Return response so component can handle navigation
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      setState(prev => ({ ...prev, isLoading: false }));
      throw err;
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const refreshToken = localStorage.getItem('refresh_token');

      if (token || refreshToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        }).catch(err => console.error('Logout request failed:', err));
      }

      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');

      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const verifyEmail = async (code: string, email?: string) => {
    try {
      setError(null);
      
      // Get email from user state or parameter
      const emailToVerify = email || state.user?.email;
      
      if (!emailToVerify) {
        throw new Error('Email not found. Please register again.');
      }

      const res = await fetch(`${API_BASE_URL}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailToVerify, code }),
      });

      const data: ApiResponse<User> = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      if (data.user || data.data) {
        setState(prev => ({
          ...prev,
          user: data.user || data.data,
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      setError(message);
      throw err;
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      setError(null);

      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data: ApiResponse<any> = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email';
      setError(message);
      throw err;
    }
  };

  const resetPassword = async (code: string, password: string, email?: string) => {
    try {
      setError(null);

      if (!email) {
        throw new Error('Email is required for password reset');
      }

      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code, newPassword: password }),
      });

      const data: ApiResponse<any> = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Password reset failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password reset failed';
      setError(message);
      throw err;
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        verifyEmail,
        forgotPassword,
        resetPassword,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}