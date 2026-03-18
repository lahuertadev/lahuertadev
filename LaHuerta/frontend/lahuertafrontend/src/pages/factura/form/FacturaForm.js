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
import MenuItem from '@mui/material/MenuItem';

const EMPTY_ITEM = {
  producto: null,
  cantidad: '',
  tipo_venta: null,
  precio_aplicado: '',
};

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
  // Final structure: { producto_id: { tipo_venta_id: precio } }
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
      if (!productId || !saleTypeId) {
        return '';
      }

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
    const selectedIds = items
      .map((item) => item.producto?.id)
      .filter(Boolean);

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
    <div className="container mx-auto py-6 px-4 bg-white rounded shadow-md w-full max-w-5xl">
      {/* Header */}
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

      {/* Header data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Client */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Cliente *</label>
          <Autocomplete
            options={clients}
            value={selectedClient}
            onChange={(_, value) => setSelectedClient(value)}
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

        {/* Date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha *</label>
          <input
            type="date"
            value={fecha}
            onChange={(event) => setFecha(event.target.value)}
            className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 ${
              errors.fecha ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.fecha && <p className="text-red-500 text-xs mt-1">{errors.fecha}</p>}
        </div>

        {/* Bill type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de facturación *</label>
          <Autocomplete
            options={billTypes}
            value={selectedBillType}
            onChange={(_, value) => setSelectedBillType(value)}
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

        {/* Client info */}
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

      {/* Items table */}
      {selectedClient && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-700">Productos</h2>
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
                  <th className="border border-gray-200 px-2 py-2 text-center w-24">Cantidad</th>
                  <th className="border border-gray-200 px-2 py-2 text-center w-32">Tipo de venta</th>
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

                    {/* Product */}
                    <td className="border border-gray-200 px-2 py-1 align-middle">
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
                            error={Boolean(errors[`item_${index}_producto`])}
                            sx={{ minWidth: 200 }}
                          />
                        )}
                      />
                    </td>

                    {/* Quantity */}
                    <td className="border border-gray-200 px-2 py-1 w-32">
                      <TextField
                        type="number"
                        size="small"
                        fullWidth
                        inputProps={{ min: 0, step: 0.01 }}
                        value={item.cantidad}
                        onChange={(event) => updateItem(index, 'cantidad', event.target.value)}
                        error={Boolean(errors[`item_${index}_cantidad`])}
                        sx={{
                          '& input': {
                            textAlign: 'right',
                          },
                        }}
                      />
                    </td>

                    {/* Sale type */}
                    <td className="border border-gray-200 px-2 py-1">
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
                        error={Boolean(errors[`item_${index}_tipo_venta`])}
                      >
                        <MenuItem value="">-</MenuItem>
                        {saleTypes.map((saleType) => (
                          <MenuItem key={saleType.id} value={saleType.id}>
                            {saleType.descripcion}
                          </MenuItem>
                        ))}
                      </TextField>
                    </td>

                    {/* Price */}
                    <td className="border border-gray-200 px-2 py-1 text-right text-gray-700">
                      {item.precio_aplicado ? (
                        formatCurrency(parseFloat(item.precio_aplicado))
                      ) : (
                        <span className="text-gray-400 text-xs italic">—</span>
                      )}
                    </td>

                    {/* Subtotal */}
                    <td className="border border-gray-200 px-2 py-1 text-right font-medium text-gray-700">
                      {calculateSubtotal(item) !== null ? formatCurrency(calculateSubtotal(item)) : '—'}
                    </td>

                    {/* Delete */}
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

          {/* Total */}
          <div className="flex justify-end mt-3 pr-10">
            <div className="text-right">
              <span className="text-gray-500 text-sm mr-4">TOTAL</span>
              <span className="text-xl font-bold text-gray-800">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
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
          disabled={
            saving ||
            !items.some((item) => {
              const subtotal = calculateSubtotal(item);
              return subtotal !== null && subtotal > 0;
            })
          }
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