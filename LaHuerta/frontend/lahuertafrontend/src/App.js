import React, { useEffect } from 'react';
import axios from 'axios';
import MiniDrawer from './components/Header';
import Footer from './components/Footer';
import { Outlet } from 'react-router-dom';
import { headerOptions } from './constants/headerOptions';
import { authCsrfUrl } from './constants/urls';
import './App.css';

function App() {
  // Fuerza Django para que cree la cookie csrftoken apenas arranca la app.
  useEffect(() => {
    axios.get(authCsrfUrl, { withCredentials: true }).catch(() => {});
  }, []);

  return (
    <div className="App min-h-[100svh] flex flex-col bg-surface">
      <MiniDrawer
        title='La Huerta'
        menuOptions={headerOptions}
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