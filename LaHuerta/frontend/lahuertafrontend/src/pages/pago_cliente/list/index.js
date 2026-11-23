import { useEffect, useState } from 'react';
import axios from 'axios';
import BlockIcon from '@mui/icons-material/Block';
import { clientPaymentUrl, paymentTypeUrl } from '../../../constants/urls';
import { columns } from '../../../constants/grid/ClientPayment';
import { CLIENT_PAYMENT_STATE_TABS, isCancelledClientPayment, rejectedChecksNotice } from '../../../constants/clientPayment';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import { formatDocumentNumber } from '../../../utils/documentNumber';
import GenericList from '../../../components/List';
import { useNavigate } from 'react-router-dom';
import CancelClientPaymentMessage from '../shared/CancelClientPaymentMessage';

const mapClientPaymentData = (data) => {
  return data.map((payment) => ({
    id: payment.id,
    number: formatDocumentNumber(payment.id),
    date: formatDate(payment.fecha_pago),
    client: payment.cliente.razon_social,
    amount: formatCurrency(payment.importe),
    paymentType: payment.tipo_pago.descripcion,
    observations: payment.observaciones || '-',
    // Aviso del ícono rojo: el pago vigente tiene cheques rechazados.
    rejectedChecksNotice: rejectedChecksNotice(payment),
    // Pago anulado: queda como registro, sin editar ni volver a anular.
    isCancelled: isCancelledClientPayment(payment),
    // Para explicar en el diálogo de anular qué pasa con la cuenta corriente y los cheques.
    payment,
  }));
};

const buildData = (paymentTypeOptions) => ({
  title: 'Pagos de Clientes',
  subtitle: 'Registrá los pagos de los clientes y los cheques con que pagan.',
  fetchUrl: {
    baseUrl: clientPaymentUrl,
    createUrl: '/client-payment/create',
    editUrl: '/client-payment/edit',
    detailUrl: '/client-payment/detail',
  },
  columns: columns,
  mapData: mapClientPaymentData,
  filtersConfig: [
    { label: 'Cliente', name: 'business_name', type: 'text' },
    { label: 'Tipo de Pago', name: 'payment_type_id', type: 'select', options: paymentTypeOptions },
    { label: 'Importe mín.', name: 'amount_min', type: 'number' },
    { label: 'Importe máx.', name: 'amount_max', type: 'number' },
    { label: 'Fecha desde', name: 'date_from', type: 'date' },
    { label: 'Fecha hasta', name: 'date_to', type: 'date' },
  ],
  newLabelText: 'Nuevo pago',
  multiSelect: false,
  // Detalle, Editar y Anular en una sola columna "Acción" (como Cheques y Pagos de Compras).
  groupActions: true,
  // Un pago no se elimina: se anula (borrado lógico), con un motivo, y queda como registro.
  deleteLabel: 'Anular',
  deleteIcon: BlockIcon,
  deleteDialogTitle: 'Anular pago',
  deleteMessage: (row) => <CancelClientPaymentMessage payment={row.payment} />,
  deleteReason: { label: 'Motivo de la anulación', placeholder: 'Ej.: lo pagó otro cliente, se cargó dos veces…' },
  deleteRequest: (id, reason) => axios.post(`${clientPaymentUrl}${id}/cancel/`, { motivo: reason }),
  deleteSuccessMessage: () => 'El pago se anuló correctamente.',
  // Solapas Vigentes / Anulados debajo del título, en lugar de un filtro de estado.
  tabs: CLIENT_PAYMENT_STATE_TABS,
  canEdit: (row) => !row.isCancelled,
  canDelete: (row) => !row.isCancelled,
  editDisabledReason: 'El pago está anulado: no se puede editar',
  deleteDisabledReason: 'El pago ya está anulado',
});

const ClientPaymentList = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(buildData([]));

  useEffect(() => {
    axios.get(paymentTypeUrl).then((res) => {
      const options = res.data.map((t) => ({ name: t.descripcion, value: t.id }));
      setData(buildData(options));
    }).catch(() => {});
  }, []);

  const handleAddPayment = () => {
    navigate('/client-payment/create');
  };

  return (
    <GenericList
      data={data}
      onAdd={handleAddPayment}
    />
  );
};

export default ClientPaymentList;
