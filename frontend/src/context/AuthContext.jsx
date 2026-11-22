import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [hopital, setHopital] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const hopitalStored = localStorage.getItem('hopital');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({
          id: payload.id,
          login: payload.login,
          role: payload.role,
          nom: payload.nom,
          prenom: payload.prenom,
          permissions: payload.permissions || [],
          hospital_id: payload.hospital_id || null,
          hospital_slug: payload.hospital_slug || null,
        });
      } catch (e) {
        console.error('Erreur décodage token', e);
        localStorage.removeItem('token');
        setUser(null);
      }
    }
    if (hopitalStored) {
      try { setHopital(JSON.parse(hopitalStored)); } catch (e) { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const login = (token, userData, hopitalData) => {
    localStorage.setItem('token', token);
    if (userData) localStorage.setItem('user', JSON.stringify(userData));
    if (hopitalData) localStorage.setItem('hopital', JSON.stringify(hopitalData));
    setUser(userData);
    setHopital(hopitalData || null);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('hopital');
    setUser(null);
    setHopital(null);
  };

  return (
    <AuthContext.Provider value={{ user, hopital, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
