import { cancelClientPaymentEffects } from './CancelClientPaymentMessage';

const texts = (payment) => cancelClientPaymentEffects(payment).map((effect) => effect.text);

test('sin cheques solo avisa que sube la deuda del cliente', () => {
  expect(texts({ importe: '1500.00', cheques: [] })).toEqual([expect.stringMatching(/^La deuda del cliente sube \$/)]);
});

test('con un cheque avisa que queda anulado', () => {
  expect(texts({ importe: '1500.00', cheques: [{ numero: 171717, estado: 'EN_CARTERA' }] }))
    .toContain('El cheque N° 171717 queda anulado: sale de la cartera y se conserva como registro.');
});

test('con varios cheques los nombra a todos y aparte avisa de los rechazados', () => {
  const result = texts({
    importe: '3000.00',
    cheques: [
      { numero: 111, estado: 'EN_CARTERA' },
      { numero: 222, estado: 'DEPOSITADO' },
      { numero: 333, estado: 'RECHAZADO' },
    ],
  });

  expect(result).toContain('Los cheques N° 111, N° 222 quedan anulados: salen de la cartera y se conservan como registro.');
  expect(result).toContain('Los cheques rechazados siguen así: su importe ya volvió a la cuenta corriente.');
});
