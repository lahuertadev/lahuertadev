import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import MenuItem from '@mui/material/MenuItem';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PersonIcon from '@mui/icons-material/Person';
import ListAltIcon from '@mui/icons-material/ListAlt';
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
  tipo_venta: null,
  precio_aplicado: '',
};

// ── Estilos reutilizables ──────────────────────────────────────────────────────
const inputCls = (hasError) =>
  `w-full bg-surface-low px-3 py-2.5 rounded-lg border text-sm text-on-surface placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
    hasError
      ? 'border-red-400 ring-2 ring-red-100'
      : 'border-border-subtle focus:border-blue-lahuerta/40 focus:ring-blue-lahuerta/10'
  }`;

const labelCls = 'block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider mb-1.5';

const colsMap = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
};

const SectionCard = ({ icon, title, children, cols = 3 }) => (
  <section className="space-y-3">
    <div className="flex items-center gap-2 px-1">
      <span className="text-blue-lahuerta">{icon}</span>
      <h2 className="text-base font-semibold text-on-surface">{title}</h2>
    </div>
    <div className={`bg-surface-card p-6 rounded-xl shadow-sm border border-border-subtle grid grid-cols-1 ${colsMap[cols] ?? 'md:grid-cols-3'} gap-6`}>
      {children}
    </div>
  </section>
);

const FieldError = ({ message }) =>
  message ? <p className="mt-1 text-xs text-red-500">{message}</p> : null;

// sx compartido para MUI Autocomplete
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

