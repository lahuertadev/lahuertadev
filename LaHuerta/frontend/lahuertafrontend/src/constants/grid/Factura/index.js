import React from 'react';
import { BADGE_COLORS } from '../../badgeColors';

const BILL_TYPE_CONFIG = {
  'A': { ...BADGE_COLORS.blue },
  'B': { ...BADGE_COLORS.green },
  'C': { ...BADGE_COLORS.yellow },
  'M': { ...BADGE_COLORS.violet },
  'ND': { ...BADGE_COLORS.orange },
  'NC': { ...BADGE_COLORS.pink },
};

const getBillTypeConfig = (label = '') => {
  const upper = label.toUpperCase();
  if (upper.includes('DÉBITO') || upper.includes('DEBITO')) return BILL_TYPE_CONFIG['ND'];
  if (upper.includes('CRÉDITO') || upper.includes('CREDITO')) return BILL_TYPE_CONFIG['NC'];
  const letter = label.replace(/factura\s*/i, '').trim().toUpperCase();
  return BILL_TYPE_CONFIG[letter] || { ...BADGE_COLORS.gray };
};

export const columns = [
  { field: 'number',   headerName: 'N° Comprobante', flex: 1, align: 'center', headerAlign: 'center', hiddenOnMobile: true },
  { field: 'date',     headerName: 'Fecha',          flex: 1, align: 'center', headerAlign: 'center', hiddenOnMobile: true },
  { field: 'client',   headerName: 'Cliente',        flex: 2, align: 'center', headerAlign: 'center' },
  {
    field: 'billType',
    headerName: 'Tipo',
    hiddenOnMobile: true,
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
