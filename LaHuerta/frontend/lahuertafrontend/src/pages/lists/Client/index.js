import { clientUrl } from '../../../constants/urls';
import { columns } from '../../../constants/grid/Client';
import { formatCuit } from '../../../utils/cuit';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import GenericList from '../../../components/List';
import { useNavigate } from 'react-router-dom';

const mapClientData = (data) => {
  return data.map(client => ({
      id: client.id,
      cuit: formatCuit(client.cuit),
      businessName: client.razon_social,
      checkingAccount: formatCurrency(client.cuenta_corriente),
      address: `${client.domicilio} ${client.localidad.descripcion}`,
      billingType: client.tipo_facturacion.descripcion,
      ivaCondition: client.condicion_IVA.descripcion,
      phone: client.telefono,
      salesStartDate: formatDate(client.fecha_inicio_ventas),
      fantasyName: client.nombre_fantasia,
  }));
};

const data = {
  title: 'Clientes',
  fetchUrl: clientUrl,
  columns: columns,
  mapData: mapClientData,
  filtersConfig: [
    { 
      label: 'CUIT',
      name: 'cuit',
      type: 'text',
      validation: {
        regex: /^\d{1,11}$/, 
        errorMessage: 'El CUIT debe ser un número de hasta 11 dígitos sin caracteres especiales',
      },
    },
    { label: 'Razón Social o nombre fantasía', name: 'searchQuery', type :'text' },
    { label: 'Dirección', name: 'address', type: 'text' },
  ],
  newLabelText : 'cliente',
};

const ClientsList = () => {
  const navigate = useNavigate();

  const handleAddClient = () => {
    navigate('/client/create');
  };

  return (
    <GenericList
      data = {data}  
      onAdd={handleAddClient}         
    />
  );
};

export default ClientsList;
