import React from 'react';
import { useNavigate } from 'react-router-dom';
import AccessCard from '../../../components/Card';
import BackButton from '../../../components/BackButton';
import { PURCHASE_PAYMENT_KIND_CONFIG } from '../../../constants/purchasePaymentTypes';

// Paso previo a "Nuevo pago": elegir entre el pago de compras y el pago a cuenta (DEV-141).
// Cards como BuyTypeSelection y EmptyMovementTypeSelection; Volver arriba a la derecha (convención de formularios).
const PurchasePaymentTypeSelection = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 bg-surface-card rounded shadow-sm border border-border-subtle w-full max-w-7xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-accent">Pagos de Compras</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">Nuevo pago</h1>
          <p className="mt-1 text-sm text-on-surface-muted">¿Qué pago a proveedor querés registrar?</p>
        </div>
        <BackButton onClick={() => navigate('/purchase-payment')} className="shrink-0 px-5 py-2.5 text-sm" />
      </div>

      {/* data-tour="payment-kinds": el paso del tutorial que pide elegir uno de los dos tipos. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-tour="payment-kinds">
        {Object.values(PURCHASE_PAYMENT_KIND_CONFIG).map(({ title, description, path, icon }) => (
          // data-tour: payment-kind-purchase / payment-kind-on-account (pasos del tutorial de Pagos de Compras).
          <div key={path} data-tour={`payment-kind-${path}`} className="flex">
            <AccessCard
              title={title}
              description={description}
              url={`/purchase-payment/create/${path}`}
              icon={icon}
              size="large"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PurchasePaymentTypeSelection;
