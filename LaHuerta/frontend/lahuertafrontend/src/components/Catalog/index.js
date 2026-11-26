import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AlertDialog from '../DialogAlert';
import DeleteMessage from '../DeleteMessage';
import LockedIcon from '../LockedIcon';
import Badge from '../Badge';
import { useToast } from '../../context/ToastContext';
import { breadcrumbsMap } from '../../constants/breadcrumbs';
import { extractErrorMessage } from '../../utils/errors';
import { normalizeText } from '../../utils/text';

const SYSTEM_RECORD_REASON = 'Registro del sistema: no se puede editar ni eliminar.';

/**
 * Campo "Descripción", el primero de todo catálogo (es el título de la tarjeta).
 *   descriptionField({ placeholder: 'Ej: Mercado Central', maxLength: 50 })
 */
export const descriptionField = ({ placeholder = '', maxLength = 100 } = {}) => ({
  name: 'descripcion',
  label: 'Descripción',
  placeholder,
  maxLength,
  requiredMessage: 'Escribí la descripción.',
});

const fieldCls = (hasError) =>
  `w-full h-10 rounded-lg border bg-surface-card px-3 text-sm text-on-surface placeholder:text-on-surface-muted/70 focus:outline-none focus:ring-2 ${
    hasError ? 'border-red-400 ring-1 ring-red-400' : 'border-border-subtle focus:border-blue-lahuerta/40 focus:ring-blue-lahuerta/10'
  }`;

const tileCls = 'flex min-h-[7.5rem] flex-col gap-3 rounded-xl border p-4';

const emptyValues = (fields) =>
  Object.fromEntries(fields.map((field) => [field.name, field.type === 'select' ? field.options[0].value : '']));

const optionOf = (field, value) => field.options.find((option) => option.value === value);

// Inicial del registro, en un cuadrado con el color de acento (como las tarjetas del Inicio).
const Initial = ({ text }) => (
  <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-sm font-bold text-accent">
    {(text || '+').trim().charAt(0).toUpperCase()}
  </span>
);

// Datos de la tarjeta debajo del título: los textos en gris y los select como etiqueta de su color.
const TileDetails = ({ fields, values }) => {
  const details = fields.filter((field) => values[field.name]);
  if (details.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 pl-12">
      {details.map((field) => {
        if (field.type === 'select') {
          const option = optionOf(field, values[field.name]);
          return <Badge key={field.name} color={option?.color} label={option?.label || values[field.name]} />;
        }
        return (
          <span key={field.name} className="text-xs text-on-surface-muted">
            {field.label}: <b className="font-semibold text-on-surface">{values[field.name]}</b>
          </span>
        );
      })}
    </div>
  );
};

