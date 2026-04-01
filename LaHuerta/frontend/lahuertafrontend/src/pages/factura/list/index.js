import { billUrl } from '../../../constants/urls';
import { columns } from '../../../constants/grid/Factura';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import GenericList from '../../../components/List';
import { useNavigate } from 'react-router-dom';

const mapBillData = (data) =>
  data.map((bill) => ({
    id: bill.id,
    number: String(bill.id).padStart(8, '0'),
    date: formatDate(bill.fecha),
    client: bill.cliente.razon_social,
    billType: bill.tipo_factura.descripcion,
    amount: formatCurrency(bill.importe),
  }));

const data = {
  title: 'Facturas / Remitos',
  fetchUrl: {
    baseUrl: billUrl,
    createUrl: '/bill/create',
    editUrl: '/bill/edit',
    detailUrl: '/bill/detail',
  },
  columns: columns,
  mapData: mapBillData,
  filtersConfig: [
    { label: 'CUIT',        name: 'cuit',         type: 'text' },
    { label: 'Razón Social', name: 'razon_social', type: 'text' },
    { label: 'Importe mín.', name: 'importe_min',  type: 'number' },
    { label: 'Importe máx.', name: 'importe_max',  type: 'number' },
    { label: 'Fecha desde',  name: 'fecha_desde',  type: 'date' },
    { label: 'Fecha hasta',  name: 'fecha_hasta',  type: 'date' },
  ],
  newLabelText: 'Nuevo Remito',
};

const BillList = () => {
  const navigate = useNavigate();
  return (
    <GenericList
      data={data}
      onAdd={() => navigate('/bill/create')}
    />
  );
};

export default BillList;
