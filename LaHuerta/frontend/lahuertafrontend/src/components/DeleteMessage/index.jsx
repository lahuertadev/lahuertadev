import React from 'react';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

/**
 * DeleteMessage — texto de los diálogos de eliminar o anular (DEV-150): una frase con lo esencial,
 * las consecuencias en un recuadro rojo y una nota aparte si hace falta. Se pasa como `message`
 * de AlertDialog (o como `deleteMessage` de GenericList).
 *
 * Props:
 *   summary — frase corta: qué se elimina y que no se puede deshacer (texto o JSX)
 *   effects — consecuencias: strings o { icon, text } (icon: un ícono de MUI, ej. <PaymentOutlinedIcon sx={{ fontSize: 16 }} />)
 *   note    — opcional: aclaración que no es una consecuencia (ej. cuándo no se puede eliminar)
 */
export default function DeleteMessage({ summary, effects = [], note }) {
  return (
    <div className="space-y-3">
      <p>{summary}</p>
      {effects.length > 0 && (
        <ul className="space-y-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3.5 py-3">
          {effects.map((effect, index) => {
            const { icon, text } = typeof effect === 'string' ? { text: effect } : effect;
            return (
              <li key={index} className="flex gap-2.5">
                <span aria-hidden="true" className="flex shrink-0 pt-0.5 text-red-500 dark:text-red-400">
                  {icon ?? <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-current" />}
                </span>
                <span>{text}</span>
              </li>
            );
          })}
        </ul>
      )}
      {note && (
        <p className="flex gap-2 text-xs text-on-surface-muted">
          <InfoOutlinedIcon aria-hidden="true" sx={{ fontSize: 15 }} className="shrink-0" />
          <span>{note}</span>
        </p>
      )}
    </div>
  );
}
