import React from 'react';
import AlertIcon from '../../../components/AlertIcon';
import Badge from '../../../components/Badge';
import OnAccountBadge, { PurchaseBadge } from '../../../pages/pago_compra/shared/OnAccountBadge';
import { BADGE_COLORS } from '../../badgeColors';

// Colores por tipo de pago a proveedor (también los usa el detalle del pago).
export const PURCHASE_PAYMENT_TYPE_COLORS = {
  'Efectivo':      { ...BADGE_COLORS.green },
  'Cheque':        { ...BADGE_COLORS.blue },
  'Cheque Propio': { ...BADGE_COLORS.violet },
};

export const columns = [
  { field: 'paymentDate', headerName: 'Fecha pago',        minWidth: 180, align: 'center', headerAlign: 'center', hiddenOnMobile: true },
  { field: 'supplier',    headerName: 'Proveedor',         minWidth: 150, align: 'center', headerAlign: 'center', mobileClickable: true },
  {
    field: 'concept',
    headerName: 'Concepto',
    minWidth: 130,
    align: 'center',
    headerAlign: 'center',
    hiddenOnMobile: true,
    // Qué se pagó: cuántas compras ("1 compra", "3 compras") o "A cuenta" (pago sin compras).
    renderCell: (params) => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        {params.row.isOnAccount ? <OnAccountBadge /> : <PurchaseBadge label={params.row.concept} />}
      </div>
    ),
  },
  {
    field: 'amount',
    headerName: 'Importe',
    minWidth: 120,
    align: 'center',
    headerAlign: 'center',
    // Un pago anulado muestra su importe tachado: queda como registro pero no cuenta. Sin la etiqueta
    // "Pago anulado": los anulados se ven solo en su solapa, que ya lo dice, y la etiqueta no entraba en la columna.
    renderCell: (params) => (params.row.isCancelled
      ? <span className="line-through text-on-surface-muted">{params.value}</span>
      : params.value),
  },
  {
    field: 'paymentType',
    headerName: 'Tipo pago',
    minWidth: 140,
    align: 'center',
    headerAlign: 'center',
    hiddenOnMobile: true,
    renderCell: (params) => {
      const cfg = PURCHASE_PAYMENT_TYPE_COLORS[params.value];
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          {/* El aviso de cheques caídos va adentro de la etiqueta, a la derecha: así todas quedan centradas igual. */}
          <Badge color={cfg} label={params.value}>
            {params.row.droppedChecksNotice && <AlertIcon title={params.row.droppedChecksNotice} size={15} />}
          </Badge>
        </div>
      );
    },
  },
];
