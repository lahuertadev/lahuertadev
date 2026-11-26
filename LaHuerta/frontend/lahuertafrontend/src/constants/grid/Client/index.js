import React from 'react';
import { getActiveBadgeStyle } from '../../statusBadge';

export const columns = [
  { field: 'cuit',           headerName: 'CUIT',             align: 'center', headerAlign: 'center', hiddenOnMobile: true },
  // El nombre de fantasía es como se conoce al cliente (si no tiene, la razón social). Un nombre largo se corta
  // con "…" y se ve completo en el tooltip, en web y en mobile (TruncatedCell de la grilla).
  { field: 'fantasyName',    headerName: 'Nombre de fantasía', align: 'center', headerAlign: 'center', mobileHeaderName: 'Cliente', mobileClickable: true, truncateAtMaxChars: true },
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