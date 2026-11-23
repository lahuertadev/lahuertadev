import { buyUrl } from '../../../constants/urls';
import { columns } from '../../../constants/grid/Compra';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import { formatDocumentNumber } from '../../../utils/documentNumber';
import GenericList from '../../../components/List';
import DeleteBuyMessage from '../shared/DeleteBuyMessage';
import { useNavigate } from 'react-router-dom';

const mapBuyData = (data) =>
  data.map((buy) => ({
    id: buy.id,
    number: formatDocumentNumber(buy.id),
    date: formatDate(buy.fecha),
    supplier: buy.proveedor.nombre,
    senia: formatCurrency(buy.senia),
    amount: formatCurrency(buy.importe),
    paymentStatus: buy.payment_status,
    outstandingBalance: formatCurrency(buy.outstanding_balance),
    // Para el diálogo de eliminar.
    buy,
  }));

const data = {
  title: 'Compras',
  subtitle: 'Compras a proveedores, con sus productos, seña y estado de pago.',
  fetchUrl: {
    baseUrl: buyUrl,
    createUrl: '/buy/create',
    editUrl: '/buy/edit',
    detailUrl: '/buy/detail',
  },
  columns: columns,
  mapData: mapBuyData,
  filtersConfig: [
    // Busca por puesto (un número) o por nombre del proveedor, como en Pagos de Compras.
    { label: 'Proveedor (puesto o nombre)', name: 'supplier', type: 'text' },
    { label: 'Importe mín.', name: 'importe_min',  type: 'amount' },
    { label: 'Importe máx.', name: 'importe_max',  type: 'amount' },
    { label: 'Fecha desde',  name: 'fecha_desde',  type: 'date'   },
    { label: 'Fecha hasta',  name: 'fecha_hasta',  type: 'date'   },
  ],
  newLabelText: 'Nueva compra',
  deleteDialogTitle: 'Eliminar compra',
  deleteMessage: (row) => <DeleteBuyMessage buy={row.buy} />,
  deleteConfirmLabel: 'Eliminar compra',
  deleteSuccessMessage: (count) => (count > 1 ? `Se eliminaron ${count} compras correctamente.` : 'La compra se eliminó correctamente.'),
  // Detalle, Editar y Eliminar en una sola columna "Acción" (como Pagos de Compras), para dejarle más lugar a los datos.
  groupActions: true,
};

const BuyList = () => {
  const navigate = useNavigate();
  return (
    <GenericList
      data={data}
      onAdd={() => navigate('/buy/create')}
    />
  );
};

export default BuyList;
