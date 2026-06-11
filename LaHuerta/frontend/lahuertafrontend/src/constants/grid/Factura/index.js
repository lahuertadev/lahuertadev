import React from 'react';

const BILL_TYPE_CONFIG = {
  'A': { bg: '#dbeafe', color: '#1d4ed8' },
  'B': { bg: '#dcfce7', color: '#166534' },
  'C': { bg: '#fef9c3', color: '#a16207' },
  'M': { bg: '#f3e8ff', color: '#7e22ce' },
  'ND': { bg: '#ffedd5', color: '#c2410c' },
  'NC': { bg: '#fce7f3', color: '#9d174d' },
};

const getBillTypeConfig = (label = '') => {
  const upper = label.toUpperCase();
  if (upper.includes('DÉBITO') || upper.includes('DEBITO')) return BILL_TYPE_CONFIG['ND'];
  if (upper.includes('CRÉDITO') || upper.includes('CREDITO')) return BILL_TYPE_CONFIG['NC'];
  const letter = label.replace(/factura\s*/i, '').trim().toUpperCase();
  return BILL_TYPE_CONFIG[letter] || { bg: '#f0f4f7', color: '#596064' };
};

export const columns = [
  { field: 'number',   headerName: 'N° Comprobante', flex: 1, align: 'center', headerAlign: 'center' },
  { field: 'date',     headerName: 'Fecha',          flex: 1, align: 'center', headerAlign: 'center' },
  { field: 'client',   headerName: 'Cliente',        flex: 2, align: 'center', headerAlign: 'center' },
  {
    field: 'billType',
    headerName: 'Tipo',
    flex: 1,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => {
      const cfg = getBillTypeConfig(params.value);
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
  { field: 'amount',   headerName: 'Importe',        flex: 1, align: 'center', headerAlign: 'center' },
];
