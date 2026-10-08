import { getSuggestedUnitPrice, getUnitAbbreviation, findSaleType, sortSaleTypes, isSamePrice, matchesClientSearch } from './priceList';

const weightProduct = (approximateWeight) => ({
  peso_aproximado: approximateWeight,
  cantidad_por_bulto: null,
  tipo_unidad: { tipo_medicion: 'PESO', abreviacion: 'kg' },
  tipo_contenedor: { abreviacion: 'c' },
});

const quantityProduct = (unitsPerBundle) => ({
  peso_aproximado: null,
  cantidad_por_bulto: unitsPerBundle,
  tipo_unidad: { tipo_medicion: 'CANTIDAD', abreviacion: 'u' },
  tipo_contenedor: { abreviacion: 'pac' },
});

describe('getSuggestedUnitPrice', () => {
  test('producto por peso: aplica 5% y redondea para arriba a la centena', () => {
    // 80000 * 1.05 / 18 = 4666.67 → 4700
    expect(getSuggestedUnitPrice('80000', weightProduct('18'))).toBe('4700');
  });

  test('producto por cantidad: divide por cantidad_por_bulto', () => {
    // 12000 * 1.05 / 12 = 1050 → 1100
    expect(getSuggestedUnitPrice(12000, quantityProduct(12))).toBe('1100');
  });

  test('si el resultado ya es centena exacta no sube', () => {
    // 20000 * 1.05 / 10 = 2100
    expect(getSuggestedUnitPrice('20000', quantityProduct(10))).toBe('2100');
  });

  test('ruido de coma flotante no salta a la centena siguiente', () => {
    // 4000 * 1.05 / 2 = 2100.0000000000005 en float
    expect(getSuggestedUnitPrice('4000', quantityProduct(2))).toBe('2100');
  });

  test('bulto de una sola unidad (ej. Sandía): mismo precio, sin recargo', () => {
    expect(getSuggestedUnitPrice('3500', quantityProduct(1))).toBe('3500');
  });

  test('producto por peso de 1 kg sí aplica recargo', () => {
    expect(getSuggestedUnitPrice('1000', weightProduct('1'))).toBe('1100');
  });

  test('sin precio de bulto o precio inválido devuelve vacío', () => {
    expect(getSuggestedUnitPrice('', weightProduct('18'))).toBe('');
    expect(getSuggestedUnitPrice('0', weightProduct('18'))).toBe('');
    expect(getSuggestedUnitPrice('abc', weightProduct('18'))).toBe('');
  });

  test('sin divisor cargado devuelve vacío', () => {
    expect(getSuggestedUnitPrice('80000', weightProduct(null))).toBe('');
    expect(getSuggestedUnitPrice('80000', quantityProduct(0))).toBe('');
    expect(getSuggestedUnitPrice('80000', null)).toBe('');
  });
});

describe('getUnitAbbreviation', () => {
  test('Unidad usa tipo_unidad y Bulto usa tipo_contenedor', () => {
    const product = weightProduct('18');
    expect(getUnitAbbreviation(product, { descripcion: 'Unidad' })).toBe('kg');
    expect(getUnitAbbreviation(product, { descripcion: 'Bulto' })).toBe('c');
    expect(getUnitAbbreviation(product, { descripcion: 'Otro' })).toBe('');
  });
});

describe('findSaleType', () => {
  test('encuentra el tipo de venta por descripción sin importar mayúsculas', () => {
    const saleTypes = [{ id: 1, descripcion: 'Unidad' }, { id: 2, descripcion: 'BULTO' }];
    expect(findSaleType(saleTypes, 'bulto')).toEqual({ id: 2, descripcion: 'BULTO' });
    expect(findSaleType(saleTypes, 'otro')).toBeNull();
  });
});

describe('sortSaleTypes', () => {
  test('ordena Bulto, Unidad y después el resto por id, sin mutar el original', () => {
    const saleTypes = [
      { id: 3, descripcion: 'Docena' },
      { id: 1, descripcion: 'Unidad' },
      { id: 2, descripcion: 'Bulto' },
    ];
    expect(sortSaleTypes(saleTypes).map((saleType) => saleType.descripcion)).toEqual(['Bulto', 'Unidad', 'Docena']);
    expect(saleTypes[0].id).toBe(3);
  });
});

describe('isSamePrice', () => {
  test('compara por valor numérico, no por texto', () => {
    expect(isSamePrice('29000.00', '29000')).toBe(true);
    expect(isSamePrice('29000', '29500')).toBe(false);
    expect(isSamePrice('', '')).toBe(true);
    expect(isSamePrice('', '0')).toBe(false);
  });
});

describe('matchesClientSearch', () => {
  const client = { razon_social: 'Verdulería Ñandú SRL', nombre_fantasia: 'El Ñandú', cuit: '30712345678' };

  test('busca por razón social, nombre de fantasía o CUIT sin importar mayúsculas ni acentos', () => {
    expect(matchesClientSearch(client, 'verduleria')).toBe(true);
    expect(matchesClientSearch(client, 'EL NANDU')).toBe(true);
    expect(matchesClientSearch(client, '307123')).toBe(true);
    expect(matchesClientSearch(client, 'mayorista')).toBe(false);
  });

  test('búsqueda vacía muestra todos', () => {
    expect(matchesClientSearch(client, '   ')).toBe(true);
    expect(matchesClientSearch({ razon_social: 'X', nombre_fantasia: null, cuit: null }, '')).toBe(true);
  });
});
