import React from 'react';
import RequiredMark from '../RequiredMark';

export const REASON_MAX_LENGTH = 200;

/**
 * Motivo obligatorio de una acción (ej. anular un pago), dentro del diálogo de confirmación.
 *
 * Props:
 *   value, onChange — onChange recibe el texto
 *   label           — default 'Motivo'
 *   placeholder
 */
const ReasonField = ({ value, onChange, label = 'Motivo', placeholder = '' }) => (
  <div className="flex flex-col gap-1 pt-4">
    <label
      htmlFor="action-reason"
      className="block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider mb-1.5"
    >
      {label}<RequiredMark />
    </label>
    <textarea
      id="action-reason"
      aria-required="true"
      rows={2}
      maxLength={REASON_MAX_LENGTH}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full resize-none bg-surface-low px-3 py-2.5 rounded-lg border border-border-subtle text-sm text-on-surface placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-blue-lahuerta/40 focus:ring-blue-lahuerta/10 transition-all"
    />
    <span className="self-end text-xs text-on-surface-muted">{value.length}/{REASON_MAX_LENGTH}</span>
  </div>
);

export default ReasonField;
