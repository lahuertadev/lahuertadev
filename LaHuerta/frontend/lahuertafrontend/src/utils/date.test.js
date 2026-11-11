import { formatDate } from './date';

test('formatDate muestra la fecha como dd-mm-aaaa por defecto', () => {
  expect(formatDate('2026-11-05')).toBe('05-11-2026');
  expect(formatDate('2026-11-05T10:30:00Z')).toBe('05-11-2026');
});

test('formatDate usa el separador indicado', () => {
  expect(formatDate('2026-11-05', '/')).toBe('05/11/2026');
});

test('formatDate devuelve null sin fecha', () => {
  expect(formatDate(null)).toBeNull();
});
