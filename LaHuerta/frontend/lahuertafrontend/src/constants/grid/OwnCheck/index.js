import React from 'react';
import Tooltip from '@mui/material/Tooltip';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline';

const STATE_CONFIG = {
  'EMITIDO': { label: 'Emitido', bg: '#e8f0fb', color: '#4a7bc4' },
  'COBRADO': { label: 'Cobrado', bg: '#dcfce7', color: '#166534' },
  'ANULADO': { label: 'Anulado', bg: '#ffebee', color: '#c62828' },
};


export const columns = [
  { field: 'numero',    headerName: 'Número',            flex: 0.6, align: 'center', headerAlign: 'center', hiddenOnMobile: true },
  { field: 'supplier',  headerName: 'Proveedor',         flex: 1.1, align: 'center', headerAlign: 'center', hiddenOnMobile: true },
  { field: 'bank',      headerName: 'Banco',             flex: 0.9, align: 'center', headerAlign: 'center', hiddenOnMobile: true },
  { field: 'amount',    headerName: 'Importe',           flex: 0.8, align: 'center', headerAlign: 'center', mobileClickable: true },
  { field: 'issueDate', headerName: 'Fecha emisión',     flex: 0.9, align: 'center', headerAlign: 'center', hiddenOnMobile: true },
  {
    field: 'depositDate',
    headerName: 'Fecha depósito',
    flex: 0.9,
    align: 'center',
    headerAlign: 'center',
    hiddenOnMobile: true,
    renderCell: (params) => {
      const { depositDateRaw, stateRaw } = params.row;
      if (!depositDateRaw) {
        return <span>{params.value}</span>;
      }
      const readyToDeposit = stateRaw === 'EMITIDO' && new Date(depositDateRaw) <= new Date();
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <span>{params.value}</span>
          {readyToDeposit && (
            <Tooltip title="La fecha de pago ya llegó: el cheque puede depositarse" arrow>
              <CheckCircleIcon sx={{ fontSize: 15, color: '#16a34a' }} />
            </Tooltip>
          )}
        </div>
      );
    },
  },
  {
    field: 'dueDate',
    headerName: 'Válido hasta',
    flex: 0.9,
    align: 'center',
    headerAlign: 'center',
    hiddenOnMobile: true,
    renderCell: (params) => {
      const isOverdue = params.row.stateRaw === 'EMITIDO'
        && params.row.dueDateRaw
        && new Date(params.row.dueDateRaw) < new Date();
      return (
        <span style={{ color: isOverdue ? '#ef4444' : 'inherit', fontWeight: isOverdue ? 600 : 'inherit' }}>
          {params.value}
        </span>
      );
    },
  },
  {
    field: 'state',
    headerName: 'Estado',
    flex: 0.7,
    minWidth: 115,
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
];
