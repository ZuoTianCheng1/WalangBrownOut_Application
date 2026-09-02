import { createContext, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const STORAGE_KEY = 'walangbrownout_ims_auth';

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem(STORAGE_KEY) === 'true'
  );

  const login = (username, password) => {
    // Replace these demo credentials with your real authentication API.
    if (username === 'admin' && password === 'admin123') {
      localStorage.setItem(STORAGE_KEY, 'true');
      setIsAuthenticated(true);
      return { ok: true };
    }
    return { ok: false, error: 'Invalid username or password.' };
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
  };

  const value = useMemo(() => ({ isAuthenticated, login, logout }), [isAuthenticated]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
