import {
  allocationErrors,
  applicationsPayload,
  distributeAmount,
  onAccountAmount,
  releasedBuys,
  sortOldestFirst,
  totalApplied,
} from './allocation';

const BUYS = [
  { id: 3, fecha: '2026-10-20', available: '2000.00' },
  { id: 1, fecha: '2026-10-01', available: '1000.00' },
  { id: 2, fecha: '2026-10-01', available: '500.50' },
];

describe('sortOldestFirst', () => {
  test('ordena por fecha y, en la misma fecha, por la cargada primero', () => {
    expect(sortOldestFirst(BUYS).map((buy) => buy.id)).toEqual([1, 2, 3]);
  });
});

describe('distributeAmount', () => {
  test('cubre de la compra más vieja a la más nueva', () => {
    expect(distributeAmount(BUYS, [1, 2, 3], '2000')).toEqual({ 1: '1000.00', 2: '500.50', 3: '499.50' });
  });

  test('ninguna compra recibe más que su saldo y lo que sobra no se reparte', () => {
    expect(distributeAmount(BUYS, [1, 2], '5000')).toEqual({ 1: '1000.00', 2: '500.50' });
  });

  test('las compras a las que no les alcanza quedan en cero', () => {
    expect(distributeAmount(BUYS, [1, 3], '800')).toEqual({ 1: '800.00', 3: '0.00' });
  });

  test('sin importe todas quedan en cero', () => {
    expect(distributeAmount(BUYS, ['1', '3'], '')).toEqual({ 1: '0.00', 3: '0.00' });
  });

  test('sin compras elegidas no reparte nada', () => {
    expect(distributeAmount(BUYS, [], '1000')).toEqual({});
  });
});

describe('totales', () => {
  test('suma lo aplicado sin errores de redondeo', () => {
    expect(totalApplied({ 1: '0.10', 2: '0.20' })).toBe('0.30');
  });

  test('lo que no se aplica queda a cuenta', () => {
    expect(onAccountAmount({ 1: '1000.00', 2: '500.50' }, '2000')).toBe('499.50');
  });

  test('lo que queda a cuenta nunca es negativo', () => {
    expect(onAccountAmount({ 1: '3000.00' }, '2000')).toBe('0.00');
  });
});

describe('allocationErrors', () => {
  test('marca la compra que recibe más que su saldo', () => {
    expect(allocationErrors(BUYS, { 2: '600' }, '5000').rows).toEqual({ 2: 'Supera el saldo de la compra.' });
  });

  test('marca cuando lo aplicado supera el importe del pago', () => {
    expect(allocationErrors(BUYS, { 1: '1000', 3: '1500' }, '2000').total)
      .toBe('Lo aplicado a las compras supera el importe del pago.');
  });

  test('un reparto válido no tiene errores', () => {
    expect(allocationErrors(BUYS, { 1: '1000', 3: '1000' }, '2000')).toEqual({ rows: {}, total: null });
  });
});

describe('applicationsPayload', () => {
  test('manda las compras con su importe y saltea las que quedaron en cero', () => {
    expect(applicationsPayload({ 1: '1000', 2: '0.00', 3: '499.5' })).toEqual([
      { compra: 1, importe: '1000.00' },
      { compra: 3, importe: '499.50' },
    ]);
  });
});

describe('releasedBuys', () => {
  const CURRENT = [
    { id: 1, importe_aplicado: '200000.00' },
    { id: 2, importe_aplicado: '300000.00' },
  ];

  test('una compra destildada vuelve a deber todo lo que el pago le cubría', () => {
    expect(releasedBuys(CURRENT, { 1: '200000.00', 3: '100000.00' })).toEqual([{ id: 2, released: '300000.00' }]);
  });

  test('una compra a la que se le baja lo aplicado vuelve a deber la diferencia', () => {
    expect(releasedBuys(CURRENT, { 1: '150000.00', 2: '300000.00' })).toEqual([{ id: 1, released: '50000.00' }]);
  });

  test('sin compras que pierdan cobertura no devuelve nada (subir lo aplicado o sumar compras no cuenta)', () => {
    expect(releasedBuys(CURRENT, { 1: '250000.00', 2: '300000.00', 3: '10.00' })).toEqual([]);
  });
});
