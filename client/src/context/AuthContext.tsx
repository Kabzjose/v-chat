import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import socket from '../socket';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

// create the context with a default value
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// this wraps your whole app and provides auth state to everything inside
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // on app load — check if token exists in localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));

      // reconnect socket with saved token
      socket.auth = { token: savedToken };
      socket.connect();
    }
  }, []);

  const login = (user: User, token: string) => {
    // save to state
    setUser(user);
    setToken(token);

    // save to localStorage so they stay logged in after refresh
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));

    // connect socket with token
    socket.auth = { token };
    socket.connect();
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    socket.disconnect();
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isAuthenticated: !!user  // !! converts to boolean
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// custom hook — any component calls useAuth() to get auth state
export const useAuth = () => useContext(AuthContext);