// Períodos del reporte de cliente. Las fechas son YYYY-MM-DD; el rango es el mismo que calcula el backend
// (reporte/service.py): la semana va de lunes a domingo, el mes del 1 al último día, el año del 1/1 al 31/12.

export const REPORT_PERIODS = [
  { value: 'dia', label: 'Día' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'anio', label: 'Año' },
];

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// En UTC, para que el horario de verano no corra el día.
const toDate = (isoDate) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};
const toIso = (date) => date.toISOString().slice(0, 10);
const dayMonth = (date) => `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

//* Primer y último día del período que contiene la fecha: { from, to } en YYYY-MM-DD.
export const getPeriodRange = (period, isoDate) => {
  const date = toDate(isoDate);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  if (period === 'semana') {
    const monday = new Date(Date.UTC(year, month, date.getUTCDate() - ((date.getUTCDay() + 6) % 7)));
    const sunday = new Date(Date.UTC(year, month, monday.getUTCDate() + 6));
    return { from: toIso(monday), to: toIso(sunday) };
  }
  if (period === 'mes') {
    return { from: toIso(new Date(Date.UTC(year, month, 1))), to: toIso(new Date(Date.UTC(year, month + 1, 0))) };
  }
  if (period === 'anio') {
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }
  return { from: isoDate, to: isoDate };
};

//* Cómo se lee el período: "25/11/2026", "23/11 – 29/11", "Noviembre 2026", "2026".
export const getPeriodLabel = (period, isoDate) => {
  const date = toDate(isoDate);
  if (period === 'semana') {
    const { from, to } = getPeriodRange(period, isoDate);
    return `${dayMonth(toDate(from))} – ${dayMonth(toDate(to))}`;
  }
  if (period === 'mes') return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  if (period === 'anio') return String(date.getUTCFullYear());
  return `${dayMonth(date)}/${date.getUTCFullYear()}`;
};

//* Una fecha del período anterior (step -1) o siguiente (step 1). En el mes va al día 1 para que
//* del 31/03 no salte a mayo.
export const shiftPeriod = (period, isoDate, step) => {
  const date = toDate(isoDate);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  if (period === 'semana') return toIso(new Date(Date.UTC(year, month, day + 7 * step)));
  if (period === 'mes') return toIso(new Date(Date.UTC(year, month + step, 1)));
  if (period === 'anio') return toIso(new Date(Date.UTC(year + step, 0, 1)));
  return toIso(new Date(Date.UTC(year, month, day + step)));
};

//* Si el período ya incluye hoy: no se puede avanzar a uno futuro.
export const isCurrentOrFuturePeriod = (period, isoDate, today) => getPeriodRange(period, isoDate).to >= today;
