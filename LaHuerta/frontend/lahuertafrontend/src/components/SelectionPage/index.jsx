import React from 'react';
import BackButton from '../BackButton';

/**
 * SelectionPage — pantalla de decisión previa a un alta (ej. "Nueva compra": carga simple o masiva).
 * Contenedor + encabezado (sección, título, subtítulo) + las opciones (children) + Volver.
 *
 * Volver: en desktop arriba a la derecha, como en los formularios; en mobile abajo de las opciones
 * y a lo ancho, así lo primero que se ve son las opciones.
 *
 * Props:
 *   section  — texto chico sobre el título (ej. 'Compras')
 *   title    — título principal
 *   subtitle — pregunta o texto descriptivo debajo del título
 *   onBack   — acción del botón Volver
 *   children — las opciones (normalmente una grilla de AccessCard)
 */
const SelectionPage = ({ section, title, subtitle, onBack, children }) => (
  <div className="container mx-auto py-6 px-4 sm:px-6 bg-surface-card rounded shadow-sm border border-border-subtle w-full max-w-7xl">
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-accent">{section}</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-on-surface-muted">{subtitle}</p>}
      </div>
      <div className="hidden sm:block shrink-0">
        <BackButton onClick={onBack} className="px-5 py-2.5 text-sm" />
      </div>
    </div>

    {children}

    <div className="mt-6 sm:hidden">
      <BackButton onClick={onBack} className="w-full px-5 py-2.5 text-sm" />
    </div>
  </div>
);

export default SelectionPage;
