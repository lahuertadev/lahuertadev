import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ownCheckUrl } from '../../../constants/urls';
import { columns } from '../../../constants/grid/OwnCheck';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import GenericList from '../../../components/List';

const mapOwnCheckData = (data) =>
  data.map((check) => ({
    id: check.numero,
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

const data = {
  title: 'Cheques emitidos',
  fetchUrl: { baseUrl: ownCheckUrl, editUrl: '/own-check/edit', detailUrl: '/own-check/detail' },
  columns,
  mapData: mapOwnCheckData,
  multiSelect: false,
  showAdd: true,
  newLabelText: 'Nuevo cheque',
  showEdit: true,
  showDelete: false,
  canEdit: (row) => row.stateRaw === 'EMITIDO',
  filtersConfig: FILTERS_CONFIG,
};

const OwnCheckList = () => {
  const navigate = useNavigate();
  return <GenericList data={data} onAdd={() => navigate('/own-check/create')} />;
};

export default OwnCheckList;
