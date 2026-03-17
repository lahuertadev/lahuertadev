import { productUrl } from '../../../constants/urls';
import { columns } from '../../../constants/grid/producto';
import GenericList from '../../../components/List';
import { useNavigate } from 'react-router-dom';

const mapProductData = (data) => {
  const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

  return list.map((product) => ({
    id: product.id,
    product: product.descripcion || '',
    category: product.categoria?.descripcion || '',
    containerType: product.tipo_contenedor?.descripcion || '',
    unitType: product.tipo_unidad?.descripcion || '',
    unitsPerBundle: product.cantidad_por_bulto,
    approximateWeight: product.peso_aproximado,
  }));
};

const data = {
  title: 'Productos',
  fetchUrl: {
    baseUrl: productUrl,
    createUrl: '/product/create',
    editUrl: '/product/edit',
    detailUrl: '/product/detail',
  },
  columns: columns,
  mapData: mapProductData,
  filtersConfig: [
    {
      label: 'Producto',
      name: 'description',
      type: 'text',
    },
    {
      label: 'Categoría',
      name: 'category',
      type: 'text',
    },
    {
      label: 'Tipo de contenedor',
      name: 'container_type',
      type: 'text',
    },
  ],
  newLabelText: 'producto',
};

const ProductsList = () => {
  const navigate = useNavigate();

  const handleAddProduct = () => {
    navigate('/product/create');
  };

  return (
    <GenericList
      data={data}
      onAdd={handleAddProduct}
    />
  );
};

export default ProductsList;