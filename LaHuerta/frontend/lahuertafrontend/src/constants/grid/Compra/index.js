import React from 'react';

const PAYMENT_STATUS_CONFIG = {
  'PENDIENTE': { label: 'Pendiente', bg: '#ffebee', color: '#c62828' },
  'PARCIAL':   { label: 'Parcial',   bg: '#fef9c3', color: '#a16207' },
  'ABONADO':   { label: 'Abonado',   bg: '#dcfce7', color: '#166534' },
};

export const columns = [
  { field: 'number',    headerName: 'N° Compra',   flex: 1, align: 'center', headerAlign: 'center' },
  { field: 'date',      headerName: 'Fecha',        flex: 1, align: 'center', headerAlign: 'center' },
  { field: 'supplier',  headerName: 'Proveedor',    flex: 2, align: 'center', headerAlign: 'center' },
  { field: 'senia',     headerName: 'Seña',         flex: 1, align: 'center', headerAlign: 'center' },
  { field: 'amount',    headerName: 'Importe',      flex: 1, align: 'center', headerAlign: 'center' },
  {
    field: 'paymentStatus',
    headerName: 'Estado pago',
    flex: 1,
    minWidth: 160,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => {
      const cfg = PAYMENT_STATUS_CONFIG[params.value] || { label: params.value || '-', bg: '#f0f4f7', color: '#596064' };
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
          {cfg.label}
        </span>
      );
    },
  },
  { field: 'outstandingBalance', headerName: 'Saldo', flex: 1, align: 'center', headerAlign: 'center' },
];
