import React from 'react';
import { useNavigate } from 'react-router-dom';
import AccessCard from '../../../components/Card';
import SelectionPage from '../../../components/SelectionPage';
import { EMPTY_MOVEMENT_TYPE_CONFIG } from '../../../constants/emptyMovementTypes';

// Paso previo a "Nuevo movimiento": elegir entre la carga y la devolución de vacíos.
// Mismo ancho que el listado, el formulario y el detalle (max-w-7xl) para que no haya salto visual entre pantallas.
const EmptyMovementTypeSelection = () => {
  const navigate = useNavigate();

  return (
    <SelectionPage
      section="Vacíos"
      title="Nuevo movimiento"
      subtitle="¿Qué movimiento de vacíos querés registrar?"
      onBack={() => navigate('/empty-movement')}
    >

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.values(EMPTY_MOVEMENT_TYPE_CONFIG).map(({ title, description, path, icon }) => (
          // data-tour: empty-type-load / empty-type-return (pasos del tutorial de Vacíos).
          <div key={path} data-tour={`empty-type-${path}`} className="flex">
            <AccessCard
              title={title}
              description={description}
              url={`/empty-movement/create/${path}`}
              icon={icon}
              size="large"
            />
          </div>
        ))}
      </div>
    </SelectionPage>
  );
};

export default EmptyMovementTypeSelection;
