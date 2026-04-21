import React from 'react';

const PAYMENT_TYPE_CONFIG = {
  'Efectivo':      { bg: '#dcfce7', color: '#166534' },
  'Cheque':        { bg: '#e8f0fb', color: '#4a7bc4' },
  'Cheque Propio': { bg: '#f3e8ff', color: '#7c3aed' },
};

export const columns = [
  { field: 'paymentDate', headerName: 'Fecha pago',        minWidth: 130 },
  { field: 'supplier',    headerName: 'Proveedor',         minWidth: 150 },
  { field: 'buyDate',     headerName: 'Fecha compra',      minWidth: 130 },
  { field: 'amount',      headerName: 'Importe',           minWidth: 120 },
  {
    field: 'paymentType',
    headerName: 'Tipo pago',
    minWidth: 140,
    renderCell: (params) => {
      const cfg = PAYMENT_TYPE_CONFIG[params.value] || { bg: '#f0f4f7', color: '#596064' };
      return (
        <span style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: '6px',
          fontSize: '0.75rem',
          fontWeight: 600,
          lineHeight: '18px',
          backgroundColor: cfg.bg,
          color: cfg.color,
          whiteSpace: 'nowrap',
        }}>
          {params.value}
        </span>
      );
    },
  },
  { field: 'cheque', headerName: 'Cheque Nro.', minWidth: 120 },
];
