import React, { useEffect, useMemo, useState } from 'react';
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
  const [drawerOpen, setDrawerOpen] = useState(false);

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
      <div className="App h-[100svh] flex flex-col overflow-hidden bg-surface">
        <MiniDrawer
          title='La Huerta'
          menuOptions={visibleOptions}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        />
        {/* Mismo ancho de drawer (240/65) que Header y Footer aplican por su cuenta: Tailwind
            necesita las clases arbitrarias completas y literales para compilarlas, así que no
            se puede centralizar en una constante interpolada sin romper el JIT. */}
        <main
          className={`flex-grow overflow-y-auto px-4 sm:px-8 py-6 transition-[margin-left] duration-200 ease-in-out ${
            drawerOpen ? 'sm:ml-[240px]' : 'sm:ml-[65px]'
          }`}
        >
          <Outlet />
        </main>
        <Footer open={drawerOpen} />
      </div>
    </ThemeProvider>
  );
}

export default App;