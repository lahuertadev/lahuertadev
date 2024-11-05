import React from 'react';
import MiniDrawer from './components/Header';
import Footer from './components/Footer';
import { Outlet } from 'react-router-dom';
import { headerOptions } from './constants/headerOptions';
import './App.css';
import { FaLinkedin } from 'react-icons/fa';

function App() {
  
  return (
    <div className="App min-h-[100svh] flex flex-col justify-between bg-gradient-to-r from-green-lahuerta to-brown-lahuerta">
      <MiniDrawer
        title='La Huerta'
        menuOptions={headerOptions}
      />
      <main className="container mx-auto h-full flex-grow flex items-center">
        <Outlet />
      </main>
      <Footer 
        linkedinUrl="https://www.linkedin.com/in/pabloantunez/" 
        title="La Huerta. Todos los derechos reservados."
        icon={<FaLinkedin size={24} />} 
      />
    </div>
  );
}

export default App;