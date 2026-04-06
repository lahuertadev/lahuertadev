import React, { useState } from 'react';
import axios from 'axios';
import { checkUrl } from '../../../constants/urls';
import { columns } from '../../../constants/grid/Check';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import GenericList from '../../../components/List';
import Toast from '../../../components/Toast';

const ACTION_LABELS = {
  deposit: 'Depositar',
  credit:  'Acreditar',
  reject:  'Rechazar',
};

const actionBtnCls = (variant) => {
  const base = 'px-2.5 py-1 rounded-md text-xs font-semibold transition-all active:scale-95 ';
  if (variant === 'deposit') return base + 'bg-amber-50 text-amber-700 hover:bg-amber-100';
  if (variant === 'credit')  return base + 'bg-green-50 text-green-700 hover:bg-green-100';
  if (variant === 'reject')  return base + 'bg-red-50 text-red-600 hover:bg-red-100';
  return base;
};

const mapCheckData = (data) => {
  return data.map((check) => ({
    id: check.numero,
    numero: check.numero,
    bank: check.banco.descripcion,
    amount: formatCurrency(check.importe),
    issueDate: formatDate(check.fecha_emision),
    depositDate: check.fecha_deposito ? formatDate(check.fecha_deposito) : '-',
    depositDateRaw: check.fecha_deposito || null,
    state: check.estado ? check.estado.descripcion : '-',
    stateRaw: check.estado ? check.estado.descripcion : null,
    endorsed: check.endosado ? 'Sí' : 'No',
  }));
};

const FILTERS_CONFIG = [
  { label: 'Banco', name: 'banco', type: 'text' },
  {
    label: 'Estado',
    name: 'estado',
    type: 'select',
    options: [
      { name: 'En cartera',  value: 'EN_CARTERA' },
      { name: 'Depositado',  value: 'DEPOSITADO' },
      { name: 'Acreditado',  value: 'ACREDITADO' },
      { name: 'Endosado',    value: 'ENDOSADO'   },
      { name: 'Rechazado',   value: 'RECHAZADO'  },
    ],
  },
  {
    label: 'Endosado',
    name: 'endosado',
    type: 'select',
    options: [
      { name: 'Sí', value: 'true'  },
      { name: 'No', value: 'false' },
    ],
  },
  { label: 'Fecha depósito desde', name: 'fecha_deposito_desde', type: 'date' },
  { label: 'Fecha depósito hasta', name: 'fecha_deposito_hasta', type: 'date' },
];

const CheckList = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState({ open: false, message: '' });

  const handleStateChange = async (action, checkId) => {
    try {
      await axios.post(`${checkUrl}${checkId}/${action}/`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const msg = err?.response?.data?.detail || `Error al ${ACTION_LABELS[action].toLowerCase()} el cheque.`;
      setToast({ open: true, message: msg });
    }
  };

  const actionsColumn = {
    field: 'stateAction',
    headerName: 'Acción',
    width: 170,
    sortable: false,
    headerAlign: 'center',
    align: 'center',
    renderCell: (params) => {
      const state = params.row.stateRaw;
      if (state === 'EN_CARTERA') {
        return (
          <div className="flex items-center justify-center h-full w-full">
            <button className={actionBtnCls('deposit')} onClick={() => handleStateChange('deposit', params.row.id)}>
              Depositar
            </button>
          </div>
        );
      }
      if (state === 'DEPOSITADO') {
        return (
          <div className="flex gap-1.5 items-center h-full">
            <button className={actionBtnCls('credit')} onClick={() => handleStateChange('credit', params.row.id)}>
              Acreditar
            </button>
            <button className={actionBtnCls('reject')} onClick={() => handleStateChange('reject', params.row.id)}>
              Rechazar
            </button>
          </div>
        );
      }
      return <span className="text-on-surface-muted text-xs">—</span>;
    },
  };

  const data = {
    title: 'Cheques',
    fetchUrl: { baseUrl: checkUrl },
    columns: [...columns, actionsColumn],
    mapData: mapCheckData,
    multiSelect: false,
    showAdd: false,
    showEdit: false,
    showDelete: false,
    filtersConfig: FILTERS_CONFIG,
  };

  return (
    <>
      <Toast open={toast.open} message={toast.message} onClose={() => setToast({ open: false, message: '' })} />
      <GenericList key={refreshKey} data={data} />
    </>
  );
};

export default CheckList;
