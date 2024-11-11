import React, { useEffect, useState } from 'react';
import DataGridDemo from '../../../components/Grid';
import axios from 'axios';
import '../../../styles/grids.css'
import { useNavigate } from 'react-router-dom';
import AlertDialog from '../../../components/DialogAlert';
import IconLabelButtons from '../../../components/Button';
import { formatDate } from '../../../utils/date';
import { formatCurrency } from '../../../utils/currency';
import { expenseDeleteUrl, expenseUrl } from '../../../constants/urls';
import { columns } from '../../../constants/grid/Expense';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete'; 
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';

const ExpenseList = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState([]);
  const [isMultipleDelete, setIsMultipleDelete] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const navigate = useNavigate();

  //* Función que carga la grilla.
  const fetchExpenses = async () => {
    setLoading(true);
    try{
      const response = await axios.get(expenseUrl);

      //* Mapeo de datos
      const mappedRows = response.data.map(expense => ({
        id: expense.id,
        date: formatDate(expense.fecha),
        amount: formatCurrency(expense.importe),
        expenseTypeDescription: expense.tipo_gasto.descripcion
      }));

      setRows(mappedRows);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddExpense = () => {
    navigate('/expense/create');
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  //* Función que abre el diálogo de confirmación
  const handleOpenConfirmDialog = (isMultiple, id) => {
    setIsMultipleDelete(isMultiple);
    setExpenseToDelete(id);
    setOpenConfirmDialog(true);
  };

  //* Función que cierra el diálogo de confirmación
  const handleCloseConfirmDialog = () => {
    setOpenConfirmDialog(false);
    setSelectedExpenseIds([]);
    setIsMultipleDelete(false);
  };

  //* Función para eliminar el registro de la tabla
  const handleDeleteConfirm = async () => {
    try {
      const idsToDelete = isMultipleDelete ? selectedExpenseIds : [expenseToDelete];
      await axios.delete(expenseDeleteUrl, { 
        data: { ids: idsToDelete } 
      });
      fetchExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
    } finally {
      setOpenConfirmDialog(false);
      setExpenseToDelete(null); // Reiniciar estado
      setSelectedExpenseIds([]); // Limpiar la selección
      setIsMultipleDelete(false); // Reiniciar la bandera de eliminación múltiple
    }
  };

  // Actualiza los IDs seleccionados en el estado
  const handleSelectionChange = (selection) => {
    console.log('Este es el selection: ', selection)
    setSelectedExpenseIds(selection);
  };

  const handleEdit = async (id) => {
    const expenseToEdit = rows.find(expense => expense.id === id);
    navigate(`/expense/edit/${id}`, { state: { expense: expenseToEdit } }) // Redirección + gasto seleccionado
  }

  if (error) return <div>Error: {error}</div>;

  return (
    <div className='container mx-auto h-full items-center flex flex-col bg-white rounded'>
        <div className="w-full">
          <h1 className="text-black font-bold text-3xl mt-2 ml-4 inline-block">Gastos</h1>
          <hr className="border-t border-gray-300 mt-2 mb-4" />
        </div>
        {loading && <div class="flex items-center justify-center h-screen">
        <div class="w-16 h-16 border-8 border-t-8 border-gray-200 rounded-full animate-spin border-t-gray-900"></div>
        </div>}
        <div className="mx-auto w-full p-2 rounded-lg shadow-md bg-white">
          <div className="flex items-start justify-between mb-4">
            <div className="mr-4">
              <IconLabelButtons
                label="Nuevo Gasto"
                icon={<AddCircleOutlineIcon />}
                onClick={handleAddExpense}
              />
              <IconLabelButtons
                label="Filtros"
                icon={<FilterAltOutlinedIcon />}
                // onClick={toggleFilters}
              />
            </div>
              <DataGridDemo 
              rows={rows} 
              columns={columns} 
              onDelete={(id) => handleOpenConfirmDialog(false, id)}
              onEdit={handleEdit}
              onSelectionChange={handleSelectionChange}
              />
          </div>
          <br></br>
          <div className='flex justify-center'>
          {selectedExpenseIds.length > 0 && (
          <IconLabelButtons
            label="Eliminar Seleccionados"
            icon={<DeleteIcon />}
            onClick={() => handleOpenConfirmDialog(true)}
            className="mt-4 hover:bg-red-500 hover:text-white"
          />
          )}
          </div>
        </div>
        <AlertDialog
        open={openConfirmDialog}
        title={isMultipleDelete ? "Confirmar eliminación múltiple" : "Confirmar eliminación"}
        message={isMultipleDelete ? "¿Estás seguro que querés eliminar estos gastos?" : "¿Estás seguro que querés eliminar este gasto?"}
        onConfirm={handleDeleteConfirm}
        onCancel={handleCloseConfirmDialog}
      />
    </div>
  );
};

export default ExpenseList;
