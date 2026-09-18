import React, { createContext, useContext, useState } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext(null);

/**
 * Toast global, montado por encima del router: a diferencia de un toast local
 * a una pantalla, sobrevive a un navigate() (ej. login -> home) porque no
 * depende de que la pantalla que lo dispara siga montada.
 */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ open: false, message: '', variant: 'success', duration: 4000 });

  const showToast = (message, { variant = 'success', duration = 4000 } = {}) => {
    setToast({ open: true, message, variant, duration });
  };

  const closeToast = () => setToast((prev) => ({ ...prev, open: false }));

  return (
    <ToastContext.Provider value={{ showToast, closeToast }}>
      {children}
      <Toast
        open={toast.open}
        message={toast.message}
        variant={toast.variant}
        duration={toast.duration}
        responsive
        onClose={closeToast}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider');
  }
  return context;
}
