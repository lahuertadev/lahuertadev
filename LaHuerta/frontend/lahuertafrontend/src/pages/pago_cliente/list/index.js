import { clientPaymentUrl } from '../../../constants/urls';
import { columns } from '../../../constants/grid/ClientPayment';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import GenericList from '../../../components/List';
import { useNavigate } from 'react-router-dom';

const mapClientPaymentData = (data) => {
  return data.map((payment) => ({
    id: payment.id,
    date: formatDate(payment.fecha_pago),
    client: payment.cliente.razon_social,
    amount: formatCurrency(payment.importe),
    paymentType: payment.tipo_pago.descripcion,
    observations: payment.observaciones || '-',
  }));
};

const data = {
  title: 'Pagos de Clientes',
  fetchUrl: {
    baseUrl: clientPaymentUrl,
    createUrl: '/client-payment/create',
    editUrl: '/client-payment/edit',
  },
  columns: columns,
  mapData: mapClientPaymentData,
  filtersConfig: [
    { label: 'Cliente', name: 'client', type: 'text' },
    { label: 'Fecha', name: 'date', type: 'date' },
    { label: 'Importe', name: 'amount', type: 'number' },
  ],
  newLabelText: 'pago',
};

const ClientPaymentList = () => {
  const navigate = useNavigate();

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
