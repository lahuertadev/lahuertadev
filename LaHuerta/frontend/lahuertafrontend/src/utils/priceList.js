// Recargo que se aplica al precio del bulto para sugerir el precio por unidad.
export const UNIT_PRICE_MARKUP = 1.05;

// El precio sugerido por unidad se redondea siempre para arriba a la centena (4.667 → 4.700).
const ROUNDING_STEP = 100;

export const SALE_TYPE_UNIT = 'unidad';
export const SALE_TYPE_BULK = 'bulto';

export const isSaleType = (saleType, description) =>
  saleType?.descripcion?.toLowerCase() === description;

export const findSaleType = (saleTypes, description) =>
  saleTypes.find((saleType) => isSaleType(saleType, description)) || null;

// Compara precios por valor numérico: "29000.00" (backend) y "29000" (input normalizado) son el mismo precio.
export const isSamePrice = (priceA, priceB) => {
  const numberA = parseFloat(priceA);
  const numberB = parseFloat(priceB);
  if (Number.isNaN(numberA) || Number.isNaN(numberB)) return Number.isNaN(numberA) && Number.isNaN(numberB);
  return numberA === numberB;
};

// Orden de las columnas de precio: Bulto, Unidad y después cualquier otro tipo de venta.
const SALE_TYPE_ORDER = [SALE_TYPE_BULK, SALE_TYPE_UNIT];

const getSaleTypeRank = (saleType) => {
  const rank = SALE_TYPE_ORDER.indexOf(saleType?.descripcion?.toLowerCase());
  return rank === -1 ? SALE_TYPE_ORDER.length : rank;
};

export const sortSaleTypes = (saleTypes) =>
  [...saleTypes].sort((a, b) => getSaleTypeRank(a) - getSaleTypeRank(b) || a.id - b.id);

// Abreviación a mostrar al lado de cada precio: la unidad del producto para "Unidad"
// y el contenedor para "Bulto" (kg, u, pac, c, etc.).
export const getUnitAbbreviation = (product, saleType) => {
  if (isSaleType(saleType, SALE_TYPE_UNIT)) return product?.tipo_unidad?.abreviacion || '';
  if (isSaleType(saleType, SALE_TYPE_BULK)) return product?.tipo_contenedor?.abreviacion || '';
  return '';
};

// Cuántas unidades trae un bulto: el peso aproximado si el producto se vende por peso,
// o la cantidad por bulto si se vende por cantidad (campos excluyentes según tipo_medicion).
const getUnitsPerBulk = (product) => {
  const measurementType = product?.tipo_unidad?.tipo_medicion;
  if (measurementType === 'PESO') return parseFloat(product.peso_aproximado);
  if (measurementType === 'CANTIDAD') return parseFloat(product.cantidad_por_bulto);
  return NaN;
};

// Precio por unidad sugerido a partir del precio del bulto:
//   ceil((bulkPrice * 1.05) / unitsPerBulk) a la centena.
// Si el bulto trae una sola unidad (ej. Sandía), la unidad es el mismo bulto: se sugiere
// el mismo precio, sin recargo. Devuelve '' cuando no se puede calcular.
export const getSuggestedUnitPrice = (bulkPrice, product) => {
  const bulkPriceNumber = parseFloat(bulkPrice);
  const unitsPerBulk = getUnitsPerBulk(product);

  if (!(bulkPriceNumber > 0) || !(unitsPerBulk > 0)) return '';

  if (product.tipo_unidad.tipo_medicion === 'CANTIDAD' && unitsPerBulk === 1) {
    return String(bulkPriceNumber);
  }

  const rawUnitPrice = (bulkPriceNumber * UNIT_PRICE_MARKUP) / unitsPerBulk;
  // Se redondea antes del ceil para que errores de coma flotante (ej. 4700.0000001)
  // no salten a la centena siguiente.
  const roundedUnitPrice = Math.ceil(Math.round(rawUnitPrice * 100) / 100 / ROUNDING_STEP) * ROUNDING_STEP;
  return String(roundedUnitPrice);
};

// Búsqueda de clientes en el diálogo "Asignar a clientes": por razón social, nombre de fantasía
// o CUIT, sin distinguir mayúsculas ni acentos.
const normalizeSearchText = (text) =>
  String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const matchesClientSearch = (client, query) => {
  const normalizedQuery = normalizeSearchText(query).trim();
  if (!normalizedQuery) return true;
  return [client.razon_social, client.nombre_fantasia, client.cuit]
    .some((field) => normalizeSearchText(field).includes(normalizedQuery));
};
