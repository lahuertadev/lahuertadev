import React from 'react';
import Tooltip from '@mui/material/Tooltip';
import ErrorIcon from '@mui/icons-material/Error';

const STATE_CONFIG = {
  'EN_CARTERA': { label: 'En cartera', bg: '#e8f0fb', color: '#4a7bc4' },
  'DEPOSITADO': { label: 'Depositado', bg: '#fef9c3', color: '#a16207' },
  'ACREDITADO': { label: 'Acreditado', bg: '#dcfce7', color: '#166534' },
  'ENDOSADO':   { label: 'Endosado',   bg: '#f3e8ff', color: '#7e22ce' },
  'RECHAZADO':  { label: 'Rechazado',  bg: '#ffebee', color: '#c62828' },
};

export const columns = [
  { field: 'numero',    headerName: 'Número',         align: 'center', headerAlign: 'center' },
  { field: 'bank',      headerName: 'Banco',           align: 'center', headerAlign: 'center' },
  { field: 'amount',    headerName: 'Importe',         align: 'center', headerAlign: 'center' },
  { field: 'issueDate', headerName: 'Fecha emisión',   align: 'center', headerAlign: 'center', minWidth: 140 },
  {
    field: 'depositDate',
    headerName: 'Fecha depósito',
    minWidth: 160,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => {
      const { depositDateRaw, stateRaw } = params.row;
      const overdue = stateRaw === 'EN_CARTERA' && depositDateRaw && new Date(depositDateRaw) < new Date();
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <span>{params.value}</span>
          {overdue && (
            <Tooltip title="La fecha de depósito ya pasó y el cheque sigue en cartera" arrow>
              <ErrorIcon sx={{ fontSize: 16, color: '#ef4444', cursor: 'default' }} />
            </Tooltip>
          )}
        </div>
      );
    },
  },
  {
    field: 'state',
    headerName: 'Estado',
    minWidth: 130,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => {
      const cfg = STATE_CONFIG[params.value] || { label: params.value || '-', bg: '#f0f4f7', color: '#596064' };
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
  { field: 'endorsed', headerName: 'Endosado', align: 'center', headerAlign: 'center' },
];
