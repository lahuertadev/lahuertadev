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
          await axios.delete(`${fetchUrl.baseUrl}bulk_delete/`, {
          data: { ids: selectedIds },
          });
        }
      }
      fetchItems();
    } catch (error) {
      console.error("Error deleting item:", error);
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

  if (error) return <div>Error: {error}</div>;

  return (
    <div className='container mx-auto h-full items-center flex flex-col bg-white rounded'>
      <div className="w-full">
        <h1 className="text-black font-bold text-3xl mt-2 ml-4 inline-block">{title}</h1>
        <hr className="border-t border-gray-300 mt-2 mb-4" />
      </div>
      {loading && <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-8 border-t-8 border-gray-200 rounded-full animate-spin border-t-gray-900"></div>
      </div>}
      <div className="mx-auto w-full p-2 rounded-lg shadow-md bg-white">
        <div className="flex items-start justify-between mb-4">
          <div className="mr-4">
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
              <div className="flex flex-col mt-4 ml-8">
                {filtersConfig.map((filter, index) => (
                  <div key={index}>
                    <label className="text-black font-bold text-sm mt-3">{filter.label}</label>
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
                <div className='flex justify-center mt-3'>
                  <IconLabelButtons
                    label="Aplicar filtro"
                    icon={<SendOutlinedIcon />}
                    onClick={applyFilters}
                  />
                </div>
              </div>
            )}
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