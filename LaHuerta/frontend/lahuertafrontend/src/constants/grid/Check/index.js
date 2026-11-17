import React from 'react';
import AlertIcon from '../../../components/AlertIcon';
import { BADGE_COLORS } from '../../badgeColors';
import Badge from '../../../components/Badge';

export const CHECK_STATE_CONFIG = {
  'EN_CARTERA': { label: 'En cartera', ...BADGE_COLORS.blue },
  'DEPOSITADO': { label: 'Depositado', ...BADGE_COLORS.yellow },
  'ACREDITADO': { label: 'Acreditado', ...BADGE_COLORS.green },
  'ENDOSADO':   { label: 'Endosado',   ...BADGE_COLORS.violet },
  'RECHAZADO':  { label: 'Rechazado',  ...BADGE_COLORS.red },
};

export const columns = [
  { field: 'numero',    headerName: 'Número',         align: 'center', headerAlign: 'center', hiddenOnMobile: true },
  { field: 'bank',      headerName: 'Banco',           align: 'center', headerAlign: 'center', hiddenOnMobile: true },
  { field: 'client',    headerName: 'Cliente',         align: 'center', headerAlign: 'center', hiddenOnMobile: true, width: 130 },
  { field: 'amount',    headerName: 'Importe',         align: 'center', headerAlign: 'center', mobileClickable: true },
  { field: 'issueDate', headerName: 'Emisión',         align: 'center', headerAlign: 'center', minWidth: 110, hiddenOnMobile: true },
  {
    field: 'depositDate',
    headerName: 'Depósito',
    minWidth: 130,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => {
      const { depositDateRaw, stateRaw } = params.row;
      const overdue = stateRaw === 'EN_CARTERA' && depositDateRaw && new Date(depositDateRaw) < new Date();
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* El aviso queda pegado a la derecha de la fecha sin correrla: las fechas quedan centradas igual. */}
          <span className="relative">
            {params.value}
            {overdue && (
              <AlertIcon
                title="La fecha de depósito ya pasó y el cheque sigue en cartera"
                className="absolute left-full top-1/2 -translate-y-1/2 ml-1"
              />
            )}
          </span>
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
      const cfg = CHECK_STATE_CONFIG[params.value] || { label: params.value || '-', ...BADGE_COLORS.gray };
      return (
        <Badge color={cfg} label={cfg.label} />
      );
    },
  },
  { field: 'endorsed', headerName: 'Endosado', align: 'center', headerAlign: 'center', hiddenOnMobile: true },
];
