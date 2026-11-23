import { formatDocumentNumber } from './documentNumber';

test('completa con ceros hasta 8 dígitos', () => {
  expect(formatDocumentNumber(70)).toBe('00000070');
  expect(formatDocumentNumber('123456789')).toBe('123456789');
});
