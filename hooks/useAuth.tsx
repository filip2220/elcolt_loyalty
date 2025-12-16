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
  logout: () => void;
  points: number;
  level: Level | null;
  // FIX: Add updatePoints to the context type to allow other components to update the points state.
  updatePoints: (points: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('jwt_token'));
  const [points, setPoints] = useState<number>(0);
  const [level, setLevel] = useState<Level | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUserData = useCallback(async (jwt: string) => {
    try {
      // Fetch all critical user data in parallel.
      // A single call to getLoyaltyData now efficiently retrieves both points and level.
      const [profile, loyaltyData] = await Promise.all([
        api.getUserProfile(jwt),
        api.getLoyaltyData(jwt),
      ]);

      setUser(profile);
      setPoints(loyaltyData.points);
      setLevel(loyaltyData.level);

    } catch (error) {
      console.error("Failed to fetch critical user data (profile or loyalty info)", error);
      // If any critical data fails to load, log the user out to ensure a clean state.
      setToken(null);
      localStorage.removeItem('jwt_token');
      setUser(null);
      setPoints(0);
      setLevel(null);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        await fetchUserData(token);
      }
      setLoading(false);
    };
    initAuth();
  }, [token, fetchUserData]);

  const login = async (identifier: string, pass: string) => {
    const { token: newToken } = await api.login(identifier, pass);
    localStorage.setItem('jwt_token', newToken);
    setToken(newToken);
    await fetchUserData(newToken);
  };

  const signup = async (data: api.SignupData) => {
    const { token: newToken } = await api.signup(data);
    localStorage.setItem('jwt_token', newToken);
    setToken(newToken);
    await fetchUserData(newToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setPoints(0);
    setLevel(null);
    localStorage.removeItem('jwt_token');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-800">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    // FIX: Provide the `setPoints` function as `updatePoints` in the context value.
    <AuthContext.Provider value={{ isAuthenticated: !!token, user, token, login, signup, logout, points, level, updatePoints: setPoints }}>
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
