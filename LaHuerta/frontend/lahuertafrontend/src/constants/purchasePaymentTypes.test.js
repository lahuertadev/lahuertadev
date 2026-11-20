import { droppedChecksNotice, hasFallenCheck, purchaseCountLabel } from './purchasePaymentTypes';

describe('droppedChecksNotice', () => {
  test('sin cheques rechazados ni anulados no avisa', () => {
    expect(droppedChecksNotice({ cheques: [{ estado: 'ENDOSADO' }], cheques_propios: [{ estado: 'EMITIDO' }] })).toBeNull();
    expect(droppedChecksNotice({})).toBeNull();
  });

  test('avisa un cheque de cliente o emitido rechazado', () => {
    expect(droppedChecksNotice({ cheques: [{ estado: 'RECHAZADO' }] })).toMatch(/^Un cheque de este pago fue rechazado:/);
    expect(droppedChecksNotice({ cheques_propios: [{ estado: 'RECHAZADO' }] })).toMatch(/^Un cheque de este pago fue rechazado:/);
  });

  test('avisa un cheque emitido anulado', () => {
    expect(droppedChecksNotice({ cheques_propios: [{ estado: 'ANULADO' }] })).toMatch(/^Un cheque de este pago fue anulado:/);
  });

  test('con cheques rechazados y anulados avisa los dos', () => {
    expect(droppedChecksNotice({ cheques: [{ estado: 'RECHAZADO' }], cheques_propios: [{ estado: 'ANULADO' }] }))
      .toMatch(/^Este pago tiene cheques rechazados y anulados:/);
  });
});

describe('purchaseCountLabel', () => {
  test('una compra en singular y varias en plural', () => {
    expect(purchaseCountLabel(1)).toBe('1 compra');
    expect(purchaseCountLabel(3)).toBe('3 compras');
  });
});

describe('hasFallenCheck', () => {
  test('vigente con un cheque caído, le aplique o no algo a la compra', () => {
    expect(hasFallenCheck({ estado_pago: 'VIGENTE', fallen_check: 'RECHAZADO', importe_aplicado: '0.00' })).toBe(true);
    expect(hasFallenCheck({ estado_pago: 'VIGENTE', fallen_check: 'RECHAZADO', importe_aplicado: '10.00' })).toBe(true);
  });

  test('no aplica si no se cayó un cheque o si el pago está anulado', () => {
    expect(hasFallenCheck({ estado_pago: 'VIGENTE', fallen_check: null })).toBe(false);
    expect(hasFallenCheck({ estado_pago: 'ANULADO', fallen_check: 'RECHAZADO' })).toBe(false);
  });
});
