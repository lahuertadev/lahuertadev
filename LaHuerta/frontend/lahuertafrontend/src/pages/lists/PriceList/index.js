import { priceListUrl } from '../../../constants/urls';
import { formatDate } from '../../../utils/date';
import GenericList from '../../../components/List';
import { useNavigate } from 'react-router-dom';

const mapPriceListData = (data) => {
  const list = Array.isArray(data) ? data : [];
  return list.map((item) => ({
    id: item.id,
    titulo: item.nombre,
    fecha_ultima_actualizacion: formatDate(item.fecha_actualizacion),
  }));
};

const columns = [
  { field: 'titulo', headerName: 'Título' },
  { field: 'fecha_ultima_actualizacion', headerName: 'Última Actualización' },
];

const data = {
  title: 'Listas de Precios',
  fetchUrl: {
    baseUrl: priceListUrl,
    createUrl: '/price-list/create',
    editUrl: '/price-list/edit',
    detailUrl: '/price-list/detail',
  },
  columns,
  mapData: mapPriceListData,
  filtersConfig: [
    { label: 'Nombre', name: 'nombre', type: 'text' },
  ],
  newLabelText: 'lista de precios', 
};

const PriceListList = () => {
  const navigate = useNavigate();

  const handleAdd = () => {
    navigate('/price-list/create');
  };

  return <GenericList data={data} onAdd={handleAdd} />;
};

export default PriceListList;
