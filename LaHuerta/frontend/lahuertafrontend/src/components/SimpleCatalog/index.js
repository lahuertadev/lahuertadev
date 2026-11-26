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
import { useToast } from '../../context/ToastContext';
import { breadcrumbsMap } from '../../constants/breadcrumbs';
import { extractErrorMessage } from '../../utils/errors';
import { normalizeText } from '../../utils/text';

const SYSTEM_RECORD_REASON = 'Registro del sistema: no se puede editar ni eliminar.';

const fieldCls = (hasError) =>
  `w-full h-10 rounded-lg border bg-surface-card px-3 text-sm text-on-surface placeholder:text-on-surface-muted/70 focus:outline-none focus:ring-2 ${
    hasError ? 'border-red-400 ring-1 ring-red-400' : 'border-border-subtle focus:border-blue-lahuerta/40 focus:ring-blue-lahuerta/10'
  }`;

const tileCls = 'flex min-h-[7.5rem] flex-col gap-3 rounded-xl border p-4';

// Inicial del registro, en un cuadrado con el color de acento (como las tarjetas del Inicio).
const Initial = ({ text }) => (
  <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-sm font-bold text-accent">
    {(text || '+').trim().charAt(0).toUpperCase()}
  </span>
);

// Tarjeta en edición: el campo, el error y Cancelar / Guardar. Enter guarda y Escape cancela.
const EditTile = ({ initialValue, label, placeholder, maxLength, onSave, onCancel, saving }) => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return setError('Escribí la descripción.');
    if (trimmed.length > maxLength) return setError(`Máximo ${maxLength} caracteres.`);
    const backendError = await onSave(trimmed);
    if (backendError) setError(backendError);
  };

  return (
    <form onSubmit={submit} className={`${tileCls} border-accent/60 bg-surface-card`} aria-label={label}>
      <div className="flex items-center gap-3">
        <Initial text={value} />
        <span className="text-sm font-semibold text-on-surface">{label}</span>
      </div>
      <div>
        <input
          autoFocus
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
          placeholder={placeholder}
          aria-label="Descripción"
          aria-invalid={Boolean(error)}
          className={fieldCls(Boolean(error))}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
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
 * SimpleCatalog — pantalla de un catálogo de un solo campo (Mercados, Bancos, Categorías, Condición de IVA):
 * cada registro es una tarjeta, como las del Inicio, con renombrar y eliminar; la tarjeta "+ Nuevo" agrega.
 * Se edita en la misma tarjeta. Un registro del sistema (is_system) muestra el candado y no se toca.
 *
 * Props:
 *   url           — endpoint base, ej: marketUrl
 *   title         — nombre del catálogo en plural, ej: "Mercados"
 *   itemLabel     — un registro, en singular y minúscula, ej: "mercado" (para "Editar mercado")
 *   newLabel      — texto de la tarjeta de alta, ej: "Nuevo mercado" / "Nueva categoría"
 *   subtitle      — opcional: para qué sirve el catálogo
 *   breadcrumbKey — clave en breadcrumbsMap, ej: '/market'
 *   fieldName     — campo del modelo (default 'descripcion')
 *   placeholder   — placeholder del campo
 *   maxLength     — máximo de caracteres (default 100)
 */
const SimpleCatalog = ({
  url,
  title,
  itemLabel,
  newLabel,
  subtitle,
  breadcrumbKey,
  fieldName = 'descripcion',
  placeholder = '',
  maxLength = 100,
}) => {
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

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await axios.get(url);
      const list = Array.isArray(response.data) ? response.data : [];
      setRows(list.map((item) => ({ id: item.id, name: item[fieldName], isSystem: item.is_system })));
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
      .filter((row) => !term || normalizeText(row.name).includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [rows, query]);

  // Devuelve el error del backend para mostrarlo en la tarjeta, o null si se guardó.
  const save = async (name, id = null) => {
    setSaving(true);
    try {
      if (id) {
        await axios.put(`${url}${id}/`, { [fieldName]: name });
        showToast(`"${name}" se actualizó correctamente.`);
        setEditingId(null);
      } else {
        await axios.post(url, { [fieldName]: name });
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
          <div className="grid grid-cols-1 gap-3 px-5 pb-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {visibleRows.map((row) => (editingId === row.id ? (
              <EditTile
                key={row.id}
                initialValue={row.name}
                label={`Editar ${itemLabel}`}
                placeholder={placeholder}
                maxLength={maxLength}
                saving={saving}
                onSave={(name) => save(name, row.id)}
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
                <div className="mt-auto flex justify-end gap-1">
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
                initialValue=""
                label={newLabel}
                placeholder={placeholder}
                maxLength={maxLength}
                saving={saving}
                onSave={(name) => save(name)}
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

export default SimpleCatalog;
