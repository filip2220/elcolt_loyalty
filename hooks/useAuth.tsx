import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import * as api from '../services/api';
import { User, Level } from '../types';
import Spinner from '../components/Spinner';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (identifier: string, pass: string) => Promise<void>;
  signup: (data: api.SignupData) => Promise<void>;
  logout: () => Promise<void>;
  points: number;
  level: Level | null;
  updatePoints: (points: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  // SECURITY: No longer storing token in state for new logins (uses httpOnly cookies)
  // Keeping token state for backward compatibility during migration
  const [token, setToken] = useState<string | null>(localStorage.getItem('jwt_token'));
  const [points, setPoints] = useState<number>(0);
  const [level, setLevel] = useState<Level | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUserData = useCallback(async (jwt: string | null) => {
    try {
      // If we have a legacy token, use it. Otherwise, rely on httpOnly cookies.
      const authToken = jwt || 'cookie-auth';

      // Fetch all critical user data in parallel.
      const [profile, loyaltyData] = await Promise.all([
        api.getUserProfile(authToken),
        api.getLoyaltyData(authToken),
      ]);

      setUser(profile);
      setPoints(loyaltyData.points);
      setLevel(loyaltyData.level);
      return true;

    } catch (error) {
      console.error("Failed to fetch critical user data (profile or loyalty info)", error);
      return false;
    }
  }, []);

  // Clear all auth state
  const clearAuthState = useCallback(() => {
    setUser(null);
    setToken(null);
    setPoints(0);
    setLevel(null);
    localStorage.removeItem('jwt_token');
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      // First, try to authenticate via httpOnly cookie (new secure method)
      const authCheck = await api.checkAuth();

      if (authCheck.authenticated && authCheck.user) {
        // User is authenticated via cookie
        setUser({
          id: authCheck.user.id,
          name: authCheck.user.name,
          email: authCheck.user.email
        });

        // Fetch additional user data (points, level)
        try {
          const loyaltyData = await api.getLoyaltyData('cookie-auth');
          setPoints(loyaltyData.points);
          setLevel(loyaltyData.level);
        } catch (err) {
          console.warn('Could not fetch loyalty data:', err);
        }

        // Clear legacy localStorage token if it exists (migration)
        if (localStorage.getItem('jwt_token')) {
          localStorage.removeItem('jwt_token');
          setToken(null);
        }
      } else if (token) {
        // Fall back to legacy localStorage token
        const success = await fetchUserData(token);
        if (!success) {
          clearAuthState();
        }
      }

      setLoading(false);
    };
    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (identifier: string, pass: string) => {
    const result = await api.login(identifier, pass);
    // Token is now also set as httpOnly cookie by the server
    // We still receive it in the response for backward compatibility
    // but we don't need to store it in localStorage anymore

    // For now, keep storing in localStorage for backward compatibility
    // This can be removed once migration is complete
    if (result.token) {
      localStorage.setItem('jwt_token', result.token);
      setToken(result.token);
      await fetchUserData(result.token);
    }
  };

  const signup = async (data: api.SignupData) => {
    const result = await api.signup(data);
    // Token is now also set as httpOnly cookie by the server

    // For backward compatibility, also store in localStorage
    if (result.token) {
      localStorage.setItem('jwt_token', result.token);
      setToken(result.token);
      await fetchUserData(result.token);
    }
  };

  const logout = async () => {
    try {
      // Call server to clear httpOnly cookie
      await api.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    }
    // Clear local state
    clearAuthState();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-800">
        <Spinner size="lg" />
      </div>
    );
  }

  // User is authenticated if we have either a user object OR a token
  const isAuthenticated = !!user || !!token;

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, login, signup, logout, points, level, updatePoints: setPoints }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