// Tarjeta en edición: un campo por cada uno del catálogo, sus errores y Cancelar / Guardar.
// Enter guarda y Escape cancela.
const EditTile = ({ fields, initialValues, label, onSave, onCancel, saving }) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  const setValue = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setFormError('');
  };

  const validate = (trimmed) => {
    const found = {};
    fields.forEach((field) => {
      const value = trimmed[field.name];
      if (!value) found[field.name] = field.requiredMessage || `Completá ${field.label.toLowerCase()}.`;
      else if (field.maxLength && value.length > field.maxLength) found[field.name] = `Máximo ${field.maxLength} caracteres.`;
    });
    return found;
  };

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = Object.fromEntries(fields.map((field) => [field.name, String(values[field.name] ?? '').trim()]));
    const found = validate(trimmed);
    if (Object.keys(found).length > 0) return setErrors(found);
    const backendError = await onSave(trimmed);
    if (backendError) setFormError(backendError);
  };

  return (
    <form onSubmit={submit} className={`${tileCls} border-accent/60 bg-surface-card`} aria-label={label}>
      <div className="flex items-center gap-3">
        <Initial text={values[fields[0].name]} />
        <span className="text-sm font-semibold text-on-surface">{label}</span>
      </div>
      {fields.map((field, index) => (
        <div key={field.name}>
          {fields.length > 1 && <label htmlFor={`catalog-${field.name}`} className="mb-1 block text-xs font-medium text-on-surface-muted">{field.label}</label>}
          {field.type === 'select' ? (
            <select
              id={`catalog-${field.name}`}
              value={values[field.name]}
              onChange={(e) => setValue(field.name, e.target.value)}
              aria-label={field.label}
              className={fieldCls(Boolean(errors[field.name]))}
            >
              {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          ) : (
            <input
              id={`catalog-${field.name}`}
              autoFocus={index === 0}
              value={values[field.name]}
              onChange={(e) => setValue(field.name, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
              placeholder={field.placeholder}
              aria-label={field.label}
              aria-invalid={Boolean(errors[field.name])}
              className={fieldCls(Boolean(errors[field.name]))}
            />
          )}
          {errors[field.name] && <p className="mt-1 text-xs text-red-500">{errors[field.name]}</p>}
        </div>
      ))}
      {formError && <p className="text-xs text-red-500">{formError}</p>}
      <div className="mt-auto flex justify-end gap-1">
        <IconButton size="small" onClick={onCancel} aria-label="Cancelar" sx={{ color: 'var(--color-on-surface-muted)' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" type="submit" disabled={saving} aria-label="Guardar" sx={{ color: 'var(--color-accent)' }}>
          <CheckIcon fontSize="small" />
        </IconButton>
      </div>
    </form>
  );
};

/**
 * Catalog — pantalla de todo catálogo (Mercados, Bancos, Categorías, Condición de IVA, Tipos de unidad):
 * cada registro es una tarjeta, como las del Inicio, con editar y eliminar; la tarjeta "+ Nuevo" agrega.
 * Se edita en la misma tarjeta. Un registro del sistema (is_system) muestra el candado y no se toca.
 *
 * Props:
 *   url           — endpoint base, ej: marketUrl
 *   title         — nombre del catálogo en plural, ej: "Mercados"
 *   itemLabel     — un registro, en singular y minúscula, ej: "mercado" (para "Editar mercado")
 *   newLabel      — texto de la tarjeta de alta, ej: "Nuevo mercado" / "Nueva categoría"
 *   subtitle      — opcional: para qué sirve el catálogo
 *   breadcrumbKey — clave en breadcrumbsMap, ej: '/market'
 *   fields        — campos del registro; el primero es el título de la tarjeta (usar descriptionField).
 *                   Cada uno: { name, label, placeholder?, maxLength?, requiredMessage?,
 *                   type?: 'text' | 'select', options?: [{ value, label, color }] }.
 *                   Todos son obligatorios. Un select se ve en la tarjeta como Badge del color de su opción.
 */
const Catalog = ({ url, title, itemLabel, newLabel, subtitle, breadcrumbKey, fields }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [itemToDelete, setItemToDelete] = useState(null);

  const breadcrumbs = breadcrumbsMap[breadcrumbKey] || [];
  const [titleField, ...detailFields] = fields;
  const searchableFields = fields.filter((field) => field.type !== 'select');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await axios.get(url);
      const list = Array.isArray(response.data) ? response.data : [];
      setRows(list.map((item) => ({
        id: item.id,
        name: item[titleField.name],
        values: Object.fromEntries(fields.map((field) => [field.name, item[field.name] ?? ''])),
        isSystem: item.is_system,
      })));
    } catch (err) {
      console.error('Error cargando datos:', err);
      showToast(extractErrorMessage(err, 'No se pudo cargar el listado.'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleRows = useMemo(() => {
    const term = normalizeText(query).trim();
    return rows
      .filter((row) => !term || searchableFields.some((field) => normalizeText(row.values[field.name]).includes(term)))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [rows, query]); // eslint-disable-line react-hooks/exhaustive-deps

  // Devuelve el error del backend para mostrarlo en la tarjeta, o null si se guardó.
  const save = async (values, id = null) => {
    const name = values[titleField.name];
    setSaving(true);
    try {
      if (id) {
        await axios.put(`${url}${id}/`, values);
        showToast(`"${name}" se actualizó correctamente.`);
        setEditingId(null);
      } else {
        await axios.post(url, values);
        showToast(`"${name}" se agregó correctamente.`);
        setAdding(false);
      }
      fetchItems();
      return null;
    } catch (err) {
      console.error('Error guardando:', err);
      return extractErrorMessage(err, 'No se pudo guardar. Revisá que no haya otro registro con esa descripción.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    const item = itemToDelete;
    setItemToDelete(null);
    try {
      await axios.delete(`${url}${item.id}/`);
      showToast(`"${item.name}" se eliminó correctamente.`);
      fetchItems();
    } catch (err) {
      console.error('Error eliminando:', err);
      showToast(extractErrorMessage(err, `No se pudo eliminar "${item.name}".`), { variant: 'error' });
    }
  };

  const startEdit = (id) => { setAdding(false); setEditingId(id); };
  const startAdd = () => { setEditingId(null); setAdding(true); };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-sm font-medium text-on-surface-muted">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={crumb.label}>
              {i > 0 && <span className="text-xs">›</span>}
              {crumb.path ? (
                <span className="hover:text-accent cursor-pointer transition-colors" onClick={() => navigate(crumb.path)}>{crumb.label}</span>
              ) : (
                <span className={i === breadcrumbs.length - 1 ? 'text-on-surface font-semibold' : ''}>{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <section className="bg-surface-card rounded-xl shadow-sm border border-border-subtle">
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-on-surface">
              {title}
              {!loading && (
                <span className="rounded-full border border-border-subtle bg-surface-low px-2 py-0.5 text-xs font-semibold text-on-surface-muted">
                  {rows.length}
                </span>
              )}
            </h2>
            {subtitle && <p className="mt-1 text-sm text-on-surface-muted">{subtitle}</p>}
          </div>
          <div className="relative w-full sm:w-64">
            <SearchIcon sx={{ fontSize: 18 }} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar…"
              aria-label={`Buscar ${title.toLowerCase()}`}
              className={`${fieldCls(false)} pl-9`}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-lahuerta rounded-full animate-spin" />
          </div>
        ) : (
          // items-start: la tarjeta en edición crece sola, sin estirar las de su fila.
          <div className="grid grid-cols-1 items-start gap-3 px-5 pb-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {visibleRows.map((row) => (editingId === row.id ? (
              <EditTile
                key={row.id}
                fields={fields}
                initialValues={row.values}
                label={`Editar ${itemLabel}`}
                saving={saving}
                onSave={(values) => save(values, row.id)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <article key={row.id} className={`${tileCls} border-border-subtle bg-surface-low/60 transition-colors hover:border-accent/40`}>
                <div className="flex min-w-0 items-center gap-3">
                  <Initial text={row.name} />
                  <Tooltip title={row.name} placement="top" arrow disableHoverListener={row.name.length < 24}>
                    <span className="truncate text-sm font-semibold text-on-surface">{row.name}</span>
                  </Tooltip>
                </div>
                <TileDetails fields={detailFields} values={row.values} />
                {/* Alto fijo: con candado o con botones, todas las tarjetas miden lo mismo. */}
                <div className="mt-auto flex h-[34px] items-center justify-end gap-1">
                  {row.isSystem ? (
                    <LockedIcon title={SYSTEM_RECORD_REASON} />
                  ) : (
                    <>
                      <IconButton size="small" onClick={() => startEdit(row.id)} aria-label={`Editar ${row.name}`} sx={{ color: 'var(--color-on-surface-muted)', '&:hover': { color: 'var(--color-accent)' } }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setItemToDelete(row)} aria-label={`Eliminar ${row.name}`} sx={{ color: 'var(--color-on-surface-muted)', '&:hover': { color: '#ef4444' } }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </div>
              </article>
            )))}

            {query && visibleRows.length === 0 && (
              <p className="col-span-full py-6 text-center text-sm text-on-surface-muted">No hay {title.toLowerCase()} que coincidan con "{query}".</p>
            )}

            {adding ? (
              <EditTile
                fields={fields}
                initialValues={emptyValues(fields)}
                label={newLabel}
                saving={saving}
                onSave={(values) => save(values)}
                onCancel={() => setAdding(false)}
              />
            ) : (
              <button
                type="button"
                onClick={startAdd}
                className={`${tileCls} items-center justify-center border-dashed border-accent/50 bg-transparent text-sm font-semibold text-accent transition-colors hover:bg-accent/5`}
              >
                <AddCircleOutlineIcon />
                {newLabel}
              </button>
            )}
          </div>
        )}
      </section>

      <AlertDialog
        open={Boolean(itemToDelete)}
        title={`Eliminar ${itemLabel}`}
        message={itemToDelete && <DeleteMessage summary={<>Se elimina <b>{itemToDelete.name}</b>. No se puede deshacer.</>} />}
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
};

export default Catalog;
