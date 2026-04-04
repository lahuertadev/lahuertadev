import { supplierUrl } from '../../../constants/urls';
import { columns } from '../../../constants/grid/Proveedor';
import { formatCurrency } from '../../../utils/currency';
import GenericList from '../../../components/List';
import { useNavigate } from 'react-router-dom';

const mapSupplierData = (data) => {
  const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

  return list.map((supplier) => ({
    id: supplier.id,
    nombre: supplier.nombre,
    fantasyName: supplier.nombre_fantasia,
    market: supplier.mercado.descripcion,
    puesto: supplier.puesto,
    nave: supplier.nave,
    telefono: supplier.telefono,
    checkingAccount: formatCurrency(supplier.cuenta_corriente),
    checkingAccountRaw: parseFloat(supplier.cuenta_corriente) || 0,
  }));
};

const data = {
  title: 'Proveedores',
  fetchUrl: {
    baseUrl: supplierUrl,
    createUrl: '/supplier/create',
    editUrl: '/supplier/edit',
  },
  columns: columns,
  mapData: mapSupplierData,
  filtersConfig: [
    { label: 'Nombre o nombre fantasía', name: 'searchQuery', type: 'text' },
    { label: 'Mercado', name: 'mercado', type: 'text' },
  ],
  newLabelText: 'Nuevo proveedor',
};

const SupplierList = () => {
  const navigate = useNavigate();

  const handleAddSupplier = () => {
    navigate('/supplier/create');
  };

  return (
    <GenericList
      data={data}
      onAdd={handleAddSupplier}
    />
  );
};

export default SupplierList;
