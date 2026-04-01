import { purchasePaymentUrl } from '../../../constants/urls';
import { columns } from '../../../constants/grid/PagoCompra';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import GenericList from '../../../components/List';

const mapPaymentData = (data) => {
  return data.map((p) => ({
    id: p.id,
    paymentDate: formatDate(p.fecha_pago),
    supplier: p.compra?.proveedor || '-',
    buyDate: p.compra?.fecha ? formatDate(p.compra.fecha) : '-',
    amount: formatCurrency(p.importe_abonado),
    paymentType: p.tipo_pago?.descripcion || '-',
    cheque: p.cheque?.numero || '-',
  }));
};

const data = {
  title: 'Pagos de Compras',
  fetchUrl: {
    baseUrl: purchasePaymentUrl,
    createUrl: '/purchase-payment/create',
  },
  columns,
  mapData: mapPaymentData,
  newLabelText: 'Nuevo pago',
  multiSelect: false,
  showEdit: false,
  canDelete: (row) => !row.cheque || row.cheque === '-',
};

const PurchasePaymentList = () => <GenericList data={data} />;

export default PurchasePaymentList;
