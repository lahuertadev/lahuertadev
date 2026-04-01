import { buyUrl } from '../../../constants/urls';
import { columns } from '../../../constants/grid/Compra';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import GenericList from '../../../components/List';
import { useNavigate } from 'react-router-dom';

const mapBuyData = (data) =>
  data.map((buy) => ({
    id: buy.id,
    number: String(buy.id).padStart(8, '0'),
    date: formatDate(buy.fecha),
    supplier: buy.proveedor.nombre,
    senia: formatCurrency(buy.senia),
    amount: formatCurrency(buy.importe),
  }));

const data = {
  title: 'Compras',
  fetchUrl: {
    baseUrl: buyUrl,
    createUrl: '/buy/create',
    editUrl: '/buy/edit',
  },
  columns: columns,
  mapData: mapBuyData,
  filtersConfig: [
    { label: 'Proveedor',    name: 'proveedor_id', type: 'number' },
    { label: 'Importe mín.', name: 'importe_min',  type: 'number' },
    { label: 'Importe máx.', name: 'importe_max',  type: 'number' },
    { label: 'Fecha desde',  name: 'fecha_desde',  type: 'date'   },
    { label: 'Fecha hasta',  name: 'fecha_hasta',  type: 'date'   },
  ],
  newLabelText: 'Nueva compra',
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
