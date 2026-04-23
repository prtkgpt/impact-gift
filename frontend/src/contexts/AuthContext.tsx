import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthResponse } from '../types';
import api from '../utils/api';
import { isAxiosError } from '../utils/errors';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (!token || !savedUser) {
        setLoading(false);
        return;
      }

      try {
        // Validate token by making a quick API call
        await api.get('/auth/me');
        setUser(JSON.parse(savedUser));
      } catch (error: unknown) {
        // Only clear token if it's a 401 (unauthorized) - keep it for network errors
        const status = isAxiosError(error) ? error.response?.status : undefined;
        if (status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        } else {
          // Network error or other issue - keep the user logged in from localStorage
          console.warn('Token validation skipped due to network error, using cached session');
          setUser(JSON.parse(savedUser));
        }
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    const { token, user } = response.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };

  const signup = async (email: string, password: string, firstName: string, lastName: string) => {
    const response = await api.post<AuthResponse>('/auth/signup', {
      email,
      password,
      first_name: firstName,
      last_name: lastName
    });
    const { token, user } = response.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
