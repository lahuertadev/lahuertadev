import React from 'react';
import { EMPTY_MOVEMENT_TYPE_CONFIG } from '../../emptyMovementTypes';

export const MovementTypeBadge = ({ type }) => {
  const cfg = EMPTY_MOVEMENT_TYPE_CONFIG[type] || { label: type || '-', bg: '#f0f4f7', color: '#596064' };
  return (
    <span style={{
      display: 'inline-block',
      width: 'fit-content',
      padding: '2px 10px',
      borderRadius: '6px',
      fontSize: '0.75rem',
      fontWeight: 600,
      lineHeight: '18px',
      backgroundColor: cfg.bg,
      color: cfg.color,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
};

export const columns = [
  { field: 'date',          headerName: 'Fecha',          flex: 1, align: 'center', headerAlign: 'center', hiddenOnMobile: true },
  { field: 'supplier',      headerName: 'Proveedor',      mobileHeaderName: 'Nombre', flex: 2, align: 'center', headerAlign: 'center', mobileClickable: true },
  {
    field: 'type',
    headerName: 'Tipo',
    flex: 1,
    minWidth: 130,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => <MovementTypeBadge type={params.value} />,
  },
  { field: 'receiptNumber', headerName: 'N° Comprobante', flex: 1, align: 'center', headerAlign: 'center', hiddenOnMobile: true },
  { field: 'quantity',      headerName: 'Vacíos',         flex: 1, align: 'center', headerAlign: 'center', hiddenOnMobile: true },
  { field: 'amount',        headerName: 'Importe',        flex: 1, align: 'center', headerAlign: 'center' },
];
