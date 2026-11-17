import React, { useState } from 'react';
import axios from 'axios';
import { checkUrl } from '../../../constants/urls';
import { columns } from '../../../constants/grid/Check';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import GenericList from '../../../components/List';
import Toast from '../../../components/Toast';
import AccountBalanceIcon from '@mui/icons-material/AccountBalanceOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline';
import BlockIcon from '@mui/icons-material/Block';

const ACTION_LABELS = {
  deposit: 'Depositar',
  credit:  'Acreditar',
  reject:  'Rechazar',
};

const isInWallet = (row) => row.stateRaw === 'EN_CARTERA';
const isDepositedOrEndorsed = (row) => row.stateRaw === 'DEPOSITADO' || row.stateRaw === 'ENDOSADO';

const mapCheckData = (data) => {
  return data.map((check) => ({
    id: check.id,
    numero: check.numero,
    bank: check.banco.descripcion,
    client: check.cliente?.razon_social || '-',
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

  // Acciones de estado como íconos en la columna Acción, junto a Detalle (como Pagos de Compras):
  // siempre visibles, grisadas con el motivo cuando no corresponden al estado del cheque.
  const extraActions = [
    {
      key: 'deposit',
      label: ACTION_LABELS.deposit,
      icon: AccountBalanceIcon,
      onClick: (row) => handleStateChange('deposit', row.id),
      isEnabled: isInWallet,
      disabledReason: 'Solo se depositan los cheques en cartera',
    },
    {
      key: 'credit',
      label: ACTION_LABELS.credit,
      icon: CheckCircleIcon,
      onClick: (row) => handleStateChange('credit', row.id),
      isEnabled: isDepositedOrEndorsed,
      disabledReason: 'Solo se acreditan los cheques depositados o endosados',
    },
    {
      key: 'reject',
      label: ACTION_LABELS.reject,
      icon: BlockIcon,
      onClick: (row) => handleStateChange('reject', row.id),
      isEnabled: isDepositedOrEndorsed,
      disabledReason: 'Solo se rechazan los cheques depositados o endosados',
      danger: true,
    },
  ];

  const data = {
    title: 'Cheques',
    subtitle: 'Cheques recibidos de clientes: estado, depósito y endoso.',
    fetchUrl: { baseUrl: checkUrl, detailUrl: '/check/detail' },
    columns,
    mapData: mapCheckData,
    multiSelect: false,
    showAdd: false,
    showEdit: false,
    showDelete: false,
    groupActions: true,
    extraActions,
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
