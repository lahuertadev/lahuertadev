import { useEffect, useState } from 'react';
import axios from 'axios';
import { clientPaymentUrl, paymentTypeUrl } from '../../../constants/urls';
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

const buildData = (paymentTypeOptions) => ({
  title: 'Pagos de Clientes',
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
