import React, { useEffect, useState } from 'react';
import DataGridDemo from '../Grid';
import AlertDialog from '../DialogAlert';
import IconLabelButtons from '../Button';
import CustomInput from '../Input';
import BasicDatePicker from '../DatePicker';
import BasicSelect from '../Select';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { breadcrumbsMap } from '../../constants/breadcrumbs';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import CloseIcon from '@mui/icons-material/Close';

/**
 * GenericList — listado reutilizable con filtros, paginación y acciones CRUD.
 *
 * Props del objeto `data`:
 *   title         — título de la sección (string)
 *   fetchUrl      — { baseUrl, createUrl, editUrl, detailUrl? }
 *   columns       — definición de columnas para DataGridDemo
 *   mapData       — (responseData) => rows[]   función para transformar la respuesta
 *   filtersConfig — array de { label, name, type: 'text'|'date'|'number'|'select', options? }
 *   newLabelText  — texto completo del botón de creación (ej. "Nuevo cliente", "Nueva categoría")
 *   breadcrumbs   — (opcional) array de { label, path? } para mostrar navegación superior
 *
 * Props directas:
 *   onAdd         — (opcional) callback personalizado para el botón "Nueva X";
 *                   si no se pasa, navega a fetchUrl.createUrl
 */
const GenericList = ({ data, onAdd }) => {
  const { title, fetchUrl, columns, mapData, filtersConfig, newLabelText, breadcrumbs, multiSelect = true, canDelete, canEdit, showAdd = true, showEdit = true, showDelete = true } = data;

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
  const location = useLocation();

  const resolvedBreadcrumbs = breadcrumbs
    || breadcrumbsMap[location.pathname]
    || breadcrumbsMap[Object.keys(breadcrumbsMap).find(k => location.pathname.startsWith(k))]
    || null;

  const fetchItems = async (filters) => {
    setLoading(true);
    try {
      let urlWithParams = fetchUrl.baseUrl;
      if (filters && Object.keys(filters).length > 0) {
        const queryParams = new URLSearchParams();
        filtersConfig.forEach((filter) => {
          const raw = filters[filter.name];
          if (!raw) return;
          const value = filter.type === 'select' ? (raw?.value ?? raw) : raw;
          if (value) queryParams.append(filter.name, value);
        });
        urlWithParams = `${fetchUrl.baseUrl}?${queryParams.toString()}`;
      }
      const response = await axios.get(urlWithParams);
      setRows(mapData ? mapData(response.data) : response.data);
    } catch (err) {
      console.error('Error en la petición:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleFilterChange = (e) => {
    setFilterValues((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const applyFilters = () => {
    fetchItems(filterValues);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilterValues({});
    fetchItems({});
  };

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
      if (itemToDelete) {
        await axios.delete(`${fetchUrl.baseUrl}${itemToDelete}/`);
      } else if (selectedIds) {
        if (selectedIds.length === 1) {
          await axios.delete(`${fetchUrl.baseUrl}${selectedIds[0]}/`);
        } else {
          try {
            await axios.delete(`${fetchUrl.baseUrl}bulk_delete/`, { data: { ids: selectedIds } });
          } catch {
            await Promise.all(selectedIds.map((id) => axios.delete(`${fetchUrl.baseUrl}${id}/`)));
          }
        }
      }
      fetchItems();
    } catch (err) {
      console.error('Error eliminando:', err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        'Error inesperado al eliminar';
      alert(msg);
    } finally {
      handleCloseConfirmDialog();
    }
  };

  const handleSelectionChange = (selection) => setSelectedIds(selection);

  const handleEdit = (id) => {
    const item = rows.find((r) => r.id === id);
    navigate(`${fetchUrl.editUrl}/${id}`, { state: { item } });
  };

  const handleDetail = fetchUrl.detailUrl
    ? (id) => navigate(`${fetchUrl.detailUrl}/${id}`)
    : undefined;

  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  const hasFilters = filtersConfig?.length > 0;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">

      {/* Breadcrumbs */}
      {resolvedBreadcrumbs && (
        <nav className="flex items-center gap-2 text-sm font-medium text-on-surface-muted">
          {resolvedBreadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-on-surface-muted text-xs">›</span>}
              {crumb.path ? (
                <span
                  className="hover:text-blue-lahuerta cursor-pointer transition-colors"
                  onClick={() => navigate(crumb.path)}
                >
                  {crumb.label}
                </span>
              ) : (
                <span className="text-on-surface font-semibold">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Card: título + acciones */}
      <div className="bg-surface-card p-6 rounded-xl shadow-sm border border-border-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
          <div className="flex items-center gap-3">
            {hasFilters && (
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
                  showFilters
                    ? 'bg-blue-lahuerta text-white border-blue-lahuerta'
                    : 'bg-blue-lahuerta/10 text-blue-lahuerta border-blue-lahuerta/20 hover:bg-blue-lahuerta/15'
                }`}
              >
                <FilterAltOutlinedIcon fontSize="small" />
                Filtros
              </button>
            )}
            {showAdd && (
              <IconLabelButtons
                label={newLabelText || ''}
                icon={<AddCircleOutlineIcon />}
                onClick={onAdd || (() => navigate(fetchUrl.createUrl))}
              />
            )}
          </div>
        </div>
      </div>

      {/* Card: tabla */}
      <div className="bg-surface-card rounded-xl shadow-sm border border-border-subtle overflow-hidden">
        <div className="px-6 py-4 border-b border-border-subtle bg-surface-low/30">
          <h3 className="font-semibold text-on-surface">Listado de {title}</h3>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-lahuerta rounded-full animate-spin" />
          </div>
        )}

        {!loading && (
          <div className="overflow-x-auto">
            <DataGridDemo
              rows={rows}
              columns={columns}
              onDelete={(id) => handleOpenConfirmDialog(false, id)}
              onEdit={handleEdit}
              onDetail={handleDetail}
              onSelectionChange={handleSelectionChange}
              multiSelect={multiSelect}
              canDelete={canDelete}
              canEdit={canEdit}
              showEdit={showEdit}
              showDelete={showDelete}
            />
          </div>
        )}

        {selectedIds.length > 0 && (
          <div className="px-6 py-4 border-t border-border-subtle flex justify-end">
            <button
              onClick={() => handleOpenConfirmDialog(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-all"
            >
              <DeleteIcon fontSize="small" />
              Eliminar {selectedIds.length} seleccionado{selectedIds.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>

      {/* ── Panel de filtros fijo (derecha) ── */}
      <>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 z-[1199] transition-opacity duration-300 ${
            showFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          style={{ background: 'rgba(44,52,55,0.18)' }}
          onClick={() => setShowFilters(false)}
        />

        {/* Panel */}
        <aside
          className={`fixed top-16 right-0 h-[calc(100vh-64px)] w-72 z-[1200] flex flex-col bg-surface-card border-l border-border-subtle shadow-xl transition-transform duration-300 ease-in-out ${
            showFilters ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between shrink-0">
            <h3 className="font-semibold text-on-surface flex items-center gap-2">
              <FilterAltOutlinedIcon fontSize="small" sx={{ color: '#4a7bc4' }} />
              Filtros
            </h3>
            <button
              onClick={() => setShowFilters(false)}
              className="p-1.5 hover:bg-surface-low rounded-lg text-on-surface-muted hover:text-on-surface transition-colors"
            >
              <CloseIcon fontSize="small" />
            </button>
          </div>

          {/* Campos — scrollable */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {filtersConfig?.map((filter, i) => (
              <div key={i}>
                {filter.type === 'date' ? (
                  <BasicDatePicker
                    label={filter.label}
                    name={filter.name}
                    value={filterValues[filter.name] || null}
                    onChange={(val) => setFilterValues((prev) => ({ ...prev, [filter.name]: val }))}
                  />
                ) : filter.type === 'select' ? (
                  <BasicSelect
                    label={filter.label}
                    name={filter.name}
                    value={filterValues[filter.name] || ''}
                    options={filter.options || []}
                    onChange={(e) => setFilterValues((prev) => ({ ...prev, [filter.name]: e.target.value }))}
                  />
                ) : (
                  <CustomInput
                    label={filter.label}
                    name={filter.name}
                    type={filter.type || 'text'}
                    value={filterValues[filter.name] || ''}
                    onChange={handleFilterChange}
                    placeholder="Buscar..."
                  />
                )}
              </div>
            ))}
          </div>

          {/* Footer — pegado abajo */}
          <div className="px-5 py-5 border-t border-border-subtle space-y-2 shrink-0">
            <button
              onClick={applyFilters}
              className="w-full bg-blue-lahuerta hover:bg-blue-lahuerta/90 text-white py-2.5 rounded-lg font-bold text-sm shadow-sm transition-all active:scale-[0.98]"
            >
              Aplicar Filtros
            </button>
            <button
              onClick={clearFilters}
              className="w-full bg-surface-low hover:bg-border-subtle text-on-surface-muted py-2.5 rounded-lg font-bold text-sm border border-border-subtle transition-all"
            >
              Limpiar Filtros
            </button>
          </div>
        </aside>
      </>

      <AlertDialog
        open={openConfirmDialog}
        title={isMultipleDelete ? 'Confirmar eliminación múltiple' : 'Confirmar eliminación'}
        message={
          isMultipleDelete
            ? '¿Estás seguro que querés eliminar estos elementos?'
            : '¿Estás seguro que querés eliminar este elemento?'
        }
        onConfirm={handleDeleteConfirm}
        onCancel={handleCloseConfirmDialog}
      />
    </div>
  );
};

export default GenericList;
