import React from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../BackButton';

/**
 * PageHeader — encabezado de formularios y detalles: breadcrumbs a la izquierda y Volver a la derecha,
 * separados del contenido con una línea.
 * En mobile Volver no va arriba: va abajo con los demás botones (FormActions con onBack), a lo ancho.
 *
 * Props:
 *   breadcrumbs — [{ label, path }]; el último es la pantalla actual (sin path)
 *   onBack      — acción de Volver
 */
export default function PageHeader({ breadcrumbs, onBack }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-between gap-4 pb-4 border-b border-border-subtle">
      <nav className="flex items-center flex-wrap gap-2 text-sm font-medium text-on-surface-muted">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <React.Fragment key={crumb.label}>
              {index > 0 && <span className="text-xs">›</span>}
              {isLast ? (
                <span className="text-on-surface font-semibold">{crumb.label}</span>
              ) : (
                <span
                  className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors"
                  onClick={() => navigate(crumb.path)}
                >
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </nav>
      <div className="hidden sm:block shrink-0">
        <BackButton onClick={onBack} className="px-5 py-2.5 text-sm" />
      </div>
    </div>
  );
}
