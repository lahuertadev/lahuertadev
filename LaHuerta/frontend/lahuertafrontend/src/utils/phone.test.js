import { formatPhone, getMainPhone } from './phone';

test('formatPhone arma el formato 11-1234-5678 mientras se escribe', () => {
  expect(formatPhone('11')).toBe('11');
  expect(formatPhone('115555')).toBe('11-5555');
  expect(formatPhone('1155551234')).toBe('11-5555-1234');
});

test('formatPhone deja sin guiones los números de más de 10 dígitos, sin cortarlos', () => {
  expect(formatPhone('15181912536')).toBe('15181912536');
});

test('formatPhone ignora lo que no es dígito y tolera vacíos', () => {
  expect(formatPhone('11-5555-1234')).toBe('11-5555-1234');
  expect(formatPhone(null)).toBe('');
  expect(formatPhone(undefined)).toBe('');
});

test('getMainPhone devuelve el teléfono del primer contacto', () => {
  expect(getMainPhone([{ numero: '1155551234' }, { numero: '1166667777' }])).toBe('11-5555-1234');
  expect(getMainPhone([])).toBe('');
  expect(getMainPhone(undefined)).toBe('');
});
