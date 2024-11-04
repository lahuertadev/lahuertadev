import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const Home = () => {
  const location = useLocation();
  const hideButtons = ['/expenses/create', '/expenses/list'];

  return (
    <div className='container mx-auto h-full items-center justify-center flex flex-col'>
      <h1 className='text-white font-bold text-3xl'>Bienvenido al sistema de Gestión de La Huerta</h1>
      <br></br>
      <br></br>
      {!hideButtons.includes(location.pathname) && (
        <Link to="/expense/create">
          <button>Registrar Gasto</button>
        </Link>
      )}

      {!hideButtons.includes(location.pathname) && (
        <Link to="/expense/list">
          <button>Listar Gastos</button>
        </Link>
      )}
      
      <Outlet />
    </div>
  );
};

export default Home;