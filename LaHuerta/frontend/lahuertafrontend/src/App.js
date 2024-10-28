import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import { Outlet } from 'react-router-dom';

function App() {
  return (
    <div className="App">
      <Header />
      <main>
        {/* Aquí se mostrarán los componentes gestionados por las rutas */}
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default App;