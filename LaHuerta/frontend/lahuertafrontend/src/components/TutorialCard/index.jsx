import React from 'react';
import SpotlightButton from '../SpotlightButton';
import { TUTORIAL_STATUS, TUTORIAL_STATUS_LABELS } from '../../constants/tutorials';

const STATUS_CLASS = {
  [TUTORIAL_STATUS.completed]: 'bg-accent/10 text-accent',
  [TUTORIAL_STATUS.started]: 'bg-alert-accent/10 text-alert-accent',
  [TUTORIAL_STATUS.skipped]: 'bg-surface-low text-on-surface-muted',
};

/**
 * Tarjeta de un tutorial guiado con su estado y el botón para empezarlo (o repetirlo si ya lo
 * completó). La usan el botón del birrete y la sección Tutoriales.
 *
 * Props:
 *   tutorial — definición (constants/tutorials)
 *   status   — estado guardado para el usuario (TUTORIAL_STATUS) o undefined si nunca lo empezó
 *   onStart  — (key) => void
 */
export default function TutorialCard({ tutorial, status, onStart }) {
  const completed = status === TUTORIAL_STATUS.completed;

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-on-surface">{tutorial.title}</p>
        {status && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${STATUS_CLASS[status]}`}>
            {TUTORIAL_STATUS_LABELS[status]}
          </span>
        )}
      </div>
      <p className="text-xs text-on-surface-muted">{tutorial.description}</p>
      <SpotlightButton
        variant={completed ? 'outline' : 'primary'}
        onClick={() => onStart(tutorial.key)}
        className="w-full px-3 py-1.5 text-sm sm:w-auto sm:self-end"
      >
        {completed ? 'Repetir' : 'Empezar'}
      </SpotlightButton>
    </li>
  );
}
