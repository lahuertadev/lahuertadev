import React from 'react';

/**
 * Panel de alertas genérico: recibe una lista de { key, icon, title?, message } y las
 * renderiza como una tira de avisos. No sabe nada de cumpleaños/aniversarios;
 * quien lo consume arma ese shape a partir de la fuente de datos que use.
 * Cada aviso se apila como las tarjetas del Inicio: ícono, título y mensaje.
 */
export default function AlertsPanel({ alerts = [] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="col-span-full flex flex-col divide-y divide-alert-border rounded-2xl border border-alert-border bg-alert-surface px-3 py-1">
      {alerts.map(({ key, icon, title, message }) => (
        <div key={key} className="flex flex-col gap-2 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-alert-accent/15 text-alert-accent">
            {icon}
          </span>
          <div className="min-w-0">
            {title && <p className="text-sm font-bold text-on-surface">{title}</p>}
            <p className={`text-sm ${title ? 'text-on-surface-muted' : 'font-semibold text-on-surface'}`}>{message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
