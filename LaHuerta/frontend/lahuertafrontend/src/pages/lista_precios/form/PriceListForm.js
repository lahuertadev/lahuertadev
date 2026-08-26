import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useMediaQuery from '@mui/material/useMediaQuery';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import { priceListUrl, priceListProductUrl, productUrl, saleTypeUrl } from '../../../constants/urls';
import CustomInput from '../../../components/Input';
import BasicSelect from '../../../components/Select';
import AmountInput from '../../../components/AmountInput';
import Toast from '../../../components/Toast';

const EMPTY_ITEM = {
  producto: null,
  tipoVenta: null,
  precio: '',
};

// Label chico en mayúsculas, mismo patrón que ya usan CustomInput/BasicSelect en el resto del sitio.
const mobileLabelCls = 'block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider mb-1';

const SectionCard = ({ icon, title, children }) => (
  <section className="space-y-3">
    <div className="flex items-center gap-2 px-1">
      <span className="text-blue-lahuerta">{icon}</span>
      <h2 className="text-base font-semibold text-on-surface">{title}</h2>
    </div>
    <div className="bg-surface-card p-6 rounded-xl shadow-sm border border-border-subtle">
      {children}
    </div>
  </section>
);

const PriceListForm = () => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  const [products, setProducts] = useState([]);
  const [saleTypes, setSaleTypes] = useState([]);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ open: false, message: '' });

  useEffect(() => {
    const loadOptions = async () => {
      const [productsResponse, saleTypesResponse] = await Promise.all([
        axios.get(productUrl),
        axios.get(saleTypeUrl),
      ]);
      setProducts(productsResponse.data);
      setSaleTypes(saleTypesResponse.data);
    };
    loadOptions().catch(console.error);
  }, []);

  // ── Helpers de filas ───────────────────────────────────────────────
  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);

  const removeItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index));

  const updateItem = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Un mismo producto puede repetirse en varias filas (uno por cada tipo de venta),
  // así que acá no se excluye nada — la duplicación real (mismo producto + mismo
  // tipo de venta dos veces) se valida aparte, en validate().
  const hasDuplicatedItems = () => {
    const seen = new Set();
    return items.some((item) => {
      if (!item.producto || !item.tipoVenta) return false;
      const key = `${item.producto.id}-${item.tipoVenta.id}`;
      if (seen.has(key)) return true;
      seen.add(key);
      return false;
    });
  };

  // ── Auto-agregar fila ──────────────────────────────────────────────
  useEffect(() => {
    const last = items[items.length - 1];
    if (last.producto && last.tipoVenta && parseFloat(last.precio) > 0) {
      setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
    }
  }, [items]);

  // ── Validación ─────────────────────────────────────────────────────
  const validate = () => {
    const nextErrors = {};

    if (!nombre.trim()) nextErrors.nombre = 'El nombre es obligatorio';
    else if (nombre.length > 100) nextErrors.nombre = 'El nombre no puede exceder los 100 caracteres';

    if (descripcion.length > 500) nextErrors.descripcion = 'La descripción no puede exceder los 500 caracteres';

    items.forEach((item, index) => {
      if (!item.producto) return;
      if (!item.tipoVenta) nextErrors[`item_${index}_tipoVenta`] = 'Requerido';
      if (!item.precio || parseFloat(item.precio) <= 0) nextErrors[`item_${index}_precio`] = 'Requerido';
    });

    if (hasDuplicatedItems()) {
      nextErrors.items_duplicated = 'No se puede repetir el mismo producto con el mismo tipo de venta';
    }

    return nextErrors;
  };

  const isFormComplete = Object.keys(validate()).length === 0;

  // ── Productos ya usados en otra fila con el mismo tipo de venta (para no ofrecerlos de nuevo) ──
  const getAvailableProducts = () => products;

  // ── Guardar ────────────────────────────────────────────────────────
  const handleSave = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setSaving(true);

    try {
      const listResponse = await axios.post(priceListUrl, {
        nombre,
        descripcion: descripcion || '',
      });
      const newListId = listResponse.data.id;

      const filledItems = items.filter((item) => item.producto && item.tipoVenta && item.precio);
      await Promise.all(
        filledItems.map((item) =>
          axios.post(priceListProductUrl, {
            lista_precios: newListId,
            producto: item.producto.id,
            tipo_venta: item.tipoVenta.id,
            precio: parseFloat(item.precio),
          })
        )
      );

      navigate(`/price-list/detail/${newListId}`);
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        'Error al guardar la lista de precios.';
      setToast({ open: true, message: typeof message === 'string' ? message : JSON.stringify(message) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-12">
      <Toast
        open={toast.open}
        message={toast.message}
        onClose={() => setToast({ open: false, message: '' })}
      />

      {/* Breadcrumbs */}
      <nav className="flex items-center flex-wrap gap-2 text-sm font-medium text-on-surface-muted">
        <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate('/')}>Inicio</span>
        <span className="text-xs">›</span>
        <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate('/price-list')}>Lista de Precios</span>
        <span className="text-xs">›</span>
        <span className="text-on-surface font-semibold">Nueva Lista de Precios</span>
      </nav>

      {/* 1. Información General */}
      <SectionCard icon={<ListAltOutlinedIcon sx={{ fontSize: 20 }} />} title="Información General">
        <div className="space-y-4">
          <CustomInput
            label="Nombre de la Lista"
            name="nombre"
            required
            value={nombre}
            placeholder="Ej: Lista de Precios Mayo 2026"
            onChange={(e) => setNombre(e.target.value)}
            helperText={errors.nombre}
          />
          <CustomInput
            label="Descripción"
            name="descripcion"
            multiline
            rows={3}
            value={descripcion}
            placeholder="Descripción opcional de la lista de precios"
            onChange={(e) => setDescripcion(e.target.value)}
            helperText={errors.descripcion}
          />
        </div>
      </SectionCard>

      {/* 2. Productos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-blue-lahuerta"><ListAltOutlinedIcon sx={{ fontSize: 20 }} /></span>
            <h2 className="text-base font-semibold text-on-surface">Productos</h2>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1 bg-transparent border-none text-blue-lahuerta text-sm font-medium cursor-pointer hover:underline hover:underline-offset-2 focus:outline-none"
            style={{ background: 'transparent', boxShadow: 'none' }}
          >
            <AddCircleOutlineIcon fontSize="small" /> Agregar línea
          </button>
        </div>

        <div className="bg-surface-card p-6 rounded-xl shadow-sm border border-border-subtle">
          {isMobile ? (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="border border-border-subtle rounded-lg p-3 bg-surface-card space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={mobileLabelCls}>Producto {index + 1}</span>
                    {items.length > 1 && (
                      <IconButton size="small" onClick={() => removeItem(index)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </div>

                  <BasicSelect
                    label="Producto"
                    name={`producto_${index}`}
                    value={item.producto ? { name: item.producto.descripcion, value: item.producto.id } : null}
                    options={getAvailableProducts().map((p) => ({ name: p.descripcion, value: p.id }))}
                    onChange={(e) => {
                      const productId = e.target.value?.value;
                      updateItem(index, 'producto', products.find((p) => p.id === productId) || null);
                    }}
                  />

                  <BasicSelect
                    label="Tipo de venta"
                    name={`tipo_venta_${index}`}
                    value={item.tipoVenta ? { name: item.tipoVenta.descripcion, value: item.tipoVenta.id } : null}
                    options={saleTypes.map((st) => ({ name: st.descripcion, value: st.id }))}
                    onChange={(e) => {
                      const tvId = e.target.value?.value;
                      updateItem(index, 'tipoVenta', saleTypes.find((st) => st.id === tvId) || null);
                    }}
                    error={errors[`item_${index}_tipoVenta`]}
                  />

                  <div>
                    <label className={mobileLabelCls}>Precio</label>
                    <AmountInput
                      name={`precio_${index}`}
                      value={item.precio}
                      onChange={(raw) => updateItem(index, 'precio', raw)}
                      hasError={Boolean(errors[`item_${index}_precio`])}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-surface-low text-on-surface">
                    <th className="border border-border-subtle px-2 py-2 text-center w-12">#</th>
                    <th className="border border-border-subtle px-2 py-2 text-center">Producto</th>
                    <th className="border border-border-subtle px-2 py-2 text-center w-40">Tipo de venta</th>
                    <th className="border border-border-subtle px-2 py-2 text-center w-40">Precio</th>
                    <th className="border border-border-subtle px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="hover:bg-surface-low">
                      <td className="border border-border-subtle px-2 py-1 text-center text-on-surface-muted">
                        {index + 1}
                      </td>
                      <td className="border border-border-subtle px-2 py-1 align-middle" style={{ minWidth: 200 }}>
                        <BasicSelect
                          name={`producto_${index}`}
                          value={item.producto ? { name: item.producto.descripcion, value: item.producto.id } : null}
                          options={getAvailableProducts().map((p) => ({ name: p.descripcion, value: p.id }))}
                          onChange={(e) => {
                            const productId = e.target.value?.value;
                            updateItem(index, 'producto', products.find((p) => p.id === productId) || null);
                          }}
                        />
                      </td>
                      <td className="border border-border-subtle px-2 py-1">
                        <BasicSelect
                          name={`tipo_venta_${index}`}
                          value={item.tipoVenta ? { name: item.tipoVenta.descripcion, value: item.tipoVenta.id } : null}
                          options={saleTypes.map((st) => ({ name: st.descripcion, value: st.id }))}
                          onChange={(e) => {
                            const tvId = e.target.value?.value;
                            updateItem(index, 'tipoVenta', saleTypes.find((st) => st.id === tvId) || null);
                          }}
                          placeholder="Opciones"
                        />
                      </td>
                      <td className="border border-border-subtle px-2 py-1">
                        <AmountInput
                          name={`precio_${index}`}
                          value={item.precio}
                          onChange={(raw) => updateItem(index, 'precio', raw)}
                          hasError={Boolean(errors[`item_${index}_precio`])}
                        />
                      </td>
                      <td className="border border-border-subtle px-1 py-1 text-center">
                        {items.length > 1 && (
                          <IconButton size="small" onClick={() => removeItem(index)} color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {errors.items_duplicated && (
            <p className="text-red-500 text-sm mt-2">{errors.items_duplicated}</p>
          )}
        </div>
      </section>

      {/* Action Bar */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-6 border-t border-border-subtle">
        <button
          type="button"
          onClick={() => navigate('/price-list')}
          className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-on-surface-muted border border-border-subtle rounded-lg hover:border-red-400 hover:text-red-500 hover:bg-red-50 hover:font-bold transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isFormComplete}
          className="w-full sm:w-auto px-8 py-2.5 bg-blue-lahuerta text-white font-bold text-sm rounded-lg shadow-sm hover:bg-blue-lahuerta/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando...' : 'Registrar Lista'}
        </button>
      </div>
    </div>
  );
};

export default PriceListForm;
