import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import AlertDialog from '../DialogAlert';
import RoundedCheckbox from '../RoundedCheckbox';
import Toast from '../Toast';
import { useNavigate } from 'react-router-dom';
import { breadcrumbsMap } from '../../constants/breadcrumbs';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

/**
 * SimpleCatalog — CRUD inline reutilizable para catálogos de un solo campo.
 *
 * Props:
 *   url          — endpoint base (string), ej: ConditionIvaTypeUrl
 *   title        — nombre del catálogo, ej: "Condición de IVA"
 *   breadcrumbKey — clave en breadcrumbsMap, ej: '/condition-iva-type'
 *   fieldLabel   — label del campo (default: 'Descripción')
 *   fieldName    — nombre del campo en el modelo (default: 'descripcion')
 *   placeholder  — placeholder del input (default: '')
 *   maxLength    — validación máximo de caracteres (default: 100)
 *   multiSelect  — habilita checkboxes y eliminación múltiple (default: true)
 */
const SimpleCatalog = ({
  url,
  title,
  breadcrumbKey,
  fieldLabel = 'Descripción',
  fieldName = 'descripcion',
  placeholder = '',
  maxLength = 100,
  multiSelect = true,
}) => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [toast, setToast] = useState({ open: false, message: '' });

  const breadcrumbs = breadcrumbsMap[breadcrumbKey] || [];

  const validationSchema = Yup.object().shape({
    [fieldName]: Yup.string().max(maxLength, `Máximo ${maxLength} caracteres`).required('Requerido'),
  });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await axios.get(url);
      const list = Array.isArray(response.data) ? response.data : [];
      setRows(list.map(item => ({ id: item.id, [fieldName]: item[fieldName] })));
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSubmit = async (values, { resetForm }) => {
    try {
      if (editingId) {
        await axios.put(`${url}${editingId}/`, values);
        setEditingId(null);
      } else {
        await axios.post(url, values);
      }
      resetForm();
      fetchItems();
    } catch (err) {
      console.error('Error guardando:', err);
      const msg = err?.response?.data?.error || err?.response?.data?.detail || 'Registro duplicado. Por favor, verificá la información.';
      setToast({ open: true, message: msg });
    }
  };

  const handleEdit = (id) => setEditingId(id);

  const handleCancel = (resetForm) => {
    setEditingId(null);
    resetForm();
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.length === rows.length ? [] : rows.map(r => r.id));
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleDeleteConfirm = async () => {
    try {
      if (itemToDelete) {
        await axios.delete(`${url}${itemToDelete}/`);
      } else {
        await Promise.all(selectedIds.map(id => axios.delete(`${url}${id}/`)));
        setSelectedIds([]);
      }
      fetchItems();
    } catch (err) {
      console.error('Error eliminando:', err);
    } finally {
      setOpenConfirmDialog(false);
      setItemToDelete(null);
    }
  };

  const getInitialValues = () => {
    if (editingId) {
      const item = rows.find(r => r.id === editingId);
      return { [fieldName]: item?.[fieldName] || '' };
    }
    return { [fieldName]: '' };
  };

  const colSpan = multiSelect ? 4 : 3;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <Toast
        open={toast.open}
        message={toast.message}
        onClose={() => setToast({ open: false, message: '' })}
      />

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-sm font-medium text-on-surface-muted">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-xs">›</span>}
              {crumb.path ? (
                <span className="hover:text-blue-lahuerta cursor-pointer transition-colors" onClick={() => navigate(crumb.path)}>
                  {crumb.label}
                </span>
              ) : (
                <span className="text-on-surface font-semibold">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Card: formulario */}
      <div className="bg-surface-card p-6 rounded-xl shadow-sm border border-border-subtle">
        <h2 className="text-lg font-semibold text-on-surface mb-4">
          {editingId ? `Editar ${title}` : `Nueva ${title}`}
        </h2>
        <Formik
          initialValues={getInitialValues()}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ values, handleChange, errors, touched, resetForm }) => (
            <Form>
              <div className="group">
                <label className="block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider mb-1 group-focus-within:text-blue-lahuerta transition-colors">
                  {fieldLabel}
                </label>
                <div className="flex gap-3">
                  <input
                    name={fieldName}
                    type="text"
                    value={values[fieldName]}
                    onChange={handleChange}
                    placeholder={placeholder}
                    className={`flex-1 h-10 bg-surface-low px-4 rounded-lg border focus:outline-none focus:ring-2 transition-all text-sm text-on-surface placeholder:text-gray-400 ${
                      touched[fieldName] && errors[fieldName]
                        ? 'border-red-400 ring-2 ring-red-100 focus:border-red-400 focus:ring-red-100'
                        : 'border-transparent focus:border-blue-lahuerta/40 focus:ring-blue-lahuerta/10'
                    }`}
                  />
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="submit"
                      className="h-10 flex items-center gap-2 bg-blue-lahuerta text-white px-6 rounded-lg font-semibold text-sm hover:bg-blue-lahuerta/90 active:scale-95 transition-all shadow-sm"
                    >
                      <AddIcon fontSize="small" />
                      {editingId ? 'Actualizar' : 'Agregar'}
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        onClick={() => handleCancel(resetForm)}
                        className="h-10 px-5 rounded-lg border border-border-subtle text-on-surface-muted text-sm font-medium hover:bg-surface-low transition-all"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
                {touched[fieldName] && errors[fieldName] && (
                  <p className="mt-1 text-xs text-red-500">{errors[fieldName]}</p>
                )}
              </div>
            </Form>
          )}
        </Formik>
      </div>

      {/* Card: tabla */}
      <div className="bg-surface-card rounded-xl shadow-sm border border-border-subtle overflow-hidden">
        <div className="px-6 py-4 border-b border-border-subtle bg-surface-low/30">
          <h3 className="font-semibold text-on-surface">Listado de {title}</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-lahuerta rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-low/50">
                  {multiSelect && (
                    <th className="px-4 py-4 w-10">
                      <RoundedCheckbox
                        checked={rows.length > 0 && selectedIds.length === rows.length}
                        indeterminate={selectedIds.length > 0 && selectedIds.length < rows.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  <th className="px-6 py-4 text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider">
                    {fieldLabel}
                  </th>
                  <th className="px-6 py-4 text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider text-center w-24">
                    Editar
                  </th>
                  <th className="px-6 py-4 text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider text-center w-24">
                    Eliminar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {rows.map(row => (
                  <tr
                    key={row.id}
                    className={`hover:bg-surface-low transition-colors duration-150 ${multiSelect && selectedIds.includes(row.id) ? 'bg-blue-lahuerta/5' : ''}`}
                  >
                    {multiSelect && (
                      <td className="px-4 py-4 w-10">
                        <RoundedCheckbox
                          checked={selectedIds.includes(row.id)}
                          onChange={() => toggleSelectOne(row.id)}
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 text-sm text-on-surface">{row[fieldName]}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleEdit(row.id)}
                        className="p-2 text-on-surface-muted hover:text-blue-lahuerta hover:bg-blue-lahuerta/10 rounded-lg transition-all"
                        title="Editar"
                      >
                        <EditIcon fontSize="small" />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => { setItemToDelete(row.id); setOpenConfirmDialog(true); }}
                        className="p-2 text-on-surface-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Eliminar"
                      >
                        <DeleteIcon fontSize="small" />
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={colSpan} className="px-6 py-10 text-center text-sm text-on-surface-muted">
                      No hay {title.toLowerCase()} cargados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pie de tabla */}
        <div className="px-6 py-4 border-t border-border-subtle bg-surface-low/10 flex justify-between items-center">
          <p className="text-[0.6875rem] font-medium text-on-surface-muted">
            {rows.length === 1 ? '1 resultado' : `${rows.length} resultados`}
          </p>
          {multiSelect && selectedIds.length > 0 && (
            <button
              onClick={() => { setItemToDelete(null); setOpenConfirmDialog(true); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-all"
            >
              <DeleteIcon fontSize="small" />
              Eliminar {selectedIds.length} seleccionado{selectedIds.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      <AlertDialog
        open={openConfirmDialog}
        title="Confirmar eliminación"
        message={
          itemToDelete
            ? '¿Estás seguro que querés eliminar este elemento?'
            : `¿Estás seguro que querés eliminar los ${selectedIds.length} elementos seleccionados?`
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setOpenConfirmDialog(false); setItemToDelete(null); }}
      />
    </div>
  );
};

export default SimpleCatalog;
