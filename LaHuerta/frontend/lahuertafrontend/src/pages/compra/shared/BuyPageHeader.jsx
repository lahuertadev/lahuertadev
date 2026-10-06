import React from 'react';
import BackButton from '../../../components/BackButton';

/**
 * Encabezado de las pantallas de carga de compras: Volver + "COMPRAS" + título + subtítulo.
 *
 * Props:
 *   title    — título principal
 *   subtitle — texto descriptivo debajo del título (opcional)
 *   onBack   — acción del botón Volver
 */
const BuyPageHeader = ({ title, subtitle, onBack }) => (
  <>
    <BackButton onClick={onBack} />

    <div className="mt-5 mb-6">
      <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-accent">Compras</p>
      <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-on-surface-muted">{subtitle}</p>}
    </div>
  </>
);

export default BuyPageHeader;
