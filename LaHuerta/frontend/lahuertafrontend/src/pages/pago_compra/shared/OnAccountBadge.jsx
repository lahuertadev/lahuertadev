import React from 'react';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import Badge from '../../../components/Badge';
import StatusBadge from '../../../components/StatusBadge';
import { ON_ACCOUNT_LABEL } from '../../../constants/purchasePaymentTypes';

// Etiquetas del concepto de un pago a proveedor (DEV-141), con la paleta única de etiquetas.
// "A cuenta": se muestra en lugar de la compra en los pagos a proveedor sin compra.
const OnAccountBadge = ({ className = '' }) => (
  <Badge color="blue" label={ON_ACCOUNT_LABEL} className={className} />
);

// Cantidad de compras que cubre el pago ("1 compra", "3 compras"; columna Concepto del listado). Naranja, el
// opuesto del azul de "A cuenta", para que los dos conceptos contrasten; tampoco se cruza con los
// tipos de pago (verde, azul, violeta).
export const PurchaseBadge = ({ label, className = '' }) => (
  <Badge color="orange" label={label} className={className} />
);

// "Pago anulado": el pago se dio de baja entero (DEV-150). Queda como registro pero no cuenta para
// compras, cheques ni cuenta corriente.
export const CancelledBadge = ({ className = '' }) => (
  <StatusBadge tone="danger" label="Pago anulado" className={className} />
);

// "Cheque rechazado" / "Cheque anulado": se cayó un cheque del pago, que sigue vigente con su importe
// reducido, haya alcanzado o no a esta compra (DEV-150). El anulado solo puede ser un cheque propio.
// Lleva el ícono de alerta para distinguirla de "Pago anulado".
const FALLEN_CHECK_LABELS = { RECHAZADO: 'Cheque rechazado', ANULADO: 'Cheque anulado' };

export const FallenCheckBadge = ({ state, className = '' }) => (
  <StatusBadge
    tone="danger"
    label={FALLEN_CHECK_LABELS[state]}
    icon={<ErrorOutlineIcon sx={{ fontSize: 14 }} />}
    className={className}
  />
);

export default OnAccountBadge;
