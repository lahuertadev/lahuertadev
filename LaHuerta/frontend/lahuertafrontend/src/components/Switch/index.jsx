import React from 'react';

/**
 * Switch — interruptor Sí/No. Azul cuando está encendido y rojo suave cuando está apagado.
 *
 * Props:
 *   checked   — bool
 *   onChange  — (checked: bool) => void
 *   disabled  — bool (default false)
 *   ariaLabel — texto para lectores de pantalla
 */
export default function Switch({ checked, onChange, disabled = false, ariaLabel }) {
  return (
    <label className={`relative inline-flex items-center shrink-0 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={ariaLabel}
        className="sr-only peer"
      />
      <div className="w-11 h-6 rounded-full bg-red-500/50 transition-colors peer-checked:bg-blue-lahuerta peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full" />
    </label>
  );
}
