import React from 'react';
import { BADGE_COLORS } from '../../badgeColors';
import Badge from '../../../components/Badge';

export const PAYMENT_STATUS_CONFIG = {
  'PENDIENTE': { label: 'Pendiente', ...BADGE_COLORS.red },
  'PARCIAL':   { label: 'Parcial',   ...BADGE_COLORS.yellow },
  'ABONADO':   { label: 'Abonado',   ...BADGE_COLORS.green },
};

export const columns = [
  { field: 'number',    headerName: 'N° Compra',   flex: 1, align: 'center', headerAlign: 'center', hiddenOnMobile: true },
  { field: 'date',      headerName: 'Fecha',        flex: 1, align: 'center', headerAlign: 'center', hiddenOnMobile: true },
  { field: 'supplier',  headerName: 'Proveedor',    mobileHeaderName: 'Nombre', flex: 2, align: 'center', headerAlign: 'center', mobileClickable: true },
  { field: 'senia',     headerName: 'Seña',         flex: 1, align: 'center', headerAlign: 'center', hiddenOnMobile: true },
  { field: 'amount',    headerName: 'Importe',      flex: 1, align: 'center', headerAlign: 'center' },
  {
    field: 'paymentStatus',
    headerName: 'Estado pago',
    mobileHeaderName: 'Estado',
    flex: 1,
    minWidth: 160,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => {
      const cfg = PAYMENT_STATUS_CONFIG[params.value] || { label: params.value || '-', ...BADGE_COLORS.gray };
      return (
        <Badge color={cfg} label={cfg.label} />
      );
    },
  },
  { field: 'outstandingBalance', headerName: 'Saldo', flex: 1, align: 'center', headerAlign: 'center', hiddenOnMobile: true },
];
