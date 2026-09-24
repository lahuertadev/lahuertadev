import React from 'react';
import Tooltip from '@mui/material/Tooltip';
import ErrorIcon from '@mui/icons-material/ErrorOutline';

const PAYMENT_TYPE_CONFIG = {
  'Efectivo':      { bg: '#dcfce7', color: '#166534' },
  'Cheque':        { bg: '#e8f0fb', color: '#4a7bc4' },
  'Cheque Propio': { bg: '#f3e8ff', color: '#7c3aed' },
};

export const columns = [
  { field: 'paymentDate', headerName: 'Fecha pago',        minWidth: 130, align: 'center', headerAlign: 'center', hiddenOnMobile: true },
  { field: 'supplier',    headerName: 'Proveedor',         minWidth: 150, align: 'center', headerAlign: 'center', mobileClickable: true },
  { field: 'buyDate',     headerName: 'Fecha compra',      minWidth: 130, align: 'center', headerAlign: 'center', hiddenOnMobile: true },
  { field: 'amount',      headerName: 'Importe',           minWidth: 120, align: 'center', headerAlign: 'center' },
  {
    field: 'paymentType',
    headerName: 'Tipo pago',
    minWidth: 140,
    align: 'center',
    headerAlign: 'center',
    hiddenOnMobile: true,
    renderCell: (params) => {
      const cfg = PAYMENT_TYPE_CONFIG[params.value] || { bg: '#f0f4f7', color: '#596064' };
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, height: '100%' }}>
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
          {params.row.chequeRechazado && (
            <Tooltip title="El cheque con el que se pagó fue rechazado. La cuenta corriente del proveedor ya fue revertida." arrow>
              <ErrorIcon sx={{ fontSize: 16, color: '#ef4444', cursor: 'default' }} />
            </Tooltip>
          )}
        </div>
      );
    },
  },
  { field: 'cheque', headerName: 'Cheque Nro.', minWidth: 120, align: 'center', headerAlign: 'center', hiddenOnMobile: true },
];
