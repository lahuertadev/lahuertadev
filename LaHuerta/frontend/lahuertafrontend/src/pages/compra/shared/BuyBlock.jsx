import React, { useCallback, useEffect } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { formatCurrency } from '../../../utils/currency';
import AmountInput from '../../../components/AmountInput';
import CustomInput from '../../../components/Input';
import BasicSelect from '../../../components/Select';
import CountUp from '../../../components/CountUp';
import { EMPTY_ITEM, EMPTY_VACIO, calculateItemSubtotal, calculateBlockTotals, formatTelefono, getExistingBuyWarning } from './buyBlockUtils';

const autocompleteSx = (hasError) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'var(--color-surface-low)',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    padding: '0 !important',
    '& fieldset': {
      borderColor: hasError ? '#f87171' : 'var(--color-border-subtle)',
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
    color: 'var(--color-on-surface)',
  },
});

// Label chico en mayúsculas, mismo patrón que ya usan CustomInput/BasicSelect en el resto del sitio.
const mobileLabelCls = 'block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider mb-1';

/**
 * BuyBlock — una compra a un proveedor: proveedor, seña, productos y vacíos.
 * Componente controlado, compartido por la carga simple y la carga masiva.
 *
 * Props:
 *   block               — { supplier, hasSign, sign, items, vacios } (ver createEmptyBlock)
 *   onChange            — (updater: prevBlock => nextBlock) => void
 *   options             — { suppliers, products, saleTypes, containerTypes } (ver useBuyOptions)
 *   errors              — errores de validación del bloque (ver validateBlock)
 *   excludedSupplierIds — proveedores que no se ofrecen en el selector (ya elegidos en otro bloque)
 *   title               — título de la primera sección
 *   dateField           — nodo opcional que se renderiza al lado del proveedor (ej. la fecha en la carga simple)
 *   existingBuyDate     — fecha en la que el proveedor elegido ya tiene otra compra (muestra un aviso, no bloquea)
 *   compact             — versión para la carga masiva: sin título de la primera sección, títulos de
 *                         sección chicos y sin los datos del proveedor (los muestra la card que lo contiene)
 */
