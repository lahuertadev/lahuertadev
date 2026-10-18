import React from 'react';
import { useNavigate } from 'react-router-dom';
import AccessCard from '../../../components/Card';
import BackButton from '../../../components/BackButton';
import { EMPTY_MOVEMENT_TYPE_CONFIG } from '../../../constants/emptyMovementTypes';

// Paso previo a "Nuevo movimiento": elegir entre la carga y la devolución de vacíos.
// Mismo ancho que el listado, el formulario y el detalle (max-w-7xl) para que no haya salto visual entre pantallas.
const EmptyMovementTypeSelection = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 bg-surface-card rounded shadow-sm border border-border-subtle w-full max-w-7xl">
      <BackButton onClick={() => navigate('/empty-movement')} />

      <div className="mt-5 mb-6">
        <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-accent">Vacíos</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">Nuevo movimiento</h1>
        <p className="mt-1 text-sm text-on-surface-muted">¿Qué movimiento de vacíos querés registrar?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.values(EMPTY_MOVEMENT_TYPE_CONFIG).map(({ title, description, path, icon }) => (
          <AccessCard
            key={path}
            title={title}
            description={description}
            url={`/empty-movement/create/${path}`}
            icon={icon}
            size="large"
          />
        ))}
      </div>
    </div>
  );
};

export default EmptyMovementTypeSelection;
