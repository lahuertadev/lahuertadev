import React from 'react';
import { getActiveBadgeStyle } from '../../statusBadge';

export const columns = [
  { field: 'cuit',           headerName: 'CUIT',             align: 'center', headerAlign: 'center', hiddenOnMobile: true },
  { field: 'businessName',   headerName: 'Razón social',     align: 'center', headerAlign: 'center', mobileClickable: true },
  { field: 'checkingAccount',headerName: 'Cuenta corriente', align: 'center', headerAlign: 'center' },
  {
    field: 'state',
    headerName: 'Estado',
    hiddenOnMobile: true,
    width: 110,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
        <span style={getActiveBadgeStyle(params.value === 'Activo')}>{params.value}</span>
      </div>
    ),
  },
];