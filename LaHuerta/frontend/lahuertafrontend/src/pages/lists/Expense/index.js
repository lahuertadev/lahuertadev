import { expenseUrl, expenseDeleteUrl } from '../../../constants/urls';
import { columns } from '../../../constants/grid/Expense';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import GenericList from '../../../components/List';
import { useNavigate } from 'react-router-dom';

const mapExpenseData = (data) => {
  return data.map(expense => ({
    id: expense.id,
    date: formatDate(expense.fecha),
    amount: formatCurrency(expense.importe),
    expenseTypeDescription: expense.tipo_gasto.descripcion,
    expenseTypeId: expense.tipo_gasto.id
  }));
};

const data = {
  title: 'Gastos',
  fetchUrl: {
    baseUrl : expenseUrl,
    createUrl : '/expense/create',
    editUrl: '/expense/edit',
  },
  columns: columns,
  mapData: mapExpenseData,
  filtersConfig: [
    { label: 'Fecha', name: 'date', type:'date'},
    { label: 'Importe', name: 'amount', type:'number'},
    { label: 'Tipo de gasto', name: 'expense_type', type:'text'}
  ],
  newLabelText : 'gasto',
};

const ExpensesList = () => {
  const navigate = useNavigate();

  const handleAddExpense = () => {
    navigate('/expense/create');
  };

  return (
    <GenericList
      data = {data}  
      onAdd={handleAddExpense}         
    />
  );
};

export default ExpensesList;
