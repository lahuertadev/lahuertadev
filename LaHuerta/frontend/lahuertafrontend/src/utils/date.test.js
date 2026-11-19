import { addDays, formatDate } from './date';

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

describe('addDays', () => {
  test('suma días corridos dentro del mes', () => {
    expect(addDays('2026-11-01', 30)).toBe('2026-12-01');
  });

  test('cruza febrero sin casos especiales', () => {
    expect(addDays('2026-01-30', 30)).toBe('2026-03-01');
    expect(addDays('2026-02-15', 30)).toBe('2026-03-17');
    expect(addDays('2028-01-30', 30)).toBe('2028-02-29');
  });

  test('cruza el año', () => {
    expect(addDays('2026-12-15', 30)).toBe('2027-01-14');
  });

  test('sin fecha devuelve null', () => {
    expect(addDays(null, 30)).toBeNull();
  });
});
