import { marketUrl } from '../../../constants/urls';
import GenericList from '../../../components/List';
import { useNavigate } from 'react-router-dom';

const mapMarketData = (data) => {
  const list = Array.isArray(data) ? data : [];
  return list.map((item) => ({
    id: item.id,
    descripcion: item.descripcion,
  }));
};

const columns = [{ field: 'descripcion', headerName: 'Descripción' }];

const data = {
  title: 'Mercados',
  fetchUrl: {
    baseUrl: marketUrl,
    createUrl: '/market/create',
    editUrl: '/market/edit',
  },
  columns,
  mapData: mapMarketData,
  filtersConfig: [],
  newLabelText: 'Nuevo mercado',
};

const MarketList = () => {
  const navigate = useNavigate();

  const handleAdd = () => {
    navigate('/market/create');
  };

  return <GenericList data={data} onAdd={handleAdd} />;
};

export default MarketList;
