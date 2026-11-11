import React from 'react';
import BackButton from '../../../components/BackButton';

/**
 * Encabezado de las pantallas de carga de compras: "COMPRAS" + título + subtítulo, y Volver.
 * En desktop, Volver va arriba a la derecha (como "Nuevo pago" y el resto de los formularios);
 * en mobile queda compacto arriba del título.
 *
 * Props:
 *   title    — título principal
 *   subtitle — texto descriptivo debajo del título (opcional)
 *   onBack   — acción del botón Volver
 */
const BuyPageHeader = ({ title, subtitle, onBack }) => (
  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-6">
    <div className="self-start shrink-0 sm:order-last">
      <BackButton onClick={onBack} className="px-3 py-1.5 text-sm sm:px-5 sm:py-2.5" />
    </div>

    <div>
      <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-accent">Compras</p>
      <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-on-surface-muted">{subtitle}</p>}
    </div>
  </div>
);

export default BuyPageHeader;
