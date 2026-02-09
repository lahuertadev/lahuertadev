import { categoryUrl } from '../../../constants/urls';
import GenericList from '../../../components/List';
import { useNavigate } from 'react-router-dom';

const mapCategoryData = (data) => {
  const list = Array.isArray(data) ? data : [];
  return list.map((item) => ({
    id: item.id,
    descripcion: item.descripcion,
  }));
};

const columns = [{ field: 'descripcion', headerName: 'Descripción' }];

const data = {
  title: 'Categorías',
  fetchUrl: {
    baseUrl: categoryUrl,
    createUrl: '/category/create',
    editUrl: '/category/edit',
  },
  columns,
  mapData: mapCategoryData,
  filtersConfig: [{ label: 'Descripción', name: 'descripcion', type: 'text' }],
  newLabelText: 'categoría',
};

const CategoryList = () => {
  const navigate = useNavigate();

  const handleAdd = () => {
    navigate('/category/create');
  };

  return <GenericList data={data} onAdd={handleAdd} />;
};

export default CategoryList;

