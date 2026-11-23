import React, { useCallback, useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/DeleteOutline';

/**
 * Qué tarjetas de una lista están compactas, por su key.
 *   isCollapsed(key), toggle(key), collapseOnly(keys) (compacta esas y expande el resto),
 *   expand(keys) (ej. las que tienen errores, para que no queden ocultos).
 */
export const useCollapsedKeys = () => {
  const [collapsedKeys, setCollapsedKeys] = useState([]);

  const isCollapsed = useCallback((key) => collapsedKeys.includes(key), [collapsedKeys]);
  const toggle = useCallback(
    (key) => setCollapsedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key])),
    [],
  );
  const collapseOnly = useCallback((keys) => setCollapsedKeys(keys), []);
  const expand = useCallback((keys) => setCollapsedKeys((prev) => prev.filter((key) => !keys.includes(key))), []);

  return { isCollapsed, toggle, collapseOnly, expand };
};

/**
 * CollapsibleCard — tarjeta de una lista que se carga de a varios (cheques de un pago, proveedores de la
 * carga masiva de compras): encabezado con la posición, el título, el importe, compactar/expandir y quitar.
 *
 * Props:
 *   position    — número que se muestra en el círculo (1, 2, ...)
 *   title       — texto principal; si falta se muestra `placeholder`
 *   subtitle    — línea secundaria debajo del título
 *   placeholder — texto cuando todavía no hay título (ej. "Elegí un cheque")
 *   amount      — importe a la derecha (texto o un CountUp)
 *   adornment   — algo antes del importe (ej. LockedIcon)
 *   itemLabel   — qué es cada tarjeta, para los botones ("cheque" → "Expandir cheque", "Quitar cheque")
 *   collapsed   — si está compacta
 *   onToggle    — compactar/expandir; sin él no hay botón y la tarjeta no se abre
 *   onRemove    — quitar; sin él no hay botón
 *   hasError    — borde rojo
 *   children    — contenido que se compacta
 */
export default function CollapsibleCard({
  position, title, subtitle, placeholder, amount, adornment, itemLabel,
  collapsed, onToggle, onRemove, hasError = false, children,
}) {
  return (
    <div className={`rounded-xl border bg-surface-card overflow-hidden ${hasError ? 'border-red-500/50' : 'border-border-subtle'}`}>
      <div className={`flex items-center gap-3 px-3 sm:px-4 py-3 bg-surface-low/60 ${collapsed ? '' : 'border-b border-border-subtle'}`}>
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">
          {position}
        </span>

        <div className="min-w-0 flex-1">
          {title ? (
            <>
              <p className="truncate font-semibold text-on-surface">{title}</p>
              {subtitle && <p className="truncate text-xs text-on-surface-muted">{subtitle}</p>}
            </>
          ) : (
            <p className="text-sm text-on-surface-muted">{placeholder}</p>
          )}
        </div>

        {adornment}

        <span className="flex-shrink-0 font-bold text-on-surface">{amount}</span>

        {onToggle && (
          <IconButton
            size="small"
            onClick={onToggle}
            aria-label={collapsed ? `Expandir ${itemLabel}` : `Compactar ${itemLabel}`}
            aria-expanded={!collapsed}
            sx={{ color: 'var(--color-on-surface-muted)' }}
          >
            <ExpandMoreIcon
              fontSize="small"
              sx={{ transition: 'transform 200ms', transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}
            />
          </IconButton>
        )}

        {onRemove && (
          <IconButton size="small" onClick={onRemove} color="error" aria-label={`Quitar ${itemLabel}`}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </div>

      <Collapse in={!collapsed} timeout={200}>
        {children}
      </Collapse>
    </div>
  );
}
