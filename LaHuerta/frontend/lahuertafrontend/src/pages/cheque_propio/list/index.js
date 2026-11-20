import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ownCheckUrl } from '../../../constants/urls';
import { columns } from '../../../constants/grid/OwnCheck';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import GenericList from '../../../components/List';
import AlertDialog from '../../../components/DialogAlert';
import Toast from '../../../components/Toast';
import { useToast } from '../../../context/ToastContext';
import {
  OWN_CHECK_ACTIONS, OWN_CHECK_ACTION_ERROR_VERBS, OWN_CHECK_ACTION_SUCCESS, canCancel, canCash, canReject, isCashDue, ownCheckConfirmation,
} from '../shared/ownCheckActions';

const mapOwnCheckData = (data) =>
  data.map((check) => ({
    id: check.id,
    numero: check.numero,
    supplier: check.supplier_name || '—',
    bank: check.banco?.descripcion || '-',
    amount: formatCurrency(check.importe),
    issueDate: formatDate(check.fecha_emision),
    depositDate: check.fecha_deposito ? formatDate(check.fecha_deposito) : '-',
    depositDateRaw: check.fecha_deposito || null,
    dueDate: formatDate(check.fecha_vencimiento),
    dueDateRaw: check.fecha_vencimiento,
    state: check.estado || '-',
    stateRaw: check.estado,
    // Para habilitar las acciones de estado y explicar sus confirmaciones.
    check,
  }));

const FILTERS_CONFIG = [
  { label: 'Banco', name: 'bank', type: 'text' },
  {
    label: 'Estado',
    name: 'state',
    type: 'select',
    options: [
      { name: 'Emitido', value: 'EMITIDO' },
      { name: 'Cobrado', value: 'COBRADO' },
      { name: 'Anulado', value: 'ANULADO' },
      { name: 'Rechazado', value: 'RECHAZADO' },
    ],
  },
];

const buildData = (extraActions) => ({
  title: 'Cheques emitidos',
  subtitle: 'Cheques de La Huerta entregados a proveedores: estado, cobro y anulación.',
  fetchUrl: { baseUrl: ownCheckUrl, editUrl: '/own-check/edit', detailUrl: '/own-check/detail' },
  columns,
  mapData: mapOwnCheckData,
  multiSelect: false,
  showAdd: true,
  newLabelText: 'Nuevo cheque',
  showEdit: true,
  showDelete: false,
  canEdit: (row) => row.stateRaw === 'EMITIDO',
  editDisabledReason: 'Solo se editan los cheques emitidos (no cobrados ni anulados)',
  // Detalle, Cobrar, Rechazar, Anular y Editar en una sola columna "Acción" (como Cheques y Pagos de Compras):
  // siempre visibles, grisadas con el motivo cuando no corresponden al estado del cheque.
  groupActions: true,
  extraActions,
  filtersConfig: FILTERS_CONFIG,
});

const OwnCheckList = () => {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState({ open: false, message: '' });
  const [confirm, setConfirm] = useState(null); // { action, check }
  const { showToast } = useToast();

  const runAction = async (action, check) => {
    try {
      await axios.post(`${ownCheckUrl}${check.id}/${action}/`);
      showToast(OWN_CHECK_ACTION_SUCCESS[action]);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      const msg = err?.response?.data?.detail || `Error al ${OWN_CHECK_ACTION_ERROR_VERBS[action]} el cheque.`;
      setToast({ open: true, message: msg });
    }
  };

  const action = (key, isEnabled, onClick, extra = {}) => ({
    key,
    label: OWN_CHECK_ACTIONS[key].label,
    icon: OWN_CHECK_ACTIONS[key].icon,
    isEnabled: (row) => isEnabled(row.check),
    disabledReason: (row) => {
      const reason = OWN_CHECK_ACTIONS[key].disabledReason;
      return typeof reason === 'function' ? reason(row.check) : reason;
    },
    onClick: (row) => onClick(row.check),
    ...extra,
  });

  // Cobrar se hace directo; Anular y Rechazar piden confirmación explicando qué pasa con los pagos.
  const extraActions = [
    // Se destaca cuando ya llegó la fecha de depósito, como Depositar en Cheques, en verde como el estado Cobrado.
    action('cash', canCash, (check) => runAction('cash', check), {
      needsAttention: (row) => isCashDue(row.check),
      attentionReason: 'la fecha de depósito ya llegó',
      attentionTone: 'success',
    }),
    action('reject', canReject, (check) => setConfirm({ action: 'reject', check }), { danger: true }),
    action('cancel', canCancel, (check) => setConfirm({ action: 'cancel', check }), { danger: true }),
  ];

  const confirmation = confirm ? ownCheckConfirmation(confirm.action, confirm.check) : null;

  return (
    <>
      <Toast open={toast.open} message={toast.message} onClose={() => setToast({ open: false, message: '' })} />
      <GenericList refreshKey={refreshKey} data={buildData(extraActions)} onAdd={() => navigate('/own-check/create')} />
      <AlertDialog
        open={Boolean(confirm)}
        title={confirmation?.title}
        message={confirmation?.message}
        confirmLabel={confirmation?.confirmLabel}
        onConfirm={() => { runAction(confirm.action, confirm.check); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
};

export default OwnCheckList;
