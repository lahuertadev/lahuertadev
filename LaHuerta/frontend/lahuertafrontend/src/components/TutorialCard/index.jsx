import React from 'react';
import SpotlightButton from '../SpotlightButton';
import { TUTORIAL_PENDING, TUTORIAL_STATUS, TUTORIAL_STATUS_LABELS } from '../../constants/tutorials';

const STATUS_CLASS = {
  [TUTORIAL_PENDING]: 'bg-warning/15 text-warning',
  [TUTORIAL_STATUS.completed]: 'bg-success/15 text-success',
  [TUTORIAL_STATUS.started]: 'bg-alert-accent/10 text-alert-accent',
  [TUTORIAL_STATUS.skipped]: 'bg-on-surface-muted/15 text-on-surface-muted',
};

/**
 * Tarjeta de un tutorial guiado con su estado y el botón para empezarlo (o repetirlo si ya lo
 * completó). La usan el botón del birrete y la sección Tutoriales. Todas las tarjetas miden lo mismo:
 * la descripción ocupa siempre 3 líneas (si es más larga se corta y se ve entera al pasar el mouse)
 * y el botón, de ancho fijo, queda abajo.
 *
 * Props:
 *   tutorial — definición (constants/tutorials)
 *   status   — estado guardado para el usuario (TUTORIAL_STATUS) o undefined si nunca lo empezó
 *   onStart  — (key) => void
 */
export default function TutorialCard({ tutorial, status, onStart }) {
  const completed = status === TUTORIAL_STATUS.completed;
  const displayStatus = status || TUTORIAL_PENDING;

  return (
    <li className="flex h-full flex-col gap-2 rounded-xl border border-border-subtle bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-on-surface">{tutorial.title}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${STATUS_CLASS[displayStatus]}`}>
          {TUTORIAL_STATUS_LABELS[displayStatus]}
        </span>
      </div>
      <p className="h-12 line-clamp-3 text-xs leading-4 text-on-surface-muted" title={tutorial.description}>{tutorial.description}</p>
      <SpotlightButton
        variant={completed ? 'outline' : 'primary'}
        onClick={() => onStart(tutorial.key)}
        className="mt-auto w-full px-3 py-1.5 text-sm sm:w-28 sm:self-end"
      >
        {completed ? 'Repetir' : 'Empezar'}
      </SpotlightButton>
    </li>
  );
}
