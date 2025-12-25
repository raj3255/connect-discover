import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '@/types';
import { currentUser } from '@/data/mockUsers';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  verifyEmail: (code: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  age: number;
  gender: 'male' | 'female' | 'other';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('auth_token');
    if (token) {
      // In real app, validate token with backend
      setState({
        user: currentUser,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = async (email: string, password: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock validation - replace with real API call
    if (email && password) {
      localStorage.setItem('auth_token', 'mock_token');
      setState({
        user: currentUser,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      throw new Error('Invalid credentials');
    }
  };

  const register = async (data: RegisterData) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In real app, send to backend and wait for email verification
    console.log('Registering user:', data);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const verifyEmail = async (code: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (code.length !== 6) throw new Error('Invalid code');
  };

  const forgotPassword = async (email: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('Reset email sent to:', email);
  };

  const resetPassword = async (token: string, password: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('Password reset with token:', token);
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, verifyEmail, forgotPassword, resetPassword }}>
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
