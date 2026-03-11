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
import {
  billUrl,
  billTypeUrl,
  clientUrl,
  productUrl,
  saleTypeUrl,
} from '../../../constants/urls';
import { formatCurrency } from '../../../utils/currency';

const EMPTY_ITEM = {
  producto: null,
  cantidad: '',
  precio_unitario: '',
  precio_bulto: '',
  tipo_venta: null,
};

const FacturaForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  // Opciones para selects
  const [clients, setClients] = useState([]);
  const [billTypes, setBillTypes] = useState([]);
  const [products, setProducts] = useState([]);
  const [saleTypes, setSaleTypes] = useState([]);

  // Cabecera de la factura
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedBillType, setSelectedBillType] = useState(null);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);

  // Ítems
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  // Precios de lista del cliente (producto_id → { precio_unitario, precio_bulto })
  const [clientPrices, setClientPrices] = useState({});

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Carga de opciones ──────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const [c, bt, p, st] = await Promise.all([
        axios.get(clientUrl),
        axios.get(billTypeUrl),
        axios.get(productUrl),
        axios.get(saleTypeUrl),
      ]);
      setClients(c.data.map((cl) => ({ label: `${cl.cuit} - ${cl.razon_social}`, ...cl })));
      const mappedBillTypes = bt.data.map((t) => ({ label: t.descripcion, ...t }));
      setBillTypes(mappedBillTypes);
      setProducts(p.data.map((pr) => ({ label: pr.descripcion, ...pr })));
      setSaleTypes(st.data);

      // Pre-seleccionar "Remito" automáticamente en creación
      if (!isEdit) {
        const remito = mappedBillTypes.find(
          (t) => t.descripcion?.toLowerCase() === 'remito'
        );
        if (remito) setSelectedBillType(remito);
      }
    };
    load().catch(console.error);
  }, [isEdit]);

  // ── Precios del cliente ────────────────────────────────────────────
  useEffect(() => {
    if (!selectedClient) { setClientPrices({}); return; }
    axios
      .get(`${clientUrl}${selectedClient.id}/products-with-prices/`)
      .then((res) => {
        const map = {};
        res.data.forEach((entry) => {
          map[entry.producto.id] = {
            precio_unitario: entry.precio_unitario,
            precio_bulto: entry.precio_bulto,
          };
        });
        setClientPrices(map);
      })
      .catch(() => setClientPrices({}));
  }, [selectedClient]);

  // ── Carga de edición ───────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    axios.get(`${billUrl}${id}/`).then((res) => {
      const b = res.data;
      setFecha(b.fecha);
      setSelectedClient({ label: `${b.cliente.cuit} - ${b.cliente.razon_social}`, ...b.cliente });
      setSelectedBillType({ label: b.tipo_factura.descripcion, ...b.tipo_factura });
      setItems(
        b.items.map((it) => ({
          producto: { label: it.producto.descripcion, ...it.producto },
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
          precio_bulto: it.precio_bulto || '',
          tipo_venta: it.tipo_venta,
        }))
      );
    }).catch(console.error);
  }, [id, isEdit]);

  // ── Helpers de ítems ───────────────────────────────────────────────
  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);

  const removeItem = (idx) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = useCallback((idx, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }, []);

  const handleProductSelect = (idx, product) => {
    if (!product) {
      setItems((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], producto: null, precio_unitario: '', precio_bulto: '' };
        return next;
      });
      return;
    }
    const prices = clientPrices[product.id] || {};
    const currentTipoVenta = items[idx].tipo_venta;
    const isBulk = saleTypes.find((s) => s.id === currentTipoVenta)?.descripcion?.toLowerCase() === 'bulto';
    setItems((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        producto: product,
        precio_unitario: !isBulk ? (prices.precio_unitario ?? '') : '0',
        precio_bulto: isBulk ? (prices.precio_bulto ?? '') : '0',
      };
      return next;
    });
  };

  // Cuando cambia el tipo de venta, rota el precio al campo correcto
  const handleSaleTypeChange = (idx, tipoVentaId) => {
    const tipoVenta = saleTypes.find((s) => s.id === tipoVentaId);
    const isBulk = tipoVenta?.descripcion?.toLowerCase() === 'bulto';
    const product = items[idx].producto;
    const prices = product ? (clientPrices[product.id] || {}) : {};
    setItems((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        tipo_venta: tipoVentaId,
        precio_unitario: !isBulk ? (prices.precio_unitario ?? next[idx].precio_unitario ?? '') : '0',
        precio_bulto:    isBulk  ? (prices.precio_bulto    ?? next[idx].precio_bulto    ?? '') : '0',
      };
      return next;
    });
  };

  // ── Helpers de tipo de venta ───────────────────────────────────────
  const isBulkItem = (item) =>
    saleTypes.find((s) => s.id === item.tipo_venta)?.descripcion?.toLowerCase() === 'bulto';

  // ── Total ──────────────────────────────────────────────────────────
  // Devuelve null si no hay tipo_venta seleccionado (sin cálculo)
  const calcSubtotal = (item) => {
    if (!item.tipo_venta) return null;
    const qty = parseFloat(item.cantidad) || 0;
    const price = isBulkItem(item)
      ? parseFloat(item.precio_bulto) || 0
      : parseFloat(item.precio_unitario) || 0;
    return qty * price;
  };

  const total = items.reduce((sum, it) => {
    const sub = calcSubtotal(it);
    return sum + (sub ?? 0);
  }, 0);

  // ── Fila automática ────────────────────────────────────────────────
  // Cuando el último ítem está completo, agrega una fila vacía
  useEffect(() => {
    const last = items[items.length - 1];
    if (last.producto && parseFloat(last.cantidad) > 0 && last.tipo_venta) {
      setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
    }
  }, [items]);

  // ── Validación ─────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!selectedClient) e.client = 'Seleccioná un cliente';
    if (!selectedBillType) e.billType = 'Seleccioná un tipo';
    if (!fecha) e.fecha = 'Ingresá la fecha';

    const filledItems = items.filter((it) => it.producto !== null);
    if (filledItems.length === 0) {
      e.items_empty = 'Agregá al menos un producto';
      return e;
    }

    // Solo validar filas con producto cargado (la última fila vacía auto-agregada se ignora)
    items.forEach((it, idx) => {
      if (!it.producto) return;
      if (!it.cantidad || parseFloat(it.cantidad) <= 0) e[`item_${idx}_cantidad`] = 'Requerido';
      if (!it.tipo_venta) e[`item_${idx}_tipo_venta`] = 'Requerido';
    });
    return e;
  };

  // ── Guardar ────────────────────────────────────────────────────────
  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        cliente: selectedClient.id,
        tipo_factura: selectedBillType.id,
        fecha,
        items: items
          .filter((it) => it.producto !== null)
          .map((it) => ({
            producto: it.producto.id,
            cantidad: it.cantidad,
          precio_unitario: it.precio_unitario || '0',
          precio_bulto: it.precio_bulto || '0',
            tipo_venta: it.tipo_venta,
          })),
      };
      let res;
      if (isEdit) {
        res = await axios.put(`${billUrl}${id}/`, payload);
      } else {
        res = await axios.post(billUrl, payload);
      }
      navigate(`/bill/detail/${res.data.id}`);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data || 'Error al guardar la factura.';
      alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto py-6 px-4 bg-white rounded shadow-md w-full max-w-5xl">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-4">
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/bill')}
          color="primary"
          variant="outlined"
        >
          Volver
        </Button>
        <h1 className="text-2xl font-bold text-gray-800">
          {isEdit ? `Editar Remito #${String(id).padStart(8, '0')}` : 'Nueva Factura'}
        </h1>
        <div className="w-20" />
      </div>

      <hr className="border-gray-200 mb-6" />

      {/* Datos del encabezado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Cliente */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Cliente *</label>
          <Autocomplete
            options={clients}
            value={selectedClient}
            onChange={(_, v) => setSelectedClient(v)}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="CUIT o Razón Social..."
                error={Boolean(errors.client)}
                helperText={errors.client}
              />
            )}
          />
        </div>

        {/* Fecha */}
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

        {/* Tipo factura */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de facturación *</label>
          <Autocomplete
            options={billTypes}
            value={selectedBillType}
            onChange={(_, v) => setSelectedBillType(v)}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="Seleccionar..."
                error={Boolean(errors.billType)}
                helperText={errors.billType}
              />
            )}
          />
        </div>

        {/* Info del cliente (readonly) */}
        {selectedClient && (
          <>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">CUIT</label>
              <input
                readOnly
                value={selectedClient.cuit || ''}
                className="w-full border border-gray-200 bg-gray-50 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Domicilio</label>
              <input
                readOnly
                value={selectedClient.domicilio || ''}
                className="w-full border border-gray-200 bg-gray-50 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Localidad</label>
              <input
                readOnly
                value={selectedClient.localidad?.nombre || ''}
                className="w-full border border-gray-200 bg-gray-50 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Condición IVA</label>
              <input
                readOnly
                value={selectedClient.condicion_IVA?.descripcion || ''}
                className="w-full border border-gray-200 bg-gray-50 rounded px-3 py-2 text-sm"
              />
            </div>
          </>
        )}
      </div>

      {/* Tabla de ítems — solo visible si hay cliente seleccionado */}
      {selectedClient && (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-700">Productos</h2>
          <button
            onClick={addItem}
            className="flex items-center gap-1 bg-transparent border-none text-blue-lahuerta text-sm font-medium cursor-pointer hover:underline hover:underline-offset-2"
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
                <th className="border border-gray-200 px-2 py-2 text-center w-24">Cantidad</th>
                <th className="border border-gray-200 px-2 py-2 text-center w-32">Tipo de venta</th>
                <th className="border border-gray-200 px-2 py-2 text-center w-32">Precio</th>
                <th className="border border-gray-200 px-2 py-2 text-center w-28">Subtotal</th>
                <th className="border border-gray-200 px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const bulk = isBulkItem(item);
                const noTipoVenta = !item.tipo_venta;
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-2 py-1 text-center text-gray-400">
                      {idx + 1}
                    </td>
                    {/* Producto */}
                    <td className="border border-gray-200 px-2 py-1">
                      <Autocomplete
                        options={products}
                        value={item.producto}
                        onChange={(_, v) => handleProductSelect(idx, v)}
                        size="small"
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Escribir producto..."
                            size="small"
                            error={Boolean(errors[`item_${idx}_producto`])}
                            sx={{ minWidth: 200 }}
                          />
                        )}
                      />
                    </td>
                    {/* Cantidad */}
                    <td className="border border-gray-200 px-2 py-1">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.cantidad}
                        onChange={(e) => updateItem(idx, 'cantidad', e.target.value)}
                        className={`w-full border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                          errors[`item_${idx}_cantidad`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </td>
                    {/* Tipo venta */}
                    <td className="border border-gray-200 px-2 py-1">
                      <select
                        value={item.tipo_venta || ''}
                        onChange={(e) => handleSaleTypeChange(idx, Number(e.target.value))}
                        className={`w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                          errors[`item_${idx}_tipo_venta`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">-</option>
                        {saleTypes.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.descripcion}
                          </option>
                        ))}
                      </select>
                    </td>
                    {/* Precio (dinámico según tipo venta) */}
                    <td className="border border-gray-200 px-2 py-1">
                      {noTipoVenta ? (
                        <span className="text-gray-400 text-xs italic px-1">Elegí tipo</span>
                      ) : bulk ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.precio_bulto}
                          onChange={(e) => updateItem(idx, 'precio_bulto', e.target.value)}
                          placeholder="P. Bulto"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      ) : (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.precio_unitario}
                          onChange={(e) => updateItem(idx, 'precio_unitario', e.target.value)}
                          placeholder="P. Unitario"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      )}
                    </td>
                    {/* Subtotal */}
                    <td className="border border-gray-200 px-2 py-1 text-right font-medium text-gray-700">
                      {calcSubtotal(item) !== null ? formatCurrency(calcSubtotal(item)) : '—'}
                    </td>
                    {/* Eliminar */}
                    <td className="border border-gray-200 px-1 py-1 text-center">
                      {items.length > 1 && (
                        <IconButton size="small" onClick={() => removeItem(idx)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div className="flex justify-end mt-3 pr-10">
          <div className="text-right">
            <span className="text-gray-500 text-sm mr-4">TOTAL</span>
            <span className="text-xl font-bold text-gray-800">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
      )}

      {/* Botones */}
      <div className="flex justify-center gap-4 mt-6 pt-4 border-t border-gray-200">
        <Button
          variant="contained"
          onClick={() => navigate('/bill')}
          sx={{
            bgcolor: '#ef4444',
            '&:hover': { bgcolor: '#dc2626' },
            textTransform: 'none',
            fontWeight: 700,
            px: 4,
            py: 1.25,
          }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !items.some((it) => { const s = calcSubtotal(it); return s !== null && s > 0; })}
          sx={{
            bgcolor: '#5d89c8',
            '&:hover': { bgcolor: '#4a70a8' },
            textTransform: 'none',
            fontWeight: 700,
            px: 4,
            py: 1.25,
          }}
        >
          {saving ? 'Guardando…' : 'Confirmar'}
        </Button>
      </div>
    </div>
  );
};

export default FacturaForm;
