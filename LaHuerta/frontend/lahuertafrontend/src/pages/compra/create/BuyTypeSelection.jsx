import React from 'react';
import { useNavigate } from 'react-router-dom';
import AccessCard from '../../../components/Card';
import SelectionPage from '../../../components/SelectionPage';

const BUY_TYPES = [
  {
    title: 'Carga simple',
    description: 'Una compra a un proveedor para una fecha específica.',
    url: '/buy/create/simple',
    icon: 'singlePurchase',
    tourId: 'buy-type-simple',
  },
  {
    title: 'Carga masiva',
    description: 'Varias compras a distintos proveedores para una misma fecha (ej. el día de Mercado Central). Se carga la fecha una sola vez y se guarda una compra por proveedor.',
    url: '/buy/create/bulk',
    icon: 'bulkPurchase',
    tourId: 'buy-type-bulk',
  },
];

// Paso previo a "Nueva compra": elegir entre la carga simple y la carga masiva.
// Mismo ancho que el listado, los formularios y el detalle (max-w-7xl) para que no haya salto visual entre pantallas.
const BuyTypeSelection = () => {
  const navigate = useNavigate();

  return (
    <SelectionPage
      section="Compras"
      title="Nueva compra"
      subtitle="¿Qué tipo de carga querés realizar?"
      onBack={() => navigate('/buy')}
    >

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {BUY_TYPES.map(({ tourId, ...buyType }) => (
          <div key={buyType.url} data-tour={tourId} className="flex">
            <AccessCard {...buyType} size="large" />
          </div>
        ))}
      </div>
    </SelectionPage>
  );
};

export default BuyTypeSelection;
