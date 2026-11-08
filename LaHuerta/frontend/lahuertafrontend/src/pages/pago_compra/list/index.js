import { useEffect, useState } from 'react';
import axios from 'axios';
import { paymentTypeUrl, purchasePaymentUrl } from '../../../constants/urls';
import { columns } from '../../../constants/grid/PagoCompra';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import GenericList from '../../../components/List';
import DeletePaymentMessage from '../shared/DeletePaymentMessage';
import {
  ON_ACCOUNT_LABEL,
  PURCHASE_LABEL,
  PURCHASE_PAYMENT_CONCEPT_OPTIONS,
  formatBuyNumber,
} from '../../../constants/purchasePaymentTypes';

const mapPaymentData = (data) => {
  return data.map((p) => ({
    id: p.id,
    paymentDate: formatDate(p.fecha_pago),
    // Primero el puesto, que es como identifican al proveedor; si el nombre es largo, la celda lo corta con "…".
    supplier: p.proveedor ? `Puesto ${p.proveedor.puesto} - ${p.proveedor.nombre}` : '-',
    concept: p.compra ? `${PURCHASE_LABEL} N° ${formatBuyNumber(p.compra.id)}` : ON_ACCOUNT_LABEL,
    buyNumber: p.compra ? `N° ${formatBuyNumber(p.compra.id)}` : '',
    isOnAccount: !p.compra,
    amount: formatCurrency(p.importe_abonado),
    paymentType: p.tipo_pago?.descripcion || '-',
    chequeRechazado: (p.cheques || []).some((check) => check.estado === 'RECHAZADO'),
    // Para explicar en el diálogo de eliminar qué pasa con los cheques.
    payment: p,
  }));
};

const buildData = (paymentTypeOptions) => ({
  title: 'Pagos de Compras',
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
  deleteMessage: (row) => <DeletePaymentMessage payment={row.payment} supplierName={row.payment.proveedor?.nombre || '—'} />,
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
