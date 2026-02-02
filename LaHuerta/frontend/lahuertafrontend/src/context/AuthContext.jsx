import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

/**
 * Estado de autenticación: usuario actual (id, email, role) o null si no hay sesión.
 * Se guarda cuando /auth/me/ responde 200 y se limpia al hacer logout.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const clearUser = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, setUser, clearUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
