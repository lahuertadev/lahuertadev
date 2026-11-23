import React from 'react';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CountUp from '../CountUp';

/**
 * CardListFooter — pie de una lista de CollapsibleCard: "Agregar ..." a la izquierda y el total a la derecha.
 *
 * Props:
 *   addLabel    — texto del botón (ej. "Agregar cheque")
 *   onAdd       — al tocar Agregar; sin él no hay botón (ej. no quedan cheques para elegir)
 *   addDataTour — data-tour del botón, para el tutorial
 *   totalLabel  — texto del total (ej. "TOTAL DEL PAGO")
 *   total       — importe total
 *   className   — clases extra (margen)
 */
export default function CardListFooter({ addLabel, onAdd, addDataTour, totalLabel, total, className = 'pt-1' }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      {onAdd ? (
        <button
          type="button"
          onClick={onAdd}
          data-tour={addDataTour}
          className="flex items-center gap-1 bg-transparent border-none text-blue-lahuerta text-sm font-medium cursor-pointer hover:underline hover:underline-offset-2 focus:outline-none"
          style={{ background: 'transparent', boxShadow: 'none' }}
        >
          <AddCircleOutlineIcon fontSize="small" /> {addLabel}
        </button>
      ) : <span />}

      <div className="text-right">
        <span className="text-on-surface-muted text-sm mr-4">{totalLabel}</span>
        <CountUp value={total} className="text-xl font-bold text-on-surface" />
      </div>
    </div>
  );
}
