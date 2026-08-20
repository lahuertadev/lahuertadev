import React, { useEffect, useMemo } from 'react';
import axios from 'axios';
import { ThemeProvider } from '@mui/material/styles';
import MiniDrawer from './components/Header';
import Footer from './components/Footer';
import { Outlet } from 'react-router-dom';
import { headerOptions } from './constants/headerOptions';
import { authCsrfUrl } from './constants/urls';
import { useAuth } from './context/AuthContext';
import { useThemeMode } from './context/ThemeModeContext';
import getTheme from './theme';
import './App.css';

function App() {
  const { user } = useAuth();
  const { mode } = useThemeMode();
  const theme = useMemo(() => getTheme(mode), [mode]);

  // Fuerza Django para que cree la cookie csrftoken apenas arranca la app.
  useEffect(() => {
    axios.get(authCsrfUrl, { withCredentials: true }).catch(() => {});
  }, []);

  // Aplica la clase .dark solo mientras el área autenticada está montada, para que
  // login/register/recuperar contraseña (fuera de este componente) queden siempre en claro.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
    return () => document.documentElement.classList.remove('dark');
  }, [mode]);

  // Los items sin `roles` son visibles para cualquier usuario logueado.
  const visibleOptions = headerOptions.filter((opt) => !opt.roles || opt.roles.includes(user?.role));

  return (
    <ThemeProvider theme={theme}>
      <div className="App min-h-[100svh] flex flex-col bg-surface">
        <MiniDrawer
          title='La Huerta'
          menuOptions={visibleOptions}
        />
        <main className="flex-grow px-4 sm:px-8 py-6">
          <Outlet />
        </main>
        <Footer
        />
      </div>
    </ThemeProvider>
  );
}

export default App;