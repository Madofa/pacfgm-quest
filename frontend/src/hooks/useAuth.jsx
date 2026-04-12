import { useState, useEffect, createContext, useContext } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuari, setUsuari]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }

    api.auth.me()
      .then(data => setUsuari(data))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const { token, usuari: u } = await api.auth.login(email, password);
    localStorage.setItem('token', token);
    setUsuari(u);
    return u;
  }

  function logout() {
    localStorage.removeItem('token');
    setUsuari(null);
  }

  function updateUsuari(data) {
    setUsuari(prev => ({ ...prev, ...data }));
  }

  return (
    <AuthContext.Provider value={{ usuari, loading, login, logout, updateUsuari }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
