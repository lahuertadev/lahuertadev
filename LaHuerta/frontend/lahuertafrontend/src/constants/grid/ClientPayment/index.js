import React from 'react';

const PAYMENT_TYPE_CONFIG = {
  'Efectivo':      { bg: '#dcfce7', color: '#166534' },
  'Transferencia': { bg: '#dbeafe', color: '#1d4ed8' },
  'Cheque':        { bg: '#e8f0fb', color: '#4a7bc4' },
  'Débito':        { bg: '#fef9c3', color: '#a16207' },
  'Crédito':       { bg: '#fce7f3', color: '#9d174d' },
  'Mercado Pago':  { bg: '#ffedd5', color: '#c2410c' },
  'Cuenta Corr.':  { bg: '#f0f4f7', color: '#596064' },
  'Pagaré':        { bg: '#ccfbf1', color: '#115e59' },
  'Cheque Propio': { bg: '#f3e8ff', color: '#7c3aed' },
};

export const columns = [
  { field: 'date',    headerName: 'Fecha',   flex: 1, align: 'center', headerAlign: 'center', hiddenOnMobile: true },
  { field: 'client',  headerName: 'Cliente', flex: 2, align: 'center', headerAlign: 'center', mobileClickable: true },
  { field: 'amount',  headerName: 'Importe', flex: 1, align: 'center', headerAlign: 'center' },
  {
    field: 'paymentType',
    headerName: 'Tipo de pago',
    flex: 1,
    align: 'center',
    headerAlign: 'center',
    hiddenOnMobile: true,
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
  { field: 'observations', headerName: 'Observaciones', flex: 2, align: 'center', headerAlign: 'center', hiddenOnMobile: true },
];
