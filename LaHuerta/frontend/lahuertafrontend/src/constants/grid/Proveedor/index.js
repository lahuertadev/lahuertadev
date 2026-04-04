import React from 'react';

const CC_BADGE_CONFIG = {
  positive: { bg: '#ffebee', color: '#c62828' }, // deuda: La Huerta le debe al proveedor
  zero:     { bg: '#f0f4f7', color: '#596064' }, // equilibrio
  negative: { bg: '#dcfce7', color: '#166534' }, // saldo a favor: proveedor le debe a La Huerta
};

const badgeStyle = (cfg) => ({
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: 600,
  lineHeight: '18px',
  backgroundColor: cfg.bg,
  color: cfg.color,
  whiteSpace: 'nowrap',
});

export const columns = [
  { field: 'nombre',  headerName: 'Nombre',  flex: 2, align: 'center', headerAlign: 'center' },
  { field: 'market',  headerName: 'Mercado', flex: 1, align: 'center', headerAlign: 'center' },
  { field: 'puesto',  headerName: 'Puesto',  flex: 1, align: 'center', headerAlign: 'center' },
  { field: 'nave',    headerName: 'Nave',    flex: 1, align: 'center', headerAlign: 'center' },
  {
    field: 'checkingAccount',
    headerName: 'Cuenta corriente',
    flex: 1,
    minWidth: 160,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => {
      const numeric = params.row.checkingAccountRaw;
      const cfg = numeric > 0 ? CC_BADGE_CONFIG.positive
                : numeric < 0 ? CC_BADGE_CONFIG.negative
                : CC_BADGE_CONFIG.zero;
      return <span style={badgeStyle(cfg)}>{params.value}</span>;
    },
  },
];
