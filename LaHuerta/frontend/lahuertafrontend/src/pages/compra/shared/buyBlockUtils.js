import { formatDate } from '../../../utils/date';

// Lógica compartida del bloque de compra (proveedor + productos + vacíos),
// usada por la carga simple (CompraForm) y la carga masiva (CompraBulkForm).

export const EMPTY_ITEM = {
  producto: null,
  cantidad_producto: '',
  tipo_venta: null,
  precio: '',
};

export const EMPTY_VACIO = {
  tipo_contenedor: null,
  cantidad: '',
  precio_unitario: '',
};

export const createEmptyBlock = () => ({
  supplier: null,
  hasSign: false,
  sign: '',
  items: [{ ...EMPTY_ITEM }],
  vacios: [],
});

export const formatTelefono = (raw = '') => {
  const digits = (raw || '').replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
};

// ── Cálculos ─────────────────────────────────────────────────────────
export const calculateItemSubtotal = (item) => {
  const quantity = parseFloat(item.cantidad_producto) || 0;
  const price = parseFloat(item.precio) || 0;
  return quantity * price;
};

export const calculateBlockTotals = (block) => {
  const subtotal = block.items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
  const signValue = block.hasSign ? (parseFloat(block.sign) || 0) : 0;
  return { subtotal, signValue, total: subtotal - signValue };
};

// ── Validación ───────────────────────────────────────────────────────
// Devuelve un objeto de errores con las mismas claves que usaba CompraForm
// (supplier, items_empty, item_{i}_cantidad, item_{i}_precio, items_duplicated).
export const validateBlock = (block) => {
  const nextErrors = {};

  if (!block.supplier) nextErrors.supplier = 'Debe seleccionar un proveedor';

  const filledItems = block.items.filter((item) => item.producto !== null);

  if (filledItems.length === 0) {
    nextErrors.items_empty = 'Debe agregar al menos un producto';
    return nextErrors;
  }

  block.items.forEach((item, index) => {
    if (!item.producto) return;

    if (!item.cantidad_producto || parseFloat(item.cantidad_producto) <= 0) {
      nextErrors[`item_${index}_cantidad`] = 'Requerido';
    }

    if (!item.precio || parseFloat(item.precio) <= 0) {
      nextErrors[`item_${index}_precio`] = 'Requerido';
    }
  });

  const productIds = filledItems.map((item) => item.producto.id);
  if (new Set(productIds).size !== productIds.length) {
    nextErrors.items_duplicated = 'No se puede agregar el mismo producto más de una vez';
  }

  return nextErrors;
};

// ── Advertencia de vacíos ────────────────────────────────────────────
export const getVaciosWarnings = (block, saleTypes, containerTypes) => {
  const bulkSaleType = saleTypes.find((saleType) => saleType.descripcion.toLowerCase() === 'bulto');
  if (!bulkSaleType) return [];

  const required = {};
  block.items.forEach((item) => {
    if (item.tipo_venta !== bulkSaleType.id || !item.producto?.tipo_contenedor) return;
    const quantity = parseFloat(item.cantidad_producto) || 0;
    if (quantity <= 0) return;
    const { id, descripcion } = item.producto.tipo_contenedor;
    if (!required[id]) required[id] = { descripcion, quantity: 0 };
    required[id].quantity += quantity;
  });

  return Object.entries(required).flatMap(([containerTypeId, { descripcion, quantity }]) => {
    const containerType = containerTypes.find((ct) => ct.id === Number(containerTypeId));
    if (!containerType?.requiere_vacio) return [];
    const vacio = block.vacios.find((v) => v.tipo_contenedor === Number(containerTypeId));
    const vacioQuantity = vacio ? (parseFloat(vacio.cantidad) || 0) : 0;
    if (vacioQuantity >= quantity) return [];
    const plural = quantity !== 1 ? 's' : '';
    if (vacioQuantity === 0)
      return [`No se cargaron vacíos para "${descripcion}" (${quantity} bulto${plural} comprado${plural}).`];
    return [`Los vacíos de "${descripcion}" cargados son ${vacioQuantity}, pero se compran ${quantity} bulto${plural}.`];
  });
};

// ── Compra existente en la fecha ─────────────────────────────────────
export const getExistingBuyWarning = (date) =>
  `Ya hay una compra cargada para este proveedor el ${formatDate(date)}.`;

// ── Payload ──────────────────────────────────────────────────────────
// Arma la compra en el formato que espera el backend (sin la fecha,
// que la agrega cada formulario).
export const buildBuyPayload = (block) => {
  const { signValue } = calculateBlockTotals(block);
  const filledItems = block.items.filter((item) => item.producto !== null);
  const filledVacios = block.vacios.filter((v) => v.tipo_contenedor && parseFloat(v.cantidad) > 0);

  return {
    proveedor: block.supplier.id,
    senia: signValue,
    vacios: filledVacios.map((v) => ({
      tipo_contenedor: v.tipo_contenedor,
      cantidad: parseFloat(v.cantidad),
      precio_unitario: parseFloat(v.precio_unitario) || 0,
    })),
    items: filledItems.map((item) => {
      const quantity = parseFloat(item.cantidad_producto) || 1;
      const boxPrice = parseFloat(item.precio) || 0;
      const unitPrice = quantity > 0 ? boxPrice / quantity : 0;

      return {
        producto: item.producto.id,
        tipo_venta: item.tipo_venta ?? null,
        cantidad_producto: quantity,
        precio_bulto: boxPrice,
        precio_unitario: parseFloat(unitPrice.toFixed(2)),
      };
    }),
  };
};
