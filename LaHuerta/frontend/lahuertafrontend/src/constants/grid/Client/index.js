import React from 'react';

const badgeStyle = (active) => ({
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: 600,
  lineHeight: '18px',
  backgroundColor: active ? '#dcfce7' : '#fee2e2',
  color: active ? '#166534' : '#991b1b',
  whiteSpace: 'nowrap',
});

export const columns = [
  { field: 'cuit', headerName: 'CUIT' },
  { field: 'businessName', headerName: 'Razón social' },
  { field: 'checkingAccount', headerName: 'Cuenta corriente' },
  {
    field: 'state',
    headerName: 'Estado',
    width: 110,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
        <span style={badgeStyle(params.value === 'Activo')}>{params.value}</span>
      </div>
    ),
  },
];