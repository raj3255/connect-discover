import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '@/types';
import SocketService from '@/services/SocketService';
import ApiService from '@/services/apiServices';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  verifyEmail: (code: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
  updateUser: (user: User) => void;
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
// ✅ Get base URL without /api for constructing full avatar URLs
const BASE_URL = API_BASE_URL.replace('/api', '');

// ✅ Helper function to parse interests safely
const parseInterests = (interests: any): string[] => {
  if (Array.isArray(interests)) {
    return interests;
  }
  if (typeof interests === 'string' && interests.trim()) {
    try {
      const parsed = JSON.parse(interests);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

// ✅ Helper function to construct full avatar URL
const getFullAvatarUrl = (avatarUrl: string | null | undefined): string | null => {
  if (!avatarUrl) return null;
  
  // If already a full URL, return as-is
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  
  // If relative path, construct full URL
  const cleanPath = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`;
  const fullUrl = `${BASE_URL}${cleanPath}`;
  
  console.log('🔧 Converting avatar URL:', avatarUrl, '→', fullUrl);
  return fullUrl;
};

// ✅ Helper function to normalize user data
const normalizeUserData = (userData: any): User => {
  const normalizedUser = {
    ...userData,
    interests: parseInterests(userData.interests),
    avatar_url: getFullAvatarUrl(userData.avatar_url),
  };
  
  console.log('✅ Normalized user data:', {
    original_avatar: userData.avatar_url,
    normalized_avatar: normalizedUser.avatar_url,
    original_interests: userData.interests,
    normalized_interests: normalizedUser.interests,
  });
  
  return normalizedUser;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const [error, setError] = useState<string | null>(null);

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        
        if (token) {
          // ✅ CRITICAL: Set token in ApiService before making any requests
          ApiService.setToken(token);
          
          const res = await fetch(`${API_BASE_URL}/users/profile`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (res.ok) {
            const data: ApiResponse<User> = await res.json();
            const userData = data.user || data.data || null;
            
            console.log('🔍 Raw user data from server:', userData);
            
            if (userData) {
              // ✅ Normalize user data to ensure interests are parsed and avatar URL is full
              const normalizedUser = normalizeUserData(userData);
              
              setState({
                user: normalizedUser,
                isAuthenticated: true,
                isLoading: false,
              });
              
              // Connect socket after successful auth
              SocketService.connect(token);
            } else {
              setState(prev => ({ ...prev, isLoading: false }));
            }
          } else {
            // Token is invalid, clear it
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            ApiService.clearToken();
            setState(prev => ({ ...prev, isLoading: false }));
          }
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        ApiService.clearToken();
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();
  }, []);

  // Handle socket connection based on auth state
  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        SocketService.connect(token);
      }
    } else {
      SocketService.disconnect();
    }
  }, [state.isAuthenticated, state.user]);

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

      // ✅ Set token in ApiService
      ApiService.setToken(token);

      // ✅ Fetch fresh profile data to ensure we have latest avatar and interests
      try {
        const profileRes = await fetch(`${API_BASE_URL}/users/profile`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (profileRes.ok) {
          const profileData: ApiResponse<User> = await profileRes.json();
          const freshUserData = profileData.user || profileData.data || userData;
          const normalizedUser = normalizeUserData(freshUserData);
          
          setState({
            user: normalizedUser,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          // Fallback to login response data if profile fetch fails
          const normalizedUser = normalizeUserData(userData);
          setState({
            user: normalizedUser,
            isAuthenticated: true,
            isLoading: false,
          });
        }
      } catch (profileErr) {
        console.warn('Failed to fetch fresh profile, using login data:', profileErr);
        // Fallback to login response data
        const normalizedUser = normalizeUserData(userData);
        setState({
          user: normalizedUser,
          isAuthenticated: true,
          isLoading: false,
        });
      }
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

      setState(prev => ({ ...prev, isLoading: false }));
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
      ApiService.clearToken();
      SocketService.disconnect();

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
        const normalizedUser = normalizeUserData(data.user || data.data);
        setState(prev => ({
          ...prev,
          user: normalizedUser,
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

  const updateUser = (updatedUser: User) => {
    console.log('🔄 Updating user in context:', updatedUser);
    // ✅ Normalize the updated user data
    const normalizedUser = normalizeUserData(updatedUser);
    
    setState(prev => ({
      ...prev,
      user: normalizedUser,
    }));
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
        updateUser,
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