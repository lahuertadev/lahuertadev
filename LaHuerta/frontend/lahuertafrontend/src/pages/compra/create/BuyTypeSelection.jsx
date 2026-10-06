import React from 'react';
import { useNavigate } from 'react-router-dom';
import AccessCard from '../../../components/Card';
import BuyPageHeader from '../shared/BuyPageHeader';

const BUY_TYPES = [
  {
    title: 'Carga simple',
    description: 'Una compra a un proveedor para una fecha específica.',
    url: '/buy/create/simple',
    icon: 'singlePurchase',
  },
  {
    title: 'Carga masiva',
    description: 'Varias compras a distintos proveedores para una misma fecha (ej. el día de Mercado Central). Se carga la fecha una sola vez y se guarda una compra por proveedor.',
    url: '/buy/create/bulk',
    icon: 'bulkPurchase',
  },
];

// Paso previo a "Nueva compra": elegir entre la carga simple y la carga masiva.
const BuyTypeSelection = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 bg-surface-card rounded shadow-sm border border-border-subtle w-full max-w-3xl">
      <BuyPageHeader
        title="Nueva compra"
        subtitle="¿Qué tipo de carga querés realizar?"
        onBack={() => navigate('/buy')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {BUY_TYPES.map((buyType) => (
          <AccessCard key={buyType.url} {...buyType} />
        ))}
      </div>
    </div>
  );
};

export default BuyTypeSelection;
