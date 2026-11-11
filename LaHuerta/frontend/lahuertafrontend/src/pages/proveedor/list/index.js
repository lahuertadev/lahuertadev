import { supplierUrl } from '../../../constants/urls';
import { columns } from '../../../constants/grid/Proveedor';
import { formatCurrency } from '../../../utils/currency';
import { getMainPhone } from '../../../utils/phone';
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
    telefono: getMainPhone(supplier.contactos),
    checkingAccount: formatCurrency(supplier.cuenta_corriente),
    checkingAccountRaw: parseFloat(supplier.cuenta_corriente) || 0,
  }));
};

const data = {
  title: 'Proveedores',
  subtitle: 'Gestioná los datos, los contactos y la cuenta corriente de cada proveedor.',
  fetchUrl: {
    baseUrl: supplierUrl,
    createUrl: '/supplier/create',
    editUrl: '/supplier/edit',
    detailUrl: '/supplier/detail',
  },
  columns: columns,
  mapData: mapSupplierData,
  filtersConfig: [
    { label: 'Nombre o nombre fantasía', name: 'searchQuery', type: 'text' },
    { label: 'Mercado', name: 'mercado', type: 'text' },
  ],
  newLabelText: 'Nuevo proveedor',
  // Detalle, Editar y Eliminar en una sola columna "Acción" (como Pagos de Compras), para dejarle más lugar a los datos.
  groupActions: true,
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
