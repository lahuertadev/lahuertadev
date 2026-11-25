import React from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  REPORT_PERIODS, getPeriodLabel, isCurrentOrFuturePeriod, shiftPeriod,
} from '../../utils/reportPeriod';

// Mismo alto (2.75rem) que el buscador de cliente; fondo y borde como el botón Filtros de los listados.
// La opción elegida como la solapa activa de los listados (Vigentes / Anulados).
const boxCls = 'flex h-11 items-stretch overflow-hidden rounded-lg border border-border-subtle bg-surface-card';
const arrowCls = 'flex w-10 shrink-0 items-center justify-center text-on-surface hover:bg-accent/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-default';

/**
 * PeriodNavigator — elige el período del reporte: Día / Semana / Mes / Año y, con las flechas,
 * el anterior o el siguiente ("‹ Noviembre 2026 ›"). No deja avanzar más allá del período de hoy.
 *
 * Props:
 *   period   — 'dia' | 'semana' | 'mes' | 'anio'
 *   date     — una fecha del período (YYYY-MM-DD)
 *   today    — hoy (YYYY-MM-DD)
 *   onChange — ({ period, date }) => void
 */
export default function PeriodNavigator({ period, date, today, onChange }) {
  const isCurrent = isCurrentOrFuturePeriod(period, date, today);

  // Al cambiar el tipo de período arranca en el de hoy.
  const changePeriod = (value) => onChange({ period: value, date: today });
  const move = (step) => {
    const next = shiftPeriod(period, date, step);
    onChange({ period, date: next > today ? today : next });
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className={boxCls} role="group" aria-label="Tipo de período">
        {REPORT_PERIODS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={value === period}
            onClick={() => changePeriod(value)}
            className={`flex-1 px-2 text-sm border-l border-border-subtle first:border-l-0 transition-colors ${
              value === period ? 'bg-accent/10 font-semibold text-accent' : 'font-medium text-on-surface-muted hover:text-on-surface'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={boxCls}>
        <button type="button" className={arrowCls} onClick={() => move(-1)} aria-label="Período anterior">
          <ChevronLeftIcon fontSize="small" />
        </button>
        <span className="flex flex-1 items-center justify-center truncate text-sm font-semibold text-on-surface" aria-live="polite">
          {getPeriodLabel(period, date)}
        </span>
        <button type="button" className={arrowCls} onClick={() => move(1)} disabled={isCurrent} aria-label="Período siguiente">
          <ChevronRightIcon fontSize="small" />
        </button>
      </div>
    </div>
  );
}
