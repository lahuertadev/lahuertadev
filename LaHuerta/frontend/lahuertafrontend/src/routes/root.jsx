import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const Root = () => {
  const location = useLocation(); // Hook para obtener la ruta actual
  const hideButtons = ['/expenses/create', '/expenses/list'];
  return (
    <div>
      <h1>La Huerta</h1>
      {/* Mostrar el botón solo si no estás en la ruta /expenses/create */}
      {!hideButtons.includes(location.pathname) && (
        <Link to="/expense/create">
          <button>Registrar Gasto</button>
        </Link>
      )}

      {/* Mostrar el botón para listar gastos solo si no estás en la ruta /expenses/list */}
      {!hideButtons.includes(location.pathname) && (
        <Link to="/expense/list">
          <button>Listar Gastos</button>
        </Link>
      )}
      
      {/* Aquí se mostrarán los componentes según la ruta */}
      <Outlet />
    </div>
  );
};

export default Root;