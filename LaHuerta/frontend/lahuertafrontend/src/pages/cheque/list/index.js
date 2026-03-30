import { checkUrl } from '../../../constants/urls';
import { columns } from '../../../constants/grid/Check';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import GenericList from '../../../components/List';
import { useNavigate } from 'react-router-dom';

const mapCheckData = (data) => {
  return data.map((check) => ({
    id: check.numero,
    numero: check.numero,
    bank: check.banco.descripcion,
    amount: formatCurrency(check.importe),
    issueDate: formatDate(check.fecha_emision),
    depositDate: check.fecha_deposito ? formatDate(check.fecha_deposito) : '-',
    state: check.estado ? check.estado.descripcion : '-',
    endorsed: check.endosado ? 'Sí' : 'No',
  }));
};

const data = {
  title: 'Cheques',
  fetchUrl: {
    baseUrl: checkUrl,
    createUrl: '/check/create',
    editUrl: '/check/edit',
  },
  columns: columns,
  mapData: mapCheckData,
  filtersConfig: [
    { label: 'Banco', name: 'bank', type: 'text' },
    { label: 'Estado', name: 'state', type: 'text' },
  ],
  newLabelText: 'cheque',
};

const CheckList = () => {
  const navigate = useNavigate();

  const handleAddCheck = () => {
    navigate('/check/create');
  };

  return (
    <GenericList
      data={data}
      onAdd={handleAddCheck}
    />
  );
};

export default CheckList;
