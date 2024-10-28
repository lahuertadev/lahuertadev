// routes/Expense/ExpenseList.js
import React, { useEffect, useState } from 'react';
import DataGridDemo from '../../components/Grid';
import axios from 'axios';
import '../../styles/grids.css'
import { useNavigate } from 'react-router-dom'; // Para utilizar la redirección en el edit
import AlertDialog from '../../components/DialogAlert'
import { formatDate } from '../../utils/date'
import { formatCurrency } from '../../utils/currency'
import { deleteUrl } from '../../constants/urls'

const ExpenseList = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState([]);
  const [isMultipleDelete, setIsMultipleDelete] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  //* Función que carga la grilla.
  const fetchExpenses = async () => {
    setLoading(true);
    try{
      const response = await axios.get('http://localhost:8000/expense/');

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
    console.log('Entre en la función a eliminar')
    try {
        if (expenseToDelete !== null) { // Si hay un gasto específico a eliminar
          console.log('Hay un sólo registro')
          await axios.delete(`${deleteUrl}/${expenseToDelete}/delete/`);
        } else if (selectedExpenseIds.length > 0) { // Si hay múltiples gastos seleccionados
            console.log('Hay múltiples registros')
            await Promise.all(selectedExpenseIds.map(id => axios.delete(`${deleteUrl}/${id}/delete/`)));
        }
        fetchExpenses(); // Refrescar la lista después de eliminar
    } catch (error) {
        console.error("Error deleting expense:", error);
    } finally {
        setOpenConfirmDialog(false);
        setExpenseToDelete(null); // Reiniciar estado
        setSelectedExpenseIds([]);
        setIsMultipleDelete(false);
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

  

  const columns = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'date', headerName: 'Fecha', width: 150 },
    { field: 'amount', headerName: 'Importe', width: 150 },
    { field: 'expenseTypeDescription', headerName: 'Tipo de Gasto', width: 150 },

  ];

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="custom-table">
        <DataGridDemo 
        rows={rows} 
        columns={columns} 
        onDelete={(id) => handleOpenConfirmDialog(false, id)}
        onEdit={handleEdit}
        onSelectionChange={handleSelectionChange}
        />
        

        <AlertDialog
        open={openConfirmDialog}
        title={isMultipleDelete ? "Confirmar eliminación múltiple" : "Confirmar eliminación"}
        message={isMultipleDelete ? "¿Estás seguro que querés eliminar estos gastos?" : "¿Estás seguro que querés eliminar este gasto?"}
        onConfirm={handleDeleteConfirm}
        onCancel={handleCloseConfirmDialog}
      />

      {selectedExpenseIds.length > 0 && (
        <button onClick={() => handleOpenConfirmDialog(true)}>
          Eliminar Seleccionados
        </button>
      )}
    </div>
    
  );
};

export default ExpenseList;