const BuyBlock = ({
  block,
  onChange,
  options,
  errors = {},
  excludedSupplierIds = [],
  title = 'Datos de la compra',
  dateField = null,
  existingBuyDate = null,
  compact = false,
}) => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const { suppliers, products, saleTypes, containerTypes } = options;
  const { items, vacios, supplier: selectedSupplier } = block;
  const { subtotal, signValue, total } = calculateBlockTotals(block);

  const updateBlock = useCallback((changes) => onChange((prev) => ({ ...prev, ...changes })), [onChange]);
  const updateItems = useCallback((updater) => onChange((prev) => ({ ...prev, items: updater(prev.items) })), [onChange]);
  const updateVacios = (updater) => onChange((prev) => ({ ...prev, vacios: updater(prev.vacios) }));

  // ── Helpers de items ───────────────────────────────────────────────
  const addItem = () => updateItems((prev) => [...prev, { ...EMPTY_ITEM }]);

  const removeItem = (index) => updateItems((prev) => prev.filter((_, i) => i !== index));

  const updateItem = (index, field, value) => {
    updateItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleProductSelect = (index, product) => {
    updateItems((prev) => {
      const next = [...prev];
      next[index] = product ? { ...next[index], producto: product } : { ...EMPTY_ITEM };
      return next;
    });
  };

  // Un producto no puede repetirse dentro de la misma compra: se saca del selector de las otras filas.
  const getAvailableProducts = (currentIndex) => {
    const selectedIds = items
      .filter((_, i) => i !== currentIndex)
      .map((item) => item.producto?.id)
      .filter(Boolean);

    return products.filter((p) => !selectedIds.includes(p.id));
  };

  const availableSuppliers = suppliers.filter(
    (s) => s.id === selectedSupplier?.id || !excludedSupplierIds.includes(s.id)
  );

  // ── Helpers de vacíos ──────────────────────────────────────────────
  const addVacio = () => updateVacios((prev) => [...prev, { ...EMPTY_VACIO }]);

  const removeVacio = (index) => updateVacios((prev) => prev.filter((_, i) => i !== index));

  const updateVacio = (index, field, value) => {
    updateVacios((prev) => {
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

  // ── Auto-agregar fila ──────────────────────────────────────────────
  useEffect(() => {
    const last = items[items.length - 1];
    if (
      last?.producto &&
      parseFloat(last.cantidad_producto) > 0 &&
      parseFloat(last.precio) > 0
    ) {
      updateItems((prev) => [...prev, { ...EMPTY_ITEM }]);
    }
  }, [items, updateItems]);

  // ── Render ─────────────────────────────────────────────────────────
  const sectionTitle = (text, action = null) =>
    compact ? (
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-muted">{text}</h4>
        {action}
      </div>
    ) : (
      <h3 className="text-xl font-semibold text-on-surface border-b-2 border-border-subtle pb-2">{text}</h3>
    );

  const addItemButton = (
    <button
      type="button"
      onClick={addItem}
      className="flex items-center gap-1 bg-transparent border-none text-blue-lahuerta text-sm font-medium cursor-pointer hover:underline hover:underline-offset-2 focus:outline-none"
      style={{ background: 'transparent', boxShadow: 'none' }}
    >
      <AddCircleOutlineIcon fontSize="small" /> Agregar línea
    </button>
  );

  return (
    <>
      {/* Sección: Datos de la compra */}
      <div className={compact ? 'mb-5' : 'space-y-4 mb-6'}>
        {!compact && sectionTitle(title)}

      {/* Fila 1: Proveedor (+ Fecha en la carga simple) */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${compact ? 'mb-3' : 'mb-4'}`}>
        <div className={dateField ? 'md:col-span-2' : 'md:col-span-3'}>
          <BasicSelect
            label="Proveedor *"
            name="supplier"
            value={selectedSupplier ? { name: selectedSupplier.nombre, value: selectedSupplier.id } : null}
            options={availableSuppliers.map((s) => ({ name: s.nombre, value: s.id }))}
            onChange={(e) => {
              const supplierId = e.target.value?.value;
              updateBlock({ supplier: suppliers.find((s) => s.id === supplierId) || null });
            }}
            error={errors.supplier}
          />
          {existingBuyDate && (
            <p className="flex items-center gap-1 mt-1 text-xs font-medium text-amber-500">
              <WarningAmberIcon sx={{ fontSize: 16 }} />
              {getExistingBuyWarning(existingBuyDate)} Podés guardarla igual.
            </p>
          )}
        </div>

        {dateField && <div>{dateField}</div>}
      </div>

      {/* Fila 2: Datos del proveedor (solo cuando está seleccionado) */}
      {selectedSupplier && !compact && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <CustomInput
              readOnly
              label="Mercado"
              name="supplierMercado"
              value={selectedSupplier.mercado?.descripcion || ''}
              onChange={() => {}}
            />
          </div>
          <div>
            <CustomInput
              readOnly
              label="Puesto"
              name="supplierPuesto"
              value={selectedSupplier.puesto || ''}
              onChange={() => {}}
            />
          </div>
          <div>
            <CustomInput
              readOnly
              label="Contacto"
              name="supplierContacto"
              value={formatTelefono(selectedSupplier.telefono)}
              onChange={() => {}}
            />
          </div>
        </div>
      )}

      {/* Fila 3: Switch seña */}
      <div className={compact ? '' : 'mb-6'}>
        <FormControlLabel
          control={
            <Switch
              checked={block.hasSign}
              onChange={(e) => updateBlock({ hasSign: e.target.checked, ...(!e.target.checked && { sign: '' }) })}
              color="primary"
            />
          }
          label={<span className="text-sm font-semibold text-on-surface">¿Se dejó seña?</span>}
        />

        {block.hasSign && (
          <div className="mt-2 max-w-xs">
            <label className="block text-sm font-semibold text-on-surface mb-1">Importe señado</label>
            <AmountInput
              name="senia"
              value={block.sign}
              onChange={(raw) => updateBlock({ sign: raw })}
            />
          </div>
        )}
      </div>

      </div>{/* fin sección Datos de la compra */}

      {/* Sección: Productos */}
      <div className="space-y-4 mb-6">
        {sectionTitle('Productos', compact ? addItemButton : null)}

      {/* Tabla de productos */}
      <div className="mb-4">
        {!compact && <div className="flex items-center justify-end mb-2">{addItemButton}</div>}

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
                  options={getAvailableProducts(index).map((p) => ({ name: p.descripcion, value: p.id }))}
                  onChange={(e) => {
                    const productId = e.target.value?.value;
                    handleProductSelect(index, products.find((p) => p.id === productId) || null);
                  }}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={mobileLabelCls}>Cantidad</label>
                    <TextField
                      type="number"
                      size="small"
                      fullWidth
                      inputProps={{ min: 0, step: 0.01 }}
                      value={item.cantidad_producto}
                      onChange={(e) => updateItem(index, 'cantidad_producto', e.target.value)}
                      error={Boolean(errors[`item_${index}_cantidad`])}
                    />
                  </div>
                  <BasicSelect
                    label="Tipo venta"
                    name={`tipo_venta_${index}`}
                    value={
                      item.tipo_venta
                        ? { name: saleTypes.find((st) => st.id === item.tipo_venta)?.descripcion, value: item.tipo_venta }
                        : null
                    }
                    options={saleTypes.map((st) => ({ name: st.descripcion, value: st.id }))}
                    onChange={(e) => updateItem(index, 'tipo_venta', e.target.value?.value ?? null)}
                    placeholder="Opciones"
                  />
                </div>

                <div>
                  <label className={mobileLabelCls}>Precio</label>
                  <AmountInput
                    name={`precio_${index}`}
                    value={item.precio}
                    onChange={(raw) => updateItem(index, 'precio', raw)}
                    hasError={Boolean(errors[`item_${index}_precio`])}
                  />
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-border-subtle">
                  <span className={mobileLabelCls + ' mb-0'}>Subtotal</span>
                  <span className="font-semibold text-on-surface">
                    {item.producto && parseFloat(item.precio) > 0
                      ? formatCurrency(calculateItemSubtotal(item))
                      : '—'}
                  </span>
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
                <th className="border border-border-subtle px-2 py-2 text-center w-28">Cantidad</th>
                <th className="border border-border-subtle px-2 py-2 text-center w-32">Tipo venta</th>
                <th className="border border-border-subtle px-2 py-2 text-center w-32">Precio</th>
                <th className="border border-border-subtle px-2 py-2 text-center w-28">Subtotal</th>
                <th className="border border-border-subtle px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="hover:bg-surface-low">
                  <td className="border border-border-subtle px-2 py-1 text-center text-on-surface-muted">
                    {index + 1}
                  </td>

                  {/* Producto */}
                  <td className="border border-border-subtle px-2 py-1 align-middle" style={{ minWidth: 200 }}>
                    <BasicSelect
                      name={`producto_${index}`}
                      value={item.producto ? { name: item.producto.descripcion, value: item.producto.id } : null}
                      options={getAvailableProducts(index).map((p) => ({ name: p.descripcion, value: p.id }))}
                      onChange={(e) => {
                        const productId = e.target.value?.value;
                        handleProductSelect(index, products.find((p) => p.id === productId) || null);
                      }}
                    />
                  </td>

                  {/* Cantidad */}
                  <td className="border border-border-subtle px-2 py-1">
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
                  <td className="border border-border-subtle px-2 py-1">
                    <BasicSelect
                      name={`tipo_venta_${index}`}
                      value={
                        item.tipo_venta
                          ? { name: saleTypes.find((st) => st.id === item.tipo_venta)?.descripcion, value: item.tipo_venta }
                          : null
                      }
                      options={saleTypes.map((st) => ({ name: st.descripcion, value: st.id }))}
                      onChange={(e) => updateItem(index, 'tipo_venta', e.target.value?.value ?? null)}
                      placeholder="Opciones"
                    />
                  </td>

                  {/* Precio */}
                  <td className="border border-border-subtle px-2 py-1">
                    <AmountInput
                      name={`precio_${index}`}
                      value={item.precio}
                      onChange={(raw) => updateItem(index, 'precio', raw)}
                      hasError={Boolean(errors[`item_${index}_precio`])}
                    />
                  </td>

                  {/* Subtotal */}
                  <td className="border border-border-subtle px-2 py-1 text-right font-medium text-on-surface">
                    {item.producto && parseFloat(item.precio) > 0
                      ? formatCurrency(calculateItemSubtotal(item))
                      : '—'}
                  </td>

                  {/* Eliminar */}
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
            {signValue > 0 && (
              <>
                <div>
                  <span className="text-on-surface-muted text-sm mr-4">SUBTOTAL</span>
                  <span className="text-base font-medium text-on-surface">{formatCurrency(subtotal)}</span>
                </div>
                <div>
                  <span className="text-on-surface-muted text-sm mr-4">SEÑA</span>
                  <span className="text-base font-medium text-red-500">- {formatCurrency(signValue)}</span>
                </div>
              </>
            )}
            <div>
              <span className="text-on-surface-muted text-sm mr-4">TOTAL</span>
              <CountUp value={total} className="text-xl font-bold text-on-surface" />
            </div>
          </div>
        </div>
      </div>

      </div>{/* fin sección Productos */}

      {/* Sección: Vacíos */}
      <div className={`space-y-4 ${compact ? '' : 'mb-6'}`}>
        {sectionTitle('Vacíos')}

        {vacios.length === 0 ? (
          <p className="text-sm text-on-surface-muted">Sin vacíos registrados.</p>
        ) : isMobile ? (
          <div className="space-y-3">
            {vacios.map((vacio, index) => (
              <div key={index} className="border border-border-subtle rounded-lg p-3 bg-surface-card space-y-3">
                <div className="flex items-center justify-between">
                  <span className={mobileLabelCls}>Vacío {index + 1}</span>
                  <IconButton size="small" onClick={() => removeVacio(index)} color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </div>

                <BasicSelect
                  label="Tipo"
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={mobileLabelCls}>Cantidad</label>
                    <TextField
                      type="number"
                      size="small"
                      fullWidth
                      inputProps={{ min: 0, step: 1 }}
                      value={vacio.cantidad}
                      onChange={(e) => updateVacio(index, 'cantidad', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={mobileLabelCls}>Precio seña</label>
                    <AmountInput
                      name={`vacio_precio_${index}`}
                      value={vacio.precio_unitario}
                      onChange={(raw) => updateVacio(index, 'precio_unitario', raw)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface-low text-on-surface">
                  <th className="border border-border-subtle px-2 py-2 text-center">Tipo</th>
                  <th className="border border-border-subtle px-2 py-2 text-center w-28">Cantidad</th>
                  <th className="border border-border-subtle px-2 py-2 text-center w-36">Precio seña</th>
                  <th className="border border-border-subtle px-2 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {vacios.map((vacio, index) => (
                  <tr key={index} className="hover:bg-surface-low">
                    <td className="border border-border-subtle px-2 py-1">
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
                    <td className="border border-border-subtle px-2 py-1">
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
                    <td className="border border-border-subtle px-2 py-1">
                      <AmountInput
                        name={`vacio_precio_${index}`}
                        value={vacio.precio_unitario}
                        onChange={(raw) => updateVacio(index, 'precio_unitario', raw)}
                      />
                    </td>
                    <td className="border border-border-subtle px-1 py-1 text-center">
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
    </>
  );
};

export default BuyBlock;
