# Compras

## Objetivo
Registrar las compras que La Huerta realiza a sus proveedores, incluyendo los productos adquiridos, cantidades, precios y señas. Cada compra actualiza automáticamente la cuenta corriente del proveedor.

## Alcance
- Crear, editar y eliminar compras.
- Listar compras con filtros por proveedor, importe y rango de fechas.
- Cada compra tiene uno o más ítems (productos) con cantidad, precio por bulto y precio unitario.
- El importe final se calcula como: `Σ(cantidad × precio_bulto) - seña`.
- La cuenta corriente del proveedor se ajusta automáticamente al crear, editar o eliminar una compra.

## Flujo de uso
1. El usuario accede a **Compras** desde el menú principal.
2. Ve el listado de compras con número, fecha, proveedor, bultos, seña e importe.
3. Hace clic en **Nueva compra** para abrir el formulario.
4. Selecciona el proveedor (autocomplete), ingresa fecha, bultos y seña (opcional).
5. Agrega productos a la tabla de ítems: selecciona producto, ingresa cantidad, precio por bulto y precio unitario.
6. El formulario calcula el subtotal por ítem y el total general en tiempo real.
7. Confirma. El sistema guarda la compra, actualiza la cuenta corriente del proveedor y redirige al listado.
8. Desde el listado puede editar o eliminar una compra existente.

## Validaciones importantes
- Debe seleccionarse un proveedor.
- La fecha es obligatoria.
- Los bultos deben ser un número entero mayor a 0.
- Al menos un producto es requerido.
- No se puede repetir el mismo producto en una misma compra.
- Cantidad y precio por bulto son obligatorios por ítem.
- El precio unitario es opcional.

## Pantallas involucradas
- `/buy` — Listado de compras
- `/buy/create` — Formulario de nueva compra
- `/buy/edit/:id` — Formulario de edición de compra

## Endpoints involucrados
- `GET /buy/` — Listado con filtros opcionales (`proveedor_id`, `fecha_desde`, `fecha_hasta`, `importe_min`, `importe_max`)
- `POST /buy/` — Crear compra
- `GET /buy/:id/` — Detalle de compra
- `PUT /buy/:id/` — Actualizar compra
- `DELETE /buy/:id/` — Eliminar compra

## Consideraciones
- La cuenta corriente del proveedor (`cuenta_corriente`) se actualiza automáticamente en el backend con cada operación de compra.
- Al editar una compra y cambiar el proveedor, el sistema ajusta el balance de ambos proveedores.
- Al eliminar una compra, el importe se revierte en la cuenta corriente del proveedor.
- El precio unitario no afecta el cálculo del importe total; es un dato informativo para la gestión de precios de venta.
