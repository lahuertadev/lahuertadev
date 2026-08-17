import React, { useEffect } from 'react';
import axios from 'axios';
import MiniDrawer from './components/Header';
import Footer from './components/Footer';
import { Outlet } from 'react-router-dom';
import { headerOptions } from './constants/headerOptions';
import { authCsrfUrl } from './constants/urls';
import { useAuth } from './context/AuthContext';
import './App.css';

function App() {
  const { user } = useAuth();

  // Fuerza Django para que cree la cookie csrftoken apenas arranca la app.
  useEffect(() => {
    axios.get(authCsrfUrl, { withCredentials: true }).catch(() => {});
  }, []);

  // Los items sin `roles` son visibles para cualquier usuario logueado.
  const visibleOptions = headerOptions.filter((opt) => !opt.roles || opt.roles.includes(user?.role));

  return (
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
  );
}

export default App;