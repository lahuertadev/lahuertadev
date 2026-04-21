import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ownCheckUrl } from '../../../constants/urls';
import { columns, formatCompras } from '../../../constants/grid/OwnCheck';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import GenericList from '../../../components/List';
import Toast from '../../../components/Toast';
import AlertDialog from '../../../components/DialogAlert';

const ACTION_LABELS = {
  cash:   'Cobrar',
  cancel: 'Anular',
};

const actionBtnCls = (variant) => {
  const base = 'px-2.5 py-1 rounded-md text-xs font-semibold transition-all active:scale-95 ';
  if (variant === 'cash')   return base + 'bg-green-50 text-green-700 hover:bg-green-100';
  if (variant === 'cancel') return base + 'bg-red-50 text-red-600 hover:bg-red-100';
  return base;
};

const mapOwnCheckData = (data) =>
  data.map((check) => ({
    id: check.numero,
    numero: check.numero,
    supplier: check.supplier_name || '—',
    purchases: formatCompras(check.purchases),
    purchasesRaw: check.purchases || [],
    bank: check.banco?.descripcion || '-',
    amount: formatCurrency(check.importe),
    issueDate: formatDate(check.fecha_emision),
    dueDate: formatDate(check.fecha_vencimiento),
    state: check.estado || '-',
    stateRaw: check.estado,
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
    ],
  },
];

const OwnCheckList = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState({ open: false, message: '' });
  const [cancelConfirm, setCancelConfirm] = useState({ open: false, checkId: null });
  const navigate = useNavigate();

  const handleStateChange = async (action, checkId) => {
    try {
      await axios.post(`${ownCheckUrl}${checkId}/${action}/`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const msg = err?.response?.data?.detail || `Error al ${ACTION_LABELS[action].toLowerCase()} el cheque.`;
      setToast({ open: true, message: msg });
    }
  };

  const actionsColumn = {
    field: 'stateAction',
    headerName: 'Acción',
    width: 160,
    sortable: false,
    headerAlign: 'center',
    align: 'center',
    renderCell: (params) => {
      const state = params.row.stateRaw;
      if (state === 'EMITIDO') {
        const hasNoPurchases = !params.row.purchasesRaw || params.row.purchasesRaw.length === 0;
        return (
          <div className="flex gap-1.5 items-center h-full">
            <button className={actionBtnCls('cash')} onClick={() => handleStateChange('cash', params.row.id)}>
              Cobrar
            </button>
            <button
              className={actionBtnCls('cancel')}
              onClick={(e) => {
                e.stopPropagation();
                setCancelConfirm({ open: true, checkId: params.row.id, hasNoPurchases });
              }}
            >
              Anular
            </button>
          </div>
        );
      }
      return <span className="text-on-surface-muted text-xs">—</span>;
    },
  };

  const data = {
    title: 'Cheques emitidos',
    fetchUrl: { baseUrl: ownCheckUrl, editUrl: '/own-check/edit' },
    columns: [...columns, actionsColumn],
    mapData: mapOwnCheckData,
    multiSelect: false,
    showAdd: true,
    newLabelText: 'Nuevo cheque',
    showEdit: true,
    showDelete: true,
    canEdit: (row) => row.stateRaw === 'EMITIDO',
    canDelete: (row) => row.stateRaw === 'EMITIDO',
    filtersConfig: FILTERS_CONFIG,
  };

  return (
    <>
      <Toast open={toast.open} message={toast.message} onClose={() => setToast({ open: false, message: '' })} />
      <GenericList key={refreshKey} data={data} onAdd={() => navigate('/own-check/create')} />
      <AlertDialog
        open={cancelConfirm.open}
        title={cancelConfirm.hasNoPurchases ? 'Anular cheque sin compras asociadas' : 'Anular cheque con compras asociadas'}
        message={
          cancelConfirm.hasNoPurchases
            ? 'Este cheque no tiene compras asociadas. ¿Estás seguro que querés anularlo? Una vez anulado quedará el registro y no podrá ser editado ni eliminado.'
            : 'Este cheque tiene compras asociadas. Al anularlo, los pagos serán eliminados, la cuenta corriente del proveedor será restaurada y las facturas volverán a su estado anterior. ¿Estás seguro que querés continuar?'
        }
        onConfirm={() => {
          handleStateChange('cancel', cancelConfirm.checkId);
          setCancelConfirm({ open: false, checkId: null });
        }}
        onCancel={() => setCancelConfirm({ open: false, checkId: null })}
      />
    </>
  );
};

export default OwnCheckList;
