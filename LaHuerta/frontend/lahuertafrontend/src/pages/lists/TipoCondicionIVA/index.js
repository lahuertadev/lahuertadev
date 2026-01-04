import React, { useEffect, useState } from 'react';
import { ConditionIvaTypeUrl } from '../../../constants/urls';
import axios from 'axios';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import CustomInput from '../../../components/Input';
import Button from '../../../components/Button';
import DataGridDemo from '../../../components/Grid';
import AlertDialog from '../../../components/DialogAlert';
import { Box, Paper, Button as MuiButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const mapIvaConditionData = (data) => {
  const list = Array.isArray(data) ? data : [];
  return list.map(item => ({
    id: item.id,
    descripcion: item.descripcion,
  }));
};

const columns = [
  { field: 'descripcion', headerName: 'Descripción', flex: 1 },
];

const ConditionIvaTypeList = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // Cargar datos
  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await axios.get(ConditionIvaTypeUrl);
      const mappedRows = mapIvaConditionData(response.data);
      setRows(mappedRows);
    } catch (error) {
      console.error('Error cargando condiciones IVA:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Validación
  const validationSchema = Yup.object().shape({
    descripcion: Yup.string()
      .max(20, 'Máximo 20 caracteres')
      .required('Requerido'),
  });

  // Manejar submit del formulario
  const handleSubmit = async (values, { resetForm }) => {
    try {
      if (editingId) {
        await axios.put(`${ConditionIvaTypeUrl}${editingId}/`, values);
        setEditingId(null);
      } else {
        await axios.post(ConditionIvaTypeUrl, values);
      }
      resetForm();
      fetchItems();
    } catch (error) {
      console.error('Error guardando condición IVA:', error);
      alert('Error al guardar. Verifique que la descripción no esté duplicada.');
    }
  };

  // Manejar edición
  const handleEdit = (id) => {
    const itemToEdit = rows.find(item => item.id === id);
    if (itemToEdit) {
      setEditingId(id);
    }
  };

  // Manejar cancelar edición
  const handleCancel = (resetForm) => {
    setEditingId(null);
    resetForm();
  };

  // Manejar eliminación
  const handleOpenConfirmDialog = (id) => {
    setItemToDelete(id);
    setOpenConfirmDialog(true);
  };

  const handleCloseConfirmDialog = () => {
    setOpenConfirmDialog(false);
    setItemToDelete(null);
    setSelectedIds([]);
  };

  const handleDeleteConfirm = async () => {
    try {
      if (itemToDelete) {
        await axios.delete(`${ConditionIvaTypeUrl}${itemToDelete}/`);
        fetchItems();
      }
    } catch (error) {
      console.error('Error eliminando condición IVA:', error);
    } finally {
      handleCloseConfirmDialog();
    }
  };

  const handleSelectionChange = (selection) => {
    setSelectedIds(selection);
  };

  // Valores iniciales del formulario
  const getInitialValues = () => {
    if (editingId) {
      const itemToEdit = rows.find(item => item.id === editingId);
      return { descripcion: itemToEdit?.descripcion || '' };
    }
    return { descripcion: '' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-8 border-t-8 border-gray-200 rounded-full animate-spin border-t-gray-900"></div>
      </div>
    );
  }

  return (
    <div className='container mx-auto h-full items-center flex flex-col bg-white rounded'>
      <div className="w-full">
        <h1 className="text-black font-bold text-3xl mt-2 ml-4 inline-block">Condiciones de IVA</h1>
        <hr className="border-t border-gray-300 mt-2 mb-4" />
      </div>
      
      {/* Formulario inline */}
      <Box sx={{ width: '100%', mb: 3, px: 2 }}>
        <Paper sx={{ p: 2 }}>
          <Formik
            initialValues={getInitialValues()}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({ values, handleChange, errors, touched, resetForm }) => (
              <Form>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Box sx={{ flexGrow: 1, maxWidth: '400px' }}>
                    <CustomInput
                      name="descripcion"
                      label="Descripción"
                      type="text"
                      value={values.descripcion}
                      onChange={handleChange}
                      helperText={touched.descripcion && errors.descripcion}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Button
                      label={editingId ? "Actualizar" : "Agregar"}
                      color="primary"
                      variant="contained"
                      size="medium"
                    />
                    {editingId && (
                      <MuiButton
                        variant="outlined"
                        color="secondary"
                        size="medium"
                        type="button"
                        onClick={() => handleCancel(resetForm)}
                        sx={{ textTransform: 'none' }}
                      >
                        Cancelar
                      </MuiButton>
                    )}
                  </Box>
                </Box>
              </Form>
            )}
          </Formik>
        </Paper>
      </Box>

      {/* Tabla */}
      <div className="mx-auto w-full p-2 rounded-lg shadow-md bg-white">
        <DataGridDemo 
          rows={rows} 
          columns={columns} 
          onDelete={handleOpenConfirmDialog}
          onEdit={handleEdit}
          onSelectionChange={handleSelectionChange}
        />
        <br />
        <div className='flex justify-center'>
          {selectedIds.length > 0 && (
            <Button
              label="Eliminar seleccionados"
              icon={<DeleteIcon />}
              onClick={() => handleOpenConfirmDialog(null)}
              className="mt-4 hover:bg-red-500 hover:text-white"
            />
          )}
        </div>
      </div>

      <AlertDialog
        open={openConfirmDialog}
        title="Confirmar eliminación"
        message="¿Estás seguro que querés eliminar este elemento?"
        onConfirm={handleDeleteConfirm}
        onCancel={handleCloseConfirmDialog}
      />
    </div>
  );
};

export default ConditionIvaTypeList;
