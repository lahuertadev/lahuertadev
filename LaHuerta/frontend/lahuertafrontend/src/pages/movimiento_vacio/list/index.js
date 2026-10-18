import { emptyMovementUrl } from '../../../constants/urls';
import { columns } from '../../../constants/grid/MovimientoVacio';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import GenericList from '../../../components/List';
import { EMPTY_MOVEMENT_TYPE_OPTIONS } from '../../../constants/emptyMovementTypes';

const mapMovementData = (data) =>
  data.map((movement) => ({
    id: movement.id,
    date: formatDate(movement.fecha),
    supplier: movement.proveedor.nombre,
    type: movement.tipo,
    receiptNumber: movement.nro_comprobante || '-',
    quantity: movement.contenedores.reduce((sum, line) => sum + line.cantidad, 0),
    amount: formatCurrency(movement.importe),
  }));

const data = {
  title: 'Vacíos',
  subtitle: 'Cargas y devoluciones de vacíos de cada proveedor.',
  fetchUrl: {
    baseUrl: emptyMovementUrl,
    createUrl: '/empty-movement/create',
    editUrl: '/empty-movement/edit',
    detailUrl: '/empty-movement/detail',
  },
  columns,
  mapData: mapMovementData,
  filtersConfig: [
    { label: 'Proveedor',   name: 'proveedor',    type: 'text' },
    {
      label: 'Tipo',
      name: 'tipo',
      type: 'select',
      options: EMPTY_MOVEMENT_TYPE_OPTIONS,
    },
    { label: 'Importe',     name: 'importe',      type: 'number' },
    { label: 'Fecha desde', name: 'fecha_desde',  type: 'date' },
    { label: 'Fecha hasta', name: 'fecha_hasta',  type: 'date' },
  ],
  newLabelText: 'Nuevo movimiento',
  // Sin selección múltiple: los DELETE en paralelo del mismo proveedor pisarían su cuenta corriente.
  multiSelect: false,
  deleteSuccessMessage: () => 'Movimiento eliminado.',
};

const EmptyMovementList = () => <GenericList data={data} />;

export default EmptyMovementList;
