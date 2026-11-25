import { getPeriodLabel, getPeriodRange, isCurrentOrFuturePeriod, shiftPeriod } from './reportPeriod';

describe('getPeriodRange', () => {
  it('el día es esa fecha', () => {
    expect(getPeriodRange('dia', '2026-11-25')).toEqual({ from: '2026-11-25', to: '2026-11-25' });
  });

  it('la semana va de lunes a domingo', () => {
    expect(getPeriodRange('semana', '2026-11-25')).toEqual({ from: '2026-11-23', to: '2026-11-29' });
    expect(getPeriodRange('semana', '2026-11-29')).toEqual({ from: '2026-11-23', to: '2026-11-29' });
    expect(getPeriodRange('semana', '2026-11-23')).toEqual({ from: '2026-11-23', to: '2026-11-29' });
  });

  it('la semana puede cruzar de mes y de año', () => {
    expect(getPeriodRange('semana', '2026-12-31')).toEqual({ from: '2026-12-28', to: '2027-01-03' });
  });

  it('el mes va del 1 al último día', () => {
    expect(getPeriodRange('mes', '2026-11-25')).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(getPeriodRange('mes', '2028-02-10')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  it('el año va del 1/1 al 31/12', () => {
    expect(getPeriodRange('anio', '2026-11-25')).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });
});

describe('getPeriodLabel', () => {
  it.each([
    ['dia', '25/11/2026'],
    ['semana', '23/11 – 29/11'],
    ['mes', 'Noviembre 2026'],
    ['anio', '2026'],
  ])('%s → %s', (period, label) => {
    expect(getPeriodLabel(period, '2026-11-25')).toBe(label);
  });
});

describe('shiftPeriod', () => {
  it('mueve un día, una semana, un mes o un año', () => {
    expect(shiftPeriod('dia', '2026-11-01', -1)).toBe('2026-10-31');
    expect(shiftPeriod('semana', '2026-11-25', -1)).toBe('2026-11-18');
    expect(shiftPeriod('mes', '2026-11-25', 1)).toBe('2026-12-01');
    expect(shiftPeriod('anio', '2026-11-25', -1)).toBe('2025-01-01');
  });

  it('del 31/03 un mes atrás es febrero, no marzo', () => {
    expect(getPeriodLabel('mes', shiftPeriod('mes', '2026-03-31', -1))).toBe('Febrero 2026');
  });
});

describe('isCurrentOrFuturePeriod', () => {
  it('el período que incluye hoy es el actual', () => {
    expect(isCurrentOrFuturePeriod('mes', '2026-11-01', '2026-11-25')).toBe(true);
    expect(isCurrentOrFuturePeriod('semana', '2026-11-25', '2026-11-25')).toBe(true);
  });

  it('un período pasado no lo es', () => {
    expect(isCurrentOrFuturePeriod('mes', '2026-10-31', '2026-11-25')).toBe(false);
    expect(isCurrentOrFuturePeriod('dia', '2026-11-24', '2026-11-25')).toBe(false);
  });
});
