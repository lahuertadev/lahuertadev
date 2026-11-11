import React from 'react';
import { useNavigate } from 'react-router-dom';
import AccessCard from '../../../components/Card';
import SelectionPage from '../../../components/SelectionPage';
import { PURCHASE_PAYMENT_KIND_CONFIG } from '../../../constants/purchasePaymentTypes';

// Paso previo a "Nuevo pago": elegir entre el pago de compras y el pago a cuenta (DEV-141).
// Cards como BuyTypeSelection y EmptyMovementTypeSelection; Volver según SelectionPage (arriba a la derecha en desktop, abajo en mobile).
const PurchasePaymentTypeSelection = () => {
  const navigate = useNavigate();

  return (
    <SelectionPage
      section="Pagos de Compras"
      title="Nuevo pago"
      subtitle="¿Qué pago a proveedor querés registrar?"
      onBack={() => navigate('/purchase-payment')}
    >

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
    </SelectionPage>
  );
};

export default PurchasePaymentTypeSelection;
