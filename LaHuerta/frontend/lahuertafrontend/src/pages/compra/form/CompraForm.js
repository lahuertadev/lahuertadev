import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import { buyUrl, supplierUrl, productUrl, saleTypeUrl, containerTypeUrl } from '../../../constants/urls';
import { formatCurrency } from '../../../utils/currency';
import AmountInput from '../../../components/AmountInput';
import Toast from '../../../components/Toast';
import IconLabelButtons from '../../../components/Button';
import BasicSelect from '../../../components/Select';
import AlertDialog from '../../../components/DialogAlert';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const autocompleteSx = (hasError) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#f0f4f7',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    padding: '0 !important',
    '& fieldset': {
      borderColor: hasError ? '#f87171' : '#e3e9ed',
    },
    '&:hover fieldset': {
      borderColor: hasError ? '#f87171' : '#4a7bc4',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#4a7bc4',
      borderWidth: '1px',
    },
  },
  '& .MuiInputBase-input': {
    padding: '0.625rem 0.75rem !important',
    fontSize: '0.875rem',
    color: '#2c3437',
  },
});

const EMPTY_ITEM = {
  producto: null,
  cantidad_producto: '',
  tipo_venta: null,
  precio: '',
};

const EMPTY_VACIO = {
  tipo_contenedor: null,
  cantidad: '',
  precio_unitario: '',
};

const CompraForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [saleTypes, setSaleTypes] = useState([]);
  const [containerTypes, setContainerTypes] = useState([]);

  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);

  const [tieneSenia, setTieneSenia] = useState(false);
  const [senia, setSenia] = useState('');

  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [vacios, setVacios] = useState([]);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ open: false, message: '' });
  const [vaciosWarning, setVaciosWarning] = useState([]);
  const [showVaciosDialog, setShowVaciosDialog] = useState(false);

  // ── Cargar opciones ────────────────────────────────────────────────
  useEffect(() => {
    const loadOptions = async () => {
      const [suppliersResponse, productsResponse, saleTypesResponse, containerTypesResponse] = await Promise.all([
        axios.get(supplierUrl),
        axios.get(productUrl),
        axios.get(saleTypeUrl),
        axios.get(containerTypeUrl),
      ]);

      setSuppliers(
        suppliersResponse.data.map((supplier) => ({
          label: supplier.nombre,
          ...supplier,
        }))
      );

      setProducts(
        productsResponse.data.map((product) => ({
          label: product.descripcion,
          ...product,
        }))
      );

      setSaleTypes(saleTypesResponse.data);
      setContainerTypes(containerTypesResponse.data);
    };

    loadOptions().catch(console.error);
  }, []);

  // ── Cargar datos para edición ──────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;

    axios
      .get(`${buyUrl}${id}/`)
      .then((response) => {
        const buy = response.data;

        setFecha(buy.fecha);

        if (parseFloat(buy.senia) > 0) {
          setTieneSenia(true);
          setSenia(buy.senia);
        }

        setSelectedSupplier({
          label: buy.proveedor.nombre,
          ...buy.proveedor,
        });

        setItems(
          buy.items.map((item) => ({
            producto: { label: item.producto.descripcion, ...item.producto },
            cantidad_producto: item.cantidad_producto,
            tipo_venta: item.tipo_venta?.id ?? null,
            precio: item.precio_bulto,
          }))
        );

        if (buy.vacios?.length > 0) {
          setVacios(
            buy.vacios.map((v) => ({
              tipo_contenedor: v.tipo_contenedor.id,
              cantidad: v.cantidad,
              precio_unitario: v.precio_unitario,
            }))
          );
        }
      })
      .catch(console.error);
  }, [id, isEdit]);

  // ── Helpers de items ───────────────────────────────────────────────
  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);

  const removeItem = (index) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const updateItem = useCallback((index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const handleProductSelect = (index, product) => {
    if (!product) {
      setItems((prev) => {
        const next = [...prev];
        next[index] = { ...EMPTY_ITEM };
        return next;
      });
      return;
    }

    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], producto: product };
      return next;
    });
  };

  const getAvailableProducts = (currentIndex) => {
    const selectedIds = items
      .filter((_, i) => i !== currentIndex)
      .map((item) => item.producto?.id)
      .filter(Boolean);

    return products.filter((p) => !selectedIds.includes(p.id));
  };

  const hasDuplicatedProducts = () => {
    const ids = items.map((item) => item.producto?.id).filter(Boolean);
    return new Set(ids).size !== ids.length;
  };

  // ── Helpers de vacíos ──────────────────────────────────────────────
  const addVacio = () => setVacios((prev) => [...prev, { ...EMPTY_VACIO }]);

  const removeVacio = (index) => setVacios((prev) => prev.filter((_, i) => i !== index));

  const updateVacio = (index, field, value) => {
    setVacios((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const getAvailableContainerTypes = (currentIndex) => {
    const usedIds = vacios
      .filter((_, i) => i !== currentIndex)
      .map((v) => v.tipo_contenedor)
      .filter(Boolean);
    return containerTypes.filter((ct) => !usedIds.includes(ct.id));
  };

  // ── Cálculos ───────────────────────────────────────────────────────
  const calculateItemSubtotal = (item) => {
    const qty = parseFloat(item.cantidad_producto) || 0;
    const price = parseFloat(item.precio) || 0;
    return qty * price;
  };

  const subtotal = items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
  const seniaValue = tieneSenia ? (parseFloat(senia) || 0) : 0;
  const total = subtotal - seniaValue;

  // ── Limpiar advertencia al modificar items o vacíos ───────────────
  useEffect(() => { setVaciosWarning([]); setShowVaciosDialog(false); }, [items, vacios]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-agregar fila ──────────────────────────────────────────────
  useEffect(() => {
    const last = items[items.length - 1];
    if (
      last.producto &&
      parseFloat(last.cantidad_producto) > 0 &&
      parseFloat(last.precio) > 0
    ) {
      setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
    }
  }, [items]);

  // ── Advertencia de vacíos ──────────────────────────────────────────
  const checkVaciosWarning = () => {
    const bulto = saleTypes.find((st) => st.descripcion.toLowerCase() === 'bulto');
    if (!bulto) return [];

    const required = {};
    items.forEach((item) => {
      if (item.tipo_venta !== bulto.id || !item.producto?.tipo_contenedor) return;
      const qty = parseFloat(item.cantidad_producto) || 0;
      if (qty <= 0) return;
      const { id, descripcion } = item.producto.tipo_contenedor;
      if (!required[id]) required[id] = { descripcion, qty: 0 };
      required[id].qty += qty;
    });

    return Object.entries(required).flatMap(([ctId, { descripcion, qty }]) => {
      const containerType = containerTypes.find((ct) => ct.id === Number(ctId));
      if (!containerType?.requiere_vacio) return [];
      const vacio = vacios.find((v) => v.tipo_contenedor === Number(ctId));
      const vacioQty = vacio ? (parseFloat(vacio.cantidad) || 0) : 0;
      if (vacioQty >= qty) return [];
      if (vacioQty === 0)
        return [`No se cargaron vacíos para "${descripcion}" (${qty} bulto${qty !== 1 ? 's' : ''} comprado${qty !== 1 ? 's' : ''}).`];
      return [`Los vacíos de "${descripcion}" cargados son ${vacioQty}, pero se compran ${qty} bulto${qty !== 1 ? 's' : ''}.`];
    });
  };

  // ── Validación ─────────────────────────────────────────────────────
  const validate = () => {
    const nextErrors = {};

    if (!selectedSupplier) nextErrors.supplier = 'Debe seleccionar un proveedor';
    if (!fecha) nextErrors.fecha = 'Debe ingresar una fecha';

    const filledItems = items.filter((item) => item.producto !== null);

    if (filledItems.length === 0) {
      nextErrors.items_empty = 'Debe agregar al menos un producto';
      return nextErrors;
    }

    items.forEach((item, index) => {
      if (!item.producto) return;

      if (!item.cantidad_producto || parseFloat(item.cantidad_producto) <= 0) {
        nextErrors[`item_${index}_cantidad`] = 'Requerido';
      }

      if (!item.precio || parseFloat(item.precio) <= 0) {
        nextErrors[`item_${index}_precio`] = 'Requerido';
      }
    });

    if (hasDuplicatedProducts()) {
      nextErrors.items_duplicated = 'No se puede agregar el mismo producto más de una vez';
    }

    return nextErrors;
  };

  // ── Guardar ────────────────────────────────────────────────────────
  const handleSave = async () => {
    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setVaciosWarning([]);
      return;
    }

    setErrors({});

    const warnings = checkVaciosWarning();
    if (warnings.length > 0) {
      setVaciosWarning(warnings);
      setShowVaciosDialog(true);
      return;
    }

    await executeSave();
  };

  const executeSave = async () => {
    setShowVaciosDialog(false);
    setVaciosWarning([]);
    setSaving(true);

    const filledItems = items.filter((item) => item.producto !== null);

    try {
      const filledVacios = vacios.filter((v) => v.tipo_contenedor && parseFloat(v.cantidad) > 0);

      const payload = {
        proveedor: selectedSupplier.id,
        fecha,
        senia: seniaValue,
        vacios: filledVacios.map((v) => ({
          tipo_contenedor: v.tipo_contenedor,
          cantidad: parseFloat(v.cantidad),
          precio_unitario: parseFloat(v.precio_unitario) || 0,
        })),
        items: filledItems.map((item) => {
          const qty = parseFloat(item.cantidad_producto) || 1;
          const precioBulto = parseFloat(item.precio) || 0;
          const precioUnitario = qty > 0 ? precioBulto / qty : 0;

          return {
            producto: item.producto.id,
            tipo_venta: item.tipo_venta ?? null,
            cantidad_producto: qty,
            precio_bulto: precioBulto,
            precio_unitario: parseFloat(precioUnitario.toFixed(2)),
          };
        }),
      };

      if (isEdit) {
        await axios.put(`${buyUrl}${id}/`, payload);
      } else {
        await axios.post(buyUrl, payload);
      }

      navigate('/buy');
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        error?.response?.data ||
        'Error al guardar la compra.';

      setToast({ open: true, message: typeof message === 'string' ? message : JSON.stringify(message) });
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto py-6 px-4 bg-white rounded shadow-md w-full max-w-5xl">
      <Toast
        open={toast.open}
        message={toast.message}
        onClose={() => setToast({ open: false, message: '' })}
      />

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-4">
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/buy')}
          color="primary"
          variant="outlined"
        >
          Volver
        </Button>
        <h1 className="text-2xl font-bold text-gray-800">
          {isEdit ? `Editar Compra #${String(id).padStart(8, '0')}` : 'Nueva Compra'}
        </h1>
        <div className="w-20" />
      </div>

      <hr className="border-gray-200 mb-6" />

      {/* Sección: Datos de la compra */}
      <div className="space-y-4 mb-6">
        <h3 className="text-xl font-semibold border-b-2 border-black pb-2">Datos de la compra</h3>

      {/* Fila 1: Proveedor + Fecha */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Proveedor *</label>
          <Autocomplete
            options={suppliers}
            value={selectedSupplier}
            onChange={(_, value) => setSelectedSupplier(value)}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Buscar proveedor..."
                error={Boolean(errors.supplier)}
                helperText={errors.supplier}
                sx={autocompleteSx(Boolean(errors.supplier))}
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha *</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 ${
              errors.fecha ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.fecha && <p className="text-red-500 text-xs mt-1">{errors.fecha}</p>}
        </div>
      </div>

      {/* Fila 2: Datos del proveedor (solo cuando está seleccionado) */}
      {selectedSupplier && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Mercado</label>
            <input
              readOnly
              value={selectedSupplier.mercado?.descripcion || ''}
              className="w-full border border-gray-200 bg-gray-50 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Puesto</label>
            <input
              readOnly
              value={selectedSupplier.puesto || ''}
              className="w-full border border-gray-200 bg-gray-50 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Contacto</label>
            <input
              readOnly
              value={selectedSupplier.telefono || ''}
              className="w-full border border-gray-200 bg-gray-50 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {/* Fila 3: Switch seña */}
      <div className="mb-6">
        <FormControlLabel
          control={
            <Switch
              checked={tieneSenia}
              onChange={(e) => {
                setTieneSenia(e.target.checked);
                if (!e.target.checked) setSenia('');
              }}
              color="primary"
            />
          }
          label={<span className="text-sm font-semibold text-gray-700">¿Se dejó seña?</span>}
        />

        {tieneSenia && (
          <div className="mt-2 max-w-xs">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Importe señado</label>
            <AmountInput
              name="senia"
              value={senia}
              onChange={(raw) => setSenia(raw)}
            />
          </div>
        )}
      </div>

      </div>{/* fin sección Datos de la compra */}

      {/* Sección: Productos */}
      <div className="space-y-4 mb-6">
        <h3 className="text-xl font-semibold border-b-2 border-black pb-2">Productos</h3>

      {/* Tabla de productos */}
      <div className="mb-4">
        <div className="flex items-center justify-end mb-2">
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1 bg-transparent border-none text-blue-lahuerta text-sm font-medium cursor-pointer hover:underline hover:underline-offset-2 focus:outline-none"
            style={{ background: 'transparent', boxShadow: 'none' }}
          >
            <AddCircleOutlineIcon fontSize="small" /> Agregar línea
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="border border-gray-200 px-2 py-2 text-center w-12">#</th>
                <th className="border border-gray-200 px-2 py-2 text-center">Producto</th>
                <th className="border border-gray-200 px-2 py-2 text-center w-28">Cantidad</th>
                <th className="border border-gray-200 px-2 py-2 text-center w-32">Tipo venta</th>
                <th className="border border-gray-200 px-2 py-2 text-center w-32">Precio</th>
                <th className="border border-gray-200 px-2 py-2 text-center w-28">Subtotal</th>
                <th className="border border-gray-200 px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-2 py-1 text-center text-gray-400">
                    {index + 1}
                  </td>

                  {/* Producto */}
                  <td className="border border-gray-200 px-2 py-1 align-middle">
                    <Autocomplete
                      options={getAvailableProducts(index)}
                      value={item.producto}
                      onChange={(_, value) => handleProductSelect(index, value)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Escribir producto..."
                          sx={{
                            ...autocompleteSx(false),
                            minWidth: 200,
                          }}
                        />
                      )}
                    />
                  </td>

                  {/* Cantidad */}
                  <td className="border border-gray-200 px-2 py-1">
                    <TextField
                      type="number"
                      size="small"
                      fullWidth
                      inputProps={{ min: 0, step: 0.01 }}
                      value={item.cantidad_producto}
                      onChange={(e) => updateItem(index, 'cantidad_producto', e.target.value)}
                      error={Boolean(errors[`item_${index}_cantidad`])}
                      sx={{ '& input': { textAlign: 'right' } }}
                    />
                  </td>

                  {/* Tipo venta */}
                  <td className="border border-gray-200 px-2 py-1">
                    <BasicSelect
                      name={`tipo_venta_${index}`}
                      value={
                        item.tipo_venta
                          ? { name: saleTypes.find((st) => st.id === item.tipo_venta)?.descripcion, value: item.tipo_venta }
                          : null
                      }
                      options={saleTypes.map((st) => ({ name: st.descripcion, value: st.id }))}
                      onChange={(e) => updateItem(index, 'tipo_venta', e.target.value?.value ?? null)}
                    />
                  </td>

                  {/* Precio */}
                  <td className="border border-gray-200 px-2 py-1">
                    <TextField
                      type="number"
                      size="small"
                      fullWidth
                      inputProps={{ min: 0, step: 0.01 }}
                      value={item.precio}
                      onChange={(e) => updateItem(index, 'precio', e.target.value)}
                      error={Boolean(errors[`item_${index}_precio`])}
                      sx={{ '& input': { textAlign: 'right' } }}
                    />
                  </td>

                  {/* Subtotal */}
                  <td className="border border-gray-200 px-2 py-1 text-right font-medium text-gray-700">
                    {item.producto && parseFloat(item.precio) > 0
                      ? formatCurrency(calculateItemSubtotal(item))
                      : '—'}
                  </td>

                  {/* Eliminar */}
                  <td className="border border-gray-200 px-1 py-1 text-center">
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

        {(errors.items_empty || errors.items_duplicated) && (
          <div className="mt-2">
            {errors.items_empty && (
              <p className="text-red-500 text-sm">{errors.items_empty}</p>
            )}
            {errors.items_duplicated && (
              <p className="text-red-500 text-sm">{errors.items_duplicated}</p>
            )}
          </div>
        )}

        {/* Totales */}
        <div className="flex justify-end mt-3 pr-10">
          <div className="text-right space-y-1">
            {seniaValue > 0 && (
              <>
                <div>
                  <span className="text-gray-500 text-sm mr-4">SUBTOTAL</span>
                  <span className="text-base font-medium text-gray-700">{formatCurrency(subtotal)}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-sm mr-4">SEÑA</span>
                  <span className="text-base font-medium text-red-500">- {formatCurrency(seniaValue)}</span>
                </div>
              </>
            )}
            <div>
              <span className="text-gray-500 text-sm mr-4">TOTAL</span>
              <span className="text-xl font-bold text-gray-800">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>

      </div>{/* fin sección Productos */}

      {/* Sección: Vacíos */}
      <div className="space-y-4 mb-6">
        <h3 className="text-xl font-semibold border-b-2 border-black pb-2">Vacíos</h3>

        {vacios.length === 0 ? (
          <p className="text-sm text-gray-400">Sin vacíos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="border border-gray-200 px-2 py-2 text-center">Tipo</th>
                  <th className="border border-gray-200 px-2 py-2 text-center w-28">Cantidad</th>
                  <th className="border border-gray-200 px-2 py-2 text-center w-36">Precio seña</th>
                  <th className="border border-gray-200 px-2 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {vacios.map((vacio, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-2 py-1">
                      <BasicSelect
                        name={`vacio_tipo_${index}`}
                        value={
                          vacio.tipo_contenedor
                            ? {
                                name: containerTypes.find((ct) => ct.id === vacio.tipo_contenedor)?.descripcion,
                                value: vacio.tipo_contenedor,
                              }
                            : null
                        }
                        options={getAvailableContainerTypes(index).map((ct) => ({ name: ct.descripcion, value: ct.id }))}
                        onChange={(e) => updateVacio(index, 'tipo_contenedor', e.target.value?.value ?? null)}
                      />
                    </td>
                    <td className="border border-gray-200 px-2 py-1">
                      <TextField
                        type="number"
                        size="small"
                        fullWidth
                        inputProps={{ min: 0, step: 1 }}
                        value={vacio.cantidad}
                        onChange={(e) => updateVacio(index, 'cantidad', e.target.value)}
                        sx={{ ...autocompleteSx(false), '& input': { textAlign: 'right' } }}
                      />
                    </td>
                    <td className="border border-gray-200 px-2 py-1">
                      <AmountInput
                        name={`vacio_precio_${index}`}
                        value={vacio.precio_unitario}
                        onChange={(raw) => updateVacio(index, 'precio_unitario', raw)}
                      />
                    </td>
                    <td className="border border-gray-200 px-1 py-1 text-center">
                      <IconButton size="small" onClick={() => removeVacio(index)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          type="button"
          onClick={addVacio}
          className="flex items-center gap-1 bg-transparent border-none text-blue-lahuerta text-sm font-medium cursor-pointer hover:underline hover:underline-offset-2 focus:outline-none"
          style={{ background: 'transparent', boxShadow: 'none' }}
        >
          <AddCircleOutlineIcon fontSize="small" /> Agregar vacío
        </button>
      </div>{/* fin sección Vacíos */}

      <AlertDialog
        open={showVaciosDialog}
        title="Vacíos sin cargar o con cantidad insuficiente"
        message={
          <ul className="list-disc list-inside space-y-1">
            {vaciosWarning.map((msg, i) => <li key={i}>{msg}</li>)}
            <li className="mt-2 list-none text-xs">¿Querés guardar la compra de todas formas?</li>
          </ul>
        }
        icon={<WarningAmberIcon sx={{ fontSize: 20, color: '#d97706' }} />}
        confirmClassName="bg-amber-500 hover:bg-amber-600"
        confirmLabel="Guardar igual"
        cancelLabel="Volver a revisar"
        onConfirm={executeSave}
        onCancel={() => setShowVaciosDialog(false)}
      />

      {/* Acciones */}
      <div className="flex justify-center gap-4 mt-6 pt-4 border-t border-gray-200">
        <Button
          variant="outlined"
          onClick={() => navigate('/buy')}
          sx={{ textTransform: 'none', fontWeight: 700, px: 4, py: 1.25 }}
        >
          Cancelar
        </Button>

        <IconLabelButtons
          label={saving ? 'Guardando…' : 'Confirmar'}
          variant="contained"
          size="large"
          disabled={saving}
          onClick={handleSave}
        />
      </div>
    </div>
  );
};

export default CompraForm;
