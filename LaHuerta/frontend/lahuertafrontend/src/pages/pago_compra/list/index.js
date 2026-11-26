import { useEffect, useState } from 'react';
import axios from 'axios';
import { paymentTypeUrl, purchasePaymentUrl } from '../../../constants/urls';
import { columns } from '../../../constants/grid/PagoCompra';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import { formatDocumentNumber } from '../../../utils/documentNumber';
import GenericList from '../../../components/List';
import CancelPaymentMessage from '../shared/CancelPaymentMessage';
import BlockIcon from '@mui/icons-material/Block';
import {
  ON_ACCOUNT_LABEL,
  PURCHASE_PAYMENT_CONCEPT_OPTIONS,
  PURCHASE_PAYMENT_STATE_TABS,
  purchaseCountLabel,
  droppedChecksNotice,
  isCancelledPayment,
} from '../../../constants/purchasePaymentTypes';

// Qué cubre el pago: cuántas compras o ninguna (a cuenta).
const conceptOf = (buys) => (buys.length === 0 ? ON_ACCOUNT_LABEL : purchaseCountLabel(buys.length));

const mapPaymentData = (data) => {
  return data.map((p) => ({
    id: p.id,
    number: formatDocumentNumber(p.id),
    paymentDate: formatDate(p.fecha_pago),
    // Primero el puesto, que es como identifican al proveedor; si el nombre es largo, la celda lo corta con "…".
    supplier: p.proveedor ? `Puesto ${p.proveedor.puesto} - ${p.proveedor.nombre}` : '-',
    concept: conceptOf(p.compras || []),
    isOnAccount: !p.compras?.length,
    amount: formatCurrency(p.importe_abonado),
    paymentType: p.tipo_pago?.descripcion || '-',
    // Aviso del ícono rojo: el pago tiene cheques rechazados o anulados.
    droppedChecksNotice: droppedChecksNotice(p),
    // Pago anulado: queda como registro, sin editar ni volver a anular.
    isCancelled: isCancelledPayment(p),
    // Para explicar en el diálogo de anular qué pasa con las compras y los cheques.
    payment: p,
  }));
};

const buildData = (paymentTypeOptions) => ({
  title: 'Pagos de Compras',
  subtitle: 'Registrá los pagos a proveedores, de una o varias compras o a cuenta, y los cheques con que se pagan.',
  fetchUrl: {
    baseUrl: purchasePaymentUrl,
    createUrl: '/purchase-payment/create',
    editUrl: '/purchase-payment/edit',
    detailUrl: '/purchase-payment/detail',
  },
  columns,
  mapData: mapPaymentData,
  newLabelText: 'Nuevo pago',
  multiSelect: false,
  groupActions: true,
  // Un pago no se elimina: se anula (borrado lógico) y queda como registro.
  deleteLabel: 'Anular',
  deleteIcon: BlockIcon,
  deleteDialogTitle: 'Anular pago',
  deleteMessage: (row) => <CancelPaymentMessage payment={row.payment} supplierName={row.payment.proveedor?.nombre || '—'} />,
  deleteSuccessMessage: () => 'El pago se anuló correctamente.',
  deleteRequest: (id) => axios.post(`${purchasePaymentUrl}${id}/cancel/`),
  // Solapas Vigentes / Anulados debajo del título, en lugar de un filtro de estado.
  tabs: PURCHASE_PAYMENT_STATE_TABS,
  canEdit: (row) => !row.isCancelled,
  canDelete: (row) => !row.isCancelled,
  editDisabledReason: 'El pago está anulado: no se puede editar',
  deleteDisabledReason: 'El pago ya está anulado',
  filtersConfig: [
    // Busca por puesto (un número) o por nombre del proveedor.
    { label: 'Proveedor (puesto o nombre)', name: 'supplier', type: 'text' },
    { label: 'Concepto', name: 'kind', type: 'select', options: PURCHASE_PAYMENT_CONCEPT_OPTIONS },
    { label: 'Tipo de pago', name: 'payment_type_id', type: 'select', options: paymentTypeOptions },
    { label: 'Importe mín.', name: 'amount_min', type: 'number' },
    { label: 'Importe máx.', name: 'amount_max', type: 'number' },
    { label: 'Fecha desde', name: 'date_from', type: 'date' },
    { label: 'Fecha hasta', name: 'date_to', type: 'date' },
  ],
});

const PurchasePaymentList = () => {
  const [data, setData] = useState(buildData([]));

  // Las opciones de "Tipo de pago" salen de los tipos cargados en el sistema, como en Pagos de Clientes.
  useEffect(() => {
    axios.get(paymentTypeUrl).then((res) => {
      const options = res.data
        .map((type) => ({ name: type.descripcion, value: type.id }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
      setData(buildData(options));
    }).catch(() => {});
  }, []);

  return <GenericList data={data} />;
};

export default PurchasePaymentList;
