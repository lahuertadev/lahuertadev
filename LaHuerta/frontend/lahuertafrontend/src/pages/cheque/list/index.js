import { checkUrl } from '../../../constants/urls';
import { columns } from '../../../constants/grid/Check';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import GenericList from '../../../components/List';

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
  fetchUrl: { baseUrl: checkUrl },
  columns: columns,
  mapData: mapCheckData,
  multiSelect: false,
  showAdd: false,
  showEdit: false,
  showDelete: false,
  filtersConfig: [
    { label: 'Banco', name: 'banco', type: 'text' },
    {
      label: 'Estado',
      name: 'estado',
      type: 'select',
      options: [
        { name: 'En cartera',  value: 'EN_CARTERA' },
        { name: 'Depositado',  value: 'DEPOSITADO' },
        { name: 'Acreditado',  value: 'ACREDITADO' },
        { name: 'Endosado',    value: 'ENDOSADO'   },
        { name: 'Rechazado',   value: 'RECHAZADO'  },
      ],
    },
    {
      label: 'Endosado',
      name: 'endosado',
      type: 'select',
      options: [
        { name: 'Sí', value: 'true'  },
        { name: 'No', value: 'false' },
      ],
    },
    { label: 'Fecha depósito desde', name: 'fecha_deposito_desde', type: 'date' },
    { label: 'Fecha depósito hasta', name: 'fecha_deposito_hasta', type: 'date' },
  ],
};

const CheckList = () => <GenericList data={data} />;

export default CheckList;
