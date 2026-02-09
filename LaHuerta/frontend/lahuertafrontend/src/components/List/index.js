import React, { useEffect, useState } from 'react';
import DataGridDemo from '../Grid';
import AlertDialog from '../DialogAlert';
import IconLabelButtons from '../Button';
import CustomInput from '../Input';
import DatePicker from '../DatePicker';
import '../../styles/grids.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DeleteIcon from '@mui/icons-material/Delete'; 
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';

const GenericList = ({ data, onAdd }) => {
  const { title, fetchUrl, columns, mapData, filtersConfig, newLabelText } = data;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isMultipleDelete, setIsMultipleDelete] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterValues, setFilterValues] = useState({});
  const navigate = useNavigate();


  //* Función que carga los datos con filtros dinámicos
  const fetchItems = async (filters) => {
    setLoading(true);
    try {
      let urlWithParams = fetchUrl.baseUrl;

      if (filters && Object.keys(filters).length > 0) {
        const queryParams = new URLSearchParams();
  
        filtersConfig.forEach(filter => {
          const filterValue = filters[filter.name];
          if (filterValue) {
            queryParams.append(filter.name, filterValue);
          }
        });
  
        urlWithParams = `${fetchUrl.baseUrl}?${queryParams.toString()}`;
      }
  
      const response = await axios.get(urlWithParams);
  
      const mappedRows = data.mapData ? data.mapData(response.data) : response.data;
      setRows(mappedRows);
    } catch (error) {
      console.error('Error en la petición: ', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // --------------------------- ⬇⬇ FILTROS ⬇⬇ ---------------------------------------
  const toggleFilters = () => {
    setShowFilters(prev => !prev);
  };

  const handleFilterChange = (e) => {
    setFilterValues({ ...filterValues, [e.target.name]: e.target.value });
  };

  const applyFilters = () => {
    fetchItems(filterValues);
  };
  // --------------------------- ⬆⬆ FILTROS ⬆⬆ ---------------------------------------

  const handleOpenConfirmDialog = (isMultiple, id) => {
    setIsMultipleDelete(isMultiple);
    setItemToDelete(id);
    setOpenConfirmDialog(true);
  };

  const handleCloseConfirmDialog = () => {
    setOpenConfirmDialog(false);
    setSelectedIds([]);
    setIsMultipleDelete(false);
  };

  const handleDeleteConfirm = async () => {
    try {
      if (itemToDelete){
        await axios.delete(`${fetchUrl.baseUrl}${itemToDelete}/`)
      }
      else if (selectedIds){
        if(selectedIds.length === 1){
          await axios.delete(`${fetchUrl.baseUrl}${selectedIds[0]}/`)
        }
        else{
          try {
            await axios.delete(`${fetchUrl.baseUrl}bulk_delete/`, {
              data: { ids: selectedIds },
            });
          } catch (bulkErr) {
            // Fallback si el endpoint bulk_delete no existe en el backend
            await Promise.all(
              selectedIds.map((id) => axios.delete(`${fetchUrl.baseUrl}${id}/`))
            );
          }
        }
      }
      fetchItems();
    } catch (error) {
      console.error("Error deleting item:", error);
      const backendMessage =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        error?.message ||
        'Error inesperado al eliminar';
      alert(backendMessage);
    } finally {
      handleCloseConfirmDialog();
    }
  };

  const handleSelectionChange = (selection) => {
    setSelectedIds(selection);
  };

  const handleEdit = (id) => {
    const itemToEdit = rows.find(item => item.id === id);
    console.log('Datos de la fila seleccionada para editar:', itemToEdit);
    navigate(`${fetchUrl.editUrl}/${id}`, { state: { item: itemToEdit } });
  };

  const handleDetail = fetchUrl.detailUrl
    ? (id) => navigate(`${fetchUrl.detailUrl}/${id}`)
    : undefined;

  if (error) return <div>Error: {error}</div>;

  return (
    <div className='container mx-auto h-full items-center flex flex-col bg-white rounded'>
      <div className="w-full">
        <h1 className="text-black font-bold text-3xl mt-2 ml-4 inline-block">{title}</h1>
        <hr className="border-t border-gray-300 mt-2 mb-2" />
      </div>
      {loading && <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-8 border-t-8 border-gray-200 rounded-full animate-spin border-t-gray-900"></div>
      </div>}
      <div className="mx-auto w-full max-w-6xl px-3 py-2 rounded-lg shadow-md bg-white">
        <div className="flex items-start gap-4 mb-2">
          <div className="shrink-0 flex flex-col gap-3">
            <IconLabelButtons
              label={`Nuevo ${newLabelText || ''}`}
              icon={<AddCircleOutlineIcon />}
              onClick={() => navigate(fetchUrl.createUrl)}
            />
            <IconLabelButtons
              label="Filtros"
              icon={<FilterAltOutlinedIcon />}
              onClick={toggleFilters}
            />
            {showFilters && (
              <div className="mt-1 p-3 rounded-md border border-gray-200 bg-gray-50/80 w-full min-w-[220px]">
                <p className="text-gray-600 text-sm font-semibold mb-2">Campos de filtrado</p>
                <div className="flex flex-col gap-2">
                  {filtersConfig.map((filter, index) => (
                    <div key={index}>
                      <label className="text-black font-bold text-sm block mb-0.5">{filter.label}</label>
                      {filter.type === 'date' ? (
                        <DatePicker
                          name={filter.name}
                          required={false}
                          value={filterValues[filter.name]}
                          onChange={(newValue) => setFilterValues({ ...filterValues, [filter.name]: newValue })}
                        />
                      ) : (
                        <CustomInput
                          name={filter.name}
                          variant='outlined'
                          value={filterValues[filter.name] || ''}
                          onChange={handleFilterChange}
                          regex={filter.validation?.regex}
                          regexErrorText={filter.validation?.errorMessage}
                        />
                      )}
                    </div>
                  ))}
                  <div className='flex justify-center pt-1'>
                    <IconLabelButtons
                      label="Aplicar filtro"
                      icon={<SendOutlinedIcon />}
                      onClick={applyFilters}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <DataGridDemo 
            rows={rows} 
            columns={columns} 
            onDelete={(id) => handleOpenConfirmDialog(false, id)}
            onEdit={handleEdit}
            onDetail={handleDetail}
            onSelectionChange={handleSelectionChange}
          />
          </div>
        </div>
        <br className="my-1" />
        <div className='flex justify-center'>
          {selectedIds.length > 0 && (
            <IconLabelButtons
              label="Eliminar seleccionados"
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
        message={isMultipleDelete ? "¿Estás seguro que querés eliminar estos elementos?" : "¿Estás seguro que querés eliminar este elemento?"}
        onConfirm={handleDeleteConfirm}
        onCancel={handleCloseConfirmDialog}
      />
    </div>
  );
};

export default GenericList;