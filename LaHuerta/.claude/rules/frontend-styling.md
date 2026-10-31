# Frontend styling

Aplicar esta regla al modificar UI o CSS.

## Principio general
Mantener consistencia visual con el proyecto actual.

## Reglas
- Reutilizar componentes visuales existentes.
- No introducir un sistema de estilos nuevo sin necesidad.
- Mantener coherencia con Material UI + CSS actual del proyecto.
- Usar CSS específico de impresión cuando una pantalla tenga requerimientos de print o PDF.
- Evitar sobrecargar formularios y listados.
- Evitar estilos inline excesivos si dañan legibilidad.

## Qué evitar
- sobreingeniería visual
- crear componentes duplicados
- mezclar demasiados enfoques de estilos en una misma pantalla
- romper consistencia entre pantallas del mismo dominio

## Tema claro / oscuro
Toda pantalla y componente nuevo debe verse bien en los dos temas.
- El tema se maneja con `ThemeModeContext`, que pone la clase `.dark` en `<html>`.
- Usar los **tokens de color** de `index.css` + `tailwind.config.js` (`bg-surface`, `bg-surface-card`, `text-on-surface`, `text-on-surface-muted`, `border-border-subtle`, `text-accent`, `alert-*`, …), no colores fijos (`bg-white`, `text-gray-700`, `#hex`).
- Si hace falta un color nuevo, agregarlo como token: variable CSS en `:root` y en `.dark` (color completo + tripleta `-rgb`) y su entrada en `tailwind.config.js` con `rgb(var(--color-x-rgb) / <alpha-value>)`, así funcionan las opacidades (`bg-x/15`).
- `dark:` de Tailwind solo para ajustes puntuales que un token no resuelve.

## Responsive (mobile)
Toda pantalla nueva debe ser usable en el celular (ver DEV-96).
- Diseñar mobile primero y ampliar con el breakpoint `sm:` (y `lg:` si hace falta).
- Nada de scroll horizontal de la página: los contenidos se apilan en una columna en mobile.
- Botones de acción a lo ancho en mobile (`w-full sm:w-auto`).
- Grillas (`components/Grid`): columnas con `align` y `headerAlign: 'center'`; `hiddenOnMobile: true` para las que sobran y `mobileHeaderName` para encabezados largos. En mobile no hay columnas de acciones: el tap en la fila abre el detalle.
- Toasts: usar `responsive` para que en mobile ocupen el ancho con márgenes.

## Botones de formularios (Volver, Cancelar, Confirmar)
Convención de todo formulario de alta/edición (definida en DEV-135). Referencias: `pages/cliente/form/ClientForm.js`, `pages/lista_precios/form/PriceListForm.js`.
- **Arriba:** breadcrumbs a la izquierda y `BackButton` (`components/BackButton`) a la derecha, separados del contenido con una línea:
  ```jsx
  <div className="flex items-center justify-between gap-4 pb-4 border-b border-border-subtle">
    <nav>…breadcrumbs…</nav>
    <BackButton onClick={() => navigate('/client')} className="shrink-0 px-5 py-2.5 text-sm" />
  </div>
  ```
- **Abajo:** `FormActions` (`components/FormActions`) con Cancelar y Confirmar. En desktop quedan abajo a la derecha; en mobile apilados a lo ancho, con Confirmar arriba. En formularios Formik usar `confirmType="submit"`.
- Cualquier otro botón usa `SpotlightButton` con su variante (`primary` acción principal, `outline` secundaria, `cancel` salir sin guardar, `danger` destructiva), no botones inline con colores propios. Así los botones se adaptan solos a los temas y un cambio de estilo se hace en un solo lugar.
- Interruptores Sí/No: `components/Switch`, no checkbox inline ni el `Switch` de MUI.
