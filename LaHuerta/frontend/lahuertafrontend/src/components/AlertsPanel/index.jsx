import React from 'react';

/**
 * Panel de alertas genérico: recibe una lista de { key, icon, message } y las
 * renderiza como una tira de avisos. No sabe nada de cumpleaños/aniversarios;
 * quien lo consume arma ese shape a partir de la fuente de datos que use.
 */
export default function AlertsPanel({ alerts = [] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="col-span-full flex flex-col gap-2 rounded-2xl border border-alert-border bg-alert-surface p-3">
      {alerts.map(({ key, icon, message }) => (
        <div key={key} className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-alert-accent/15 text-alert-accent">
            {icon}
          </span>
          <p className="text-sm font-semibold text-on-surface">{message}</p>
        </div>
      ))}
    </div>
  );
}