// ── Componente principal ───────────────────────────────────────────────────────
const FacturaForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [clients, setClients] = useState([]);
  const [billTypes, setBillTypes] = useState([]);
  const [products, setProducts] = useState([]);
  const [saleTypes, setSaleTypes] = useState([]);
  const [clientPrices, setClientPrices] = useState({});

  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedBillType, setSelectedBillType] = useState(null);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);

  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Load options ───────────────────────────────────────────────────
  useEffect(() => {
    const loadOptions = async () => {
      const [clientsResponse, billTypesResponse, productsResponse, saleTypesResponse] = await Promise.all([
        axios.get(clientUrl),
        axios.get(billTypeUrl),
        axios.get(productUrl),
        axios.get(saleTypeUrl),
      ]);

      setClients(
        clientsResponse.data.map((client) => ({
          label: `${client.cuit} - ${client.razon_social}`,
          ...client,
        }))
      );

      const mappedBillTypes = billTypesResponse.data.map((billType) => ({
        label: billType.descripcion,
        ...billType,
      }));
      setBillTypes(mappedBillTypes);

      setProducts(
        productsResponse.data.map((product) => ({
          label: product.descripcion,
          ...product,
        }))
      );

      setSaleTypes(saleTypesResponse.data);

      if (!isEdit) {
        const remito = mappedBillTypes.find(
          (billType) => billType.descripcion?.toLowerCase() === 'remito'
        );
        if (remito) setSelectedBillType(remito);
      }
    };

    loadOptions().catch(console.error);
  }, [isEdit]);

  // ── Load client prices ─────────────────────────────────────────────
  useEffect(() => {
    if (!selectedClient) {
      setClientPrices({});
      return;
    }

    axios
      .get(`${clientUrl}${selectedClient.id}/products-with-prices/`)
      .then((response) => {
        const priceMap = {};

        response.data.forEach((entry) => {
          const productId = Number(entry.producto.id);
          const saleTypeId = Number(entry.tipo_venta.id);
          const price = Number(entry.precio);

          if (!priceMap[productId]) priceMap[productId] = {};
          priceMap[productId][saleTypeId] = price;
        });

        setClientPrices(priceMap);
      })
      .catch((error) => {
        console.error('ERROR LOADING PRICES:', error);
        setClientPrices({});
      });
  }, [selectedClient]);

  // ── Load edit data ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;

    axios
      .get(`${billUrl}${id}/`)
      .then((response) => {
        const bill = response.data;

        setFecha(bill.fecha);
        setSelectedClient({
          label: `${bill.cliente.cuit} - ${bill.cliente.razon_social}`,
          ...bill.cliente,
        });
        setSelectedBillType({
          label: bill.tipo_factura.descripcion,
          ...bill.tipo_factura,
        });

        setItems(
          bill.items.map((item) => ({
            producto: { label: item.producto.descripcion, ...item.producto },
            cantidad: item.cantidad,
            tipo_venta: item.tipo_venta?.id ?? null,
            precio_aplicado: item.precio_aplicado,
          }))
        );
      })
      .catch(console.error);
  }, [id, isEdit]);

  // ── Item helpers ───────────────────────────────────────────────────
  const addItem = () => setItems((previous) => [...previous, { ...EMPTY_ITEM }]);

  const removeItem = (index) =>
    setItems((previous) => previous.filter((_, currentIndex) => currentIndex !== index));

  const updateItem = useCallback((index, field, value) => {
    setItems((previous) => {
      const nextItems = [...previous];
      nextItems[index] = { ...nextItems[index], [field]: value };
      return nextItems;
    });
  }, []);

  const resolvePrice = useCallback(
    (productId, saleTypeId) => {
      if (!productId || !saleTypeId) return '';
      const price = clientPrices[productId]?.[saleTypeId];
      return price ?? '';
    },
    [clientPrices]
  );

  const handleProductSelect = (index, product) => {
    if (!product) {
      setItems((previous) => {
        const nextItems = [...previous];
        nextItems[index] = { ...EMPTY_ITEM };
        return nextItems;
      });
      return;
    }

    setItems((previous) => {
      const nextItems = [...previous];
      const saleTypeId = nextItems[index].tipo_venta;
      const price = resolvePrice(product.id, saleTypeId);

      nextItems[index] = {
        ...nextItems[index],
        producto: product,
        precio_aplicado: price,
      };

      return nextItems;
    });
  };

  const handleSaleTypeChange = (index, saleTypeId) => {
    setItems((previous) => {
      const nextItems = [...previous];
      const productId = nextItems[index].producto?.id;
      const price = resolvePrice(productId, saleTypeId);

      nextItems[index] = {
        ...nextItems[index],
        tipo_venta: saleTypeId,
        precio_aplicado: price,
      };

      return nextItems;
    });
  };

  const hasDuplicatedProducts = () => {
    const selectedIds = items.map((item) => item.producto?.id).filter(Boolean);
    return new Set(selectedIds).size !== selectedIds.length;
  };

  const getAvailableProducts = (currentIndex) => {
    const selectedProductIds = items
      .filter((_, index) => index !== currentIndex)
      .map((item) => item.producto?.id)
      .filter(Boolean);

    return products.filter((product) => !selectedProductIds.includes(product.id));
  };

  // ── Totals ─────────────────────────────────────────────────────────
  const calculateSubtotal = (item) => {
    if (!item.tipo_venta || !item.precio_aplicado) return null;
    const quantity = parseFloat(item.cantidad) || 0;
    const price = parseFloat(item.precio_aplicado) || 0;
    return quantity * price;
  };

  const total = items.reduce((sum, item) => sum + (calculateSubtotal(item) ?? 0), 0);

  // ── Auto-add row ───────────────────────────────────────────────────
  useEffect(() => {
    const lastItem = items[items.length - 1];
    if (lastItem.producto && parseFloat(lastItem.cantidad) > 0 && lastItem.tipo_venta) {
      setItems((previous) => [...previous, { ...EMPTY_ITEM }]);
    }
  }, [items]);

  // ── Validation ─────────────────────────────────────────────────────
  const validate = () => {
    const nextErrors = {};

    if (!selectedClient) nextErrors.client = 'Debe seleccionar un cliente';
    if (!selectedBillType) nextErrors.billType = 'Debe seleccionar un tipo de factura';
    if (!fecha) nextErrors.fecha = 'Debe ingresar una fecha';

    const filledItems = items.filter((item) => item.producto !== null);

    if (filledItems.length === 0) {
      nextErrors.items_empty = 'Debe agregar al menos un producto';
      return nextErrors;
    }

    items.forEach((item, index) => {
      if (!item.producto) return;

      if (!item.cantidad || parseFloat(item.cantidad) <= 0) {
        nextErrors[`item_${index}_cantidad`] = 'Requerido';
      }

      if (!item.tipo_venta) {
        nextErrors[`item_${index}_tipo_venta`] = 'Requerido';
      }
    });

    if (hasDuplicatedProducts()) {
      nextErrors.items_duplicated =
        'No se puede agregar el mismo producto más de una vez en la factura';
    }

    return nextErrors;
  };

  // ── Save ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSaving(true);

    try {
      const payload = {
        cliente: selectedClient.id,
        tipo_factura: selectedBillType.id,
        fecha,
        items: items
          .filter((item) => item.producto !== null)
          .map((item) => ({
            producto: item.producto.id,
            cantidad: item.cantidad,
            tipo_venta: item.tipo_venta,
          })),
      };

      let response;
      if (isEdit) {
        response = await axios.put(`${billUrl}${id}/`, payload);
      } else {
        response = await axios.post(billUrl, payload);
      }

      navigate(`/bill/detail/${response.data.id}`);
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        error?.response?.data ||
        'Error al guardar la factura.';

      alert(typeof message === 'string' ? message : JSON.stringify(message));
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm font-medium text-on-surface-muted">
        <span
          className="hover:text-blue-lahuerta cursor-pointer transition-colors"
          onClick={() => navigate('/')}
        >
          Home
        </span>
        <span className="text-xs">›</span>
        <span
          className="hover:text-blue-lahuerta cursor-pointer transition-colors"
          onClick={() => navigate('/bill')}
        >
          Facturas
        </span>
        <span className="text-xs">›</span>
        <span className="text-on-surface font-semibold">
          {isEdit ? `Editar #${String(id).padStart(8, '0')}` : 'Nueva'}
        </span>
      </nav>

      {/* 1. Datos de la factura */}
      <SectionCard icon={<ReceiptLongIcon sx={{ fontSize: 20 }} />} title="Datos de la Factura" cols={3}>
        <div className="md:col-span-2 flex flex-col gap-1">
          <label className={labelCls}>Cliente *</label>
          <Autocomplete
            options={clients}
            value={selectedClient}
            onChange={(_, value) => setSelectedClient(value)}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="CUIT o Razón Social..."
                sx={autocompleteSx(Boolean(errors.client))}
              />
            )}
          />
          <FieldError message={errors.client} />
        </div>

        {/* Fecha */}
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Fecha *</label>
          <input
            type="date"
            value={fecha}
            onChange={(event) => setFecha(event.target.value)}
            className={inputCls(Boolean(errors.fecha))}
          />
          <FieldError message={errors.fecha} />
        </div>

        {/* Tipo de facturación */}
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Tipo de facturación *</label>
          <Autocomplete
            options={billTypes}
            value={selectedBillType}
            onChange={(_, value) => setSelectedBillType(value)}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Seleccionar..."
                sx={autocompleteSx(Boolean(errors.billType))}
              />
            )}
          />
          <FieldError message={errors.billType} />
        </div>
      </SectionCard>

      {/* 2. Datos del cliente (condicional) */}
      {selectedClient && (
        <SectionCard icon={<PersonIcon sx={{ fontSize: 20 }} />} title="Datos del Cliente" cols={2}>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>CUIT</label>
            <input
              readOnly
              value={selectedClient.cuit || ''}
              className={inputCls(false) + ' opacity-70 cursor-default'}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Domicilio</label>
            <input
              readOnly
              value={selectedClient.domicilio || ''}
              className={inputCls(false) + ' opacity-70 cursor-default'}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Localidad</label>
            <input
              readOnly
              value={selectedClient.localidad?.nombre || ''}
              className={inputCls(false) + ' opacity-70 cursor-default'}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Condición IVA</label>
            <input
              readOnly
              value={selectedClient.condicion_IVA?.descripcion || ''}
              className={inputCls(false) + ' opacity-70 cursor-default'}
            />
          </div>
        </SectionCard>
      )}

      {/* 3. Productos */}
      {selectedClient && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="text-blue-lahuerta">
              <ListAltIcon sx={{ fontSize: 20 }} />
            </span>
            <h2 className="text-base font-semibold text-on-surface">Productos</h2>
          </div>

          <div className="bg-surface-card rounded-xl shadow-sm border border-border-subtle overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-end px-4 py-3 border-b border-border-subtle">
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1.5 text-sm font-semibold text-blue-lahuerta hover:text-blue-lahuerta/80 transition-colors"
              >
                <AddCircleOutlineIcon fontSize="small" />
                Agregar línea
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-surface-low">
                    <th className="px-3 py-2.5 text-center border-b border-border-subtle w-10">
                      <span className="text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider">#</span>
                    </th>
                    <th className="px-3 py-2.5 text-left border-b border-border-subtle">
                      <span className="text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider">Producto</span>
                    </th>
                    <th className="px-3 py-2.5 text-center border-b border-border-subtle w-28">
                      <span className="text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider">Cantidad</span>
                    </th>
                    <th className="px-3 py-2.5 text-center border-b border-border-subtle w-36">
                      <span className="text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider">Tipo de venta</span>
                    </th>
                    <th className="px-3 py-2.5 text-right border-b border-border-subtle w-32">
                      <span className="text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider">Precio</span>
                    </th>
                    <th className="px-3 py-2.5 text-right border-b border-border-subtle w-32">
                      <span className="text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider">Subtotal</span>
                    </th>
                    <th className="border-b border-border-subtle w-10" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="hover:bg-surface-low transition-colors">
                      {/* # */}
                      <td className="px-3 py-2 text-center align-middle border-b border-border-subtle text-on-surface-muted text-xs">
                        {index + 1}
                      </td>

                      {/* Producto */}
                      <td className="px-2 py-2 align-middle border-b border-border-subtle">
                        <Autocomplete
                          options={getAvailableProducts(index)}
                          value={item.producto}
                          onChange={(_, value) => handleProductSelect(index, value)}
                          size="small"
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="Escribir producto..."
                              size="small"
                              sx={{
                                ...autocompleteSx(Boolean(errors[`item_${index}_producto`])),
                                minWidth: 200,
                              }}
                            />
                          )}
                        />
                      </td>

                      {/* Cantidad */}
                      <td className="px-2 py-2 align-middle border-b border-border-subtle">
                        <TextField
                          type="number"
                          size="small"
                          fullWidth
                          inputProps={{ min: 0, step: 0.01 }}
                          value={item.cantidad}
                          onChange={(event) => updateItem(index, 'cantidad', event.target.value)}
                          sx={{
                            ...autocompleteSx(Boolean(errors[`item_${index}_cantidad`])),
                            '& input': { textAlign: 'right' },
                            '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { display: 'none' },
                            '& input[type=number]': { MozAppearance: 'textfield' },
                          }}
                        />
                      </td>

                      {/* Tipo de venta */}
                      <td className="px-2 py-2 align-middle border-b border-border-subtle">
                        <TextField
                          select
                          size="small"
                          fullWidth
                          value={item.tipo_venta ?? ''}
                          onChange={(event) =>
                            handleSaleTypeChange(
                              index,
                              event.target.value === '' ? null : Number(event.target.value)
                            )
                          }
                          sx={autocompleteSx(Boolean(errors[`item_${index}_tipo_venta`]))}
                        >
                          <MenuItem value="">-</MenuItem>
                          {saleTypes.map((saleType) => (
                            <MenuItem key={saleType.id} value={saleType.id}>
                              {saleType.descripcion}
                            </MenuItem>
                          ))}
                        </TextField>
                      </td>

                      {/* Precio */}
                      <td className="px-3 py-2 text-right align-middle border-b border-border-subtle text-sm text-on-surface tabular-nums">
                        {item.precio_aplicado ? (
                          formatCurrency(parseFloat(item.precio_aplicado))
                        ) : (
                          <span className="text-on-surface-muted">—</span>
                        )}
                      </td>

                      {/* Subtotal */}
                      <td className="px-3 py-2 text-right align-middle border-b border-border-subtle text-sm font-semibold text-on-surface tabular-nums">
                        {calculateSubtotal(item) !== null
                          ? formatCurrency(calculateSubtotal(item))
                          : <span className="text-on-surface-muted font-normal">—</span>}
                      </td>

                      {/* Eliminar */}
                      <td className="px-2 py-1.5 text-center align-middle border-b border-border-subtle">
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

            {/* Errores de items */}
            {(errors.items_empty || errors.items_duplicated) && (
              <div className="px-4 py-2 border-t border-border-subtle">
                {errors.items_empty && (
                  <p className="text-xs text-red-500">{errors.items_empty}</p>
                )}
                {errors.items_duplicated && (
                  <p className="text-xs text-red-500">{errors.items_duplicated}</p>
                )}
              </div>
            )}

            {/* Total */}
            <div className="flex justify-end items-center gap-4 px-6 py-4 border-t border-border-subtle bg-surface-low">
              <span className="text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider">
                Total
              </span>
              <span className="text-xl font-bold text-on-surface tabular-nums">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-end gap-4 pt-6 border-t border-border-subtle">
        <button
          type="button"
          onClick={() => navigate('/bill')}
          className="px-6 py-2.5 text-sm font-semibold text-on-surface-muted hover:bg-surface-low rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={
            saving ||
            !items.some((item) => {
              const subtotal = calculateSubtotal(item);
              return subtotal !== null && subtotal > 0;
            })
          }
          className="px-8 py-2.5 bg-blue-lahuerta text-white font-bold text-sm rounded-lg shadow-sm hover:bg-blue-lahuerta/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Confirmar'}
        </button>
      </div>
    </div>
  );
};

export default FacturaForm;
