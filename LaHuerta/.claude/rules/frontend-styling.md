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

## Colores de etiquetas (estados y tipos)
Convención de todo el sistema (DEV-150).
- **Paleta única:** `constants/badgeColors.js` (`BADGE_COLORS`). Un solo tono por color: no puede haber dos azules, dos verdes ni dos rojos distintos. Fondo pastel claro y texto oscuro, igual en los dos temas. Ningún archivo define colores de etiquetas con hex propios: los toma de ahí (`...BADGE_COLORS.blue` en una config, o el componente).
- **Estados:** `components/StatusBadge` con los tres colores base:
  - **Rojo (`danger`):** eliminación, anulación, rechazo o pendiente (ej. "Pago anulado", "Rechazado", "Pendiente").
  - **Amarillo (`warning`):** estado intermedio (ej. "Parcial", "Depositado").
  - **Verde (`success`):** estado resuelto (ej. "Abonado", "Acreditado", "Cobrado").
- **Tipos y otros estados:** `components/Badge` con un color de la paleta (`color="violet"` o la config `{ bg, color }`): tipos de pago, de factura, categorías, roles, y estados que no son ninguno de los tres (ej. "En cartera" y "Emitido" en azul, "Endosado" en violeta).
- Un aviso dentro de una etiqueta de estado lleva un ícono de alerta (ej. "Cheque rechazado").

## Diálogos de eliminar o anular
Convención de todo el sitio (DEV-150). Referencia: `pages/pago_cliente/shared/DeleteClientPaymentMessage.jsx`.
- `AlertDialog` (`components/DialogAlert`) con tono `danger`: borde animado, halo e ícono en rojo; el botón de confirmar es `SpotlightButton` `danger` (rojo translúcido con el efecto de luz). En mobile ocupa el ancho con márgenes y los botones van apilados a lo ancho, la acción arriba.
- El texto se arma con `components/DeleteMessage`:
  - **summary:** una frase con lo esencial (qué se elimina, de quién, el importe) y "No se puede deshacer.";
  - **effects:** las consecuencias, cada una con su ícono, en el recuadro rojo;
  - **note:** opcional, lo que no es una consecuencia (ej. cuándo no se puede eliminar).
- El botón de confirmar dice la acción (ej. "Eliminar pago", "Anular"), no "Confirmar". En `GenericList`: `deleteDialogTitle`, `deleteMessage` y `deleteConfirmLabel`.

## Alertas
Un aviso de que algo requiere atención (cheque rechazado, fecha vencida) usa `components/AlertIcon`: "!" rojo con el detalle en el tooltip, que también es su texto para lectores de pantalla. No usar otros íconos ni colores para esto.
- **Sobre una etiqueta:** adentro, a la derecha del texto (ej. Tipo de pago en Pagos de clientes y Pagos de compras). Así todas las etiquetas de la columna quedan centradas igual.
- **Al lado de un texto o una fecha:** suelto, a la derecha, sin correr el texto: en una columna centrada va con posición absoluta (ej. Depósito en Cheques).
- Si el aviso es un estado que tiene que leerse sin pasar el mouse (ej. "Cheque rechazado" en el detalle de la compra), usar `StatusBadge` con texto.

## Responsive (mobile)
Toda pantalla nueva debe ser usable en el celular (ver DEV-96).
- Diseñar mobile primero y ampliar con el breakpoint `sm:` (y `lg:` si hace falta).
- Nada de scroll horizontal de la página: los contenidos se apilan en una columna en mobile.
- Botones de acción a lo ancho en mobile (`w-full sm:w-auto`).
- Grillas (`components/Grid`): columnas con `align` y `headerAlign: 'center'`; `hiddenOnMobile: true` para las que sobran y `mobileHeaderName` para encabezados largos. En mobile no hay columnas de acciones: el tap en la fila abre el detalle.
- Toasts: usar `responsive` para que en mobile ocupen el ancho con márgenes.

## Botones de formularios (Volver, Cancelar, Confirmar)
Convención de todo formulario de alta/edición (definida en DEV-135; Volver en mobile, DEV-150). Referencia: `pages/pago_cliente/form/ClientPaymentForm.js`.
- **Arriba:** `PageHeader` (`components/PageHeader`): breadcrumbs a la izquierda y Volver a la derecha, separados del contenido con una línea. En mobile Volver no se muestra arriba.
  ```jsx
  <PageHeader
    breadcrumbs={[{ label: 'Inicio', path: '/' }, { label: 'Pagos de Clientes', path: '/client-payment' }, { label: 'Nuevo' }]}
    onBack={() => navigate('/client-payment')}
  />
  ```
- **Abajo:** `FormActions` (`components/FormActions`) con Cancelar, Confirmar y `onBack`. En desktop quedan abajo a la derecha; en mobile apilados a lo ancho de la pantalla: Confirmar arriba, Cancelar y Volver abajo de todo. En formularios Formik usar `confirmType="submit"`.
- Las pantallas que todavía arman el encabezado a mano (`div` con breadcrumbs + `BackButton`) se pasan a `PageHeader` y `onBack` cuando se toquen.
- Cualquier otro botón usa `SpotlightButton` con su variante (`primary` acción principal, `soft` acción principal de un detalle, `outline` secundaria, `cancel` salir sin guardar, `danger` destructiva), no botones inline con colores propios. Así los botones se adaptan solos a los temas y un cambio de estilo se hace en un solo lugar.
- Interruptores Sí/No: `components/Switch`, no checkbox inline ni el `Switch` de MUI.

## Botones de los detalles
Convención de todo el sitio (DEV-150). Referencia: `pages/movimiento_vacio/detail/EmptyMovementDetail.jsx`.
- **Arriba:** `PageHeader` con breadcrumbs y Volver.
- **Abajo, en desktop:** solo Editar, con `components/EditButton` (azul translúcido, no relleno; `label` para "Editar cliente", etc.). No armar el botón a mano: su estilo se cambia solo en ese componente. Eliminar, Anular y los cambios de estado están en la columna Acción del listado.
- **Abajo, en mobile:** el listado no tiene columna de acciones, así que en el detalle van esas acciones (`isMobile`), Editar y Volver abajo de todo, apilados a lo ancho.
- Si una acción no está en el listado, va también en desktop, al lado de Editar.

## Campos obligatorios
Convención definida en DEV-119. Referencia: `pages/cliente/form/ClientForm.js`.
- Todo campo obligatorio lleva un asterisco rojo después del texto del label: `components/RequiredMark` (`<label className={labelCls}>CUIT<RequiredMark /></label>`). No escribir el `*` a mano en el texto.
- El rojo es el token `required` (`text-required`), con contraste AA en los dos temas; no usar `text-red-*` para el asterisco.
- El asterisco es solo visual (`aria-hidden`): el input, select o `BasicDatePicker` (prop `required`) del campo lleva `aria-required="true"` para los lectores de pantalla.
- Se marca según el `validationSchema` del formulario. Si un campo es obligatorio solo en un caso (ej. la lista de precios con el interruptor en Sí, la dirección de entrega), lleva el asterisco cuando aparece o se pide.
- Los interruptores Sí/No y los campos con valor por defecto no llevan asterisco.
