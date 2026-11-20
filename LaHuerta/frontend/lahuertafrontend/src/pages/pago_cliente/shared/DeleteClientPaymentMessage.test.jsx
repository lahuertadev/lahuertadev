import { deleteClientPaymentEffects } from './DeleteClientPaymentMessage';

const texts = (payment) => deleteClientPaymentEffects(payment).map((effect) => effect.text);

test('sin cheque solo avisa que sube la deuda del cliente', () => {
  expect(texts({ importe: '1500.00', cheque: null })).toEqual([expect.stringMatching(/^La deuda del cliente sube \$/)]);
});

test('con cheque avisa además que se elimina el cheque', () => {
  expect(texts({ importe: '1500.00', cheque: { numero: 171717 } })).toContain('Se elimina el cheque N° 171717.');
});
