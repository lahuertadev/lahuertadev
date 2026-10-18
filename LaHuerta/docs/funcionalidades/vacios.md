# Carga y devolución de vacíos

## Objetivo
Mantener sincronizada la cuenta corriente de cada proveedor con los vacíos (cajones, jaulas, bandejas) que le cobra a La Huerta y los que La Huerta le devuelve.

En el mercado, muchos productos se compran dentro de contenedores retornables. El proveedor cobra esos envases (**vacíos**) y, cuando se le devuelven, los descuenta. No siempre se devuelven todos: algunos se pierden o se rompen.

## Alcance
- Registrar **cargas** de vacíos: los vacíos que el proveedor le cobra a La Huerta. Suman su importe a la cuenta corriente del proveedor.
- Registrar **devoluciones** de vacíos: los vacíos que La Huerta le devuelve al proveedor. Restan su importe de la cuenta corriente.
- Listar, ver el detalle, editar y eliminar movimientos.
- Los vacíos son independientes de las compras: no se cargan en la compra ni afectan su importe ni su estado de pago.

No incluye: control de stock de vacíos por proveedor (cuántos quedan pendientes de devolver). Solo se registra lo que efectivamente se cobra o se devuelve.

## Flujo de uso
1. El usuario accede a **Proveedores → Vacíos**.
2. Ve el listado de movimientos con fecha, proveedor, tipo, N° de comprobante, cantidad de vacíos e importe. Puede filtrar por nombre de proveedor (o nombre de fantasía), tipo, importe exacto y rango de fechas.
3. Hace clic en **Nuevo movimiento** y elige **Carga de vacíos** o **Devolución de vacíos**.
4. Se abre el formulario con el tipo ya precargado según lo elegido (se puede cambiar) y completa:
   - proveedor y fecha;
   - N° de comprobante (opcional): el número del vale o factura del proveedor;
   - uno o más renglones con tipo de vacío, cantidad y precio unitario.
5. El formulario calcula el subtotal de cada renglón (cantidad × precio unitario) y el total del movimiento en tiempo real.
6. Confirma. El sistema guarda el movimiento y ajusta la cuenta corriente del proveedor.
7. Desde el detalle puede editar o eliminar el movimiento.

### Ejemplo
- La Huerta compra mercadería con 100 cajones a $4.000 → se registra una **carga** de 100 cajones: la cuenta corriente sube $400.000.
- Más adelante devuelve 70 cajones y el proveedor entrega un vale → se registra una **devolución** de 70 cajones a $4.000 con el N° del vale: la cuenta corriente baja $280.000.
- Los 30 cajones no devueltos quedan como deuda: no hace falta registrar nada más.

## Validaciones importantes
- Proveedor, fecha y tipo son obligatorios.
- El movimiento debe tener al menos un renglón.
- La cantidad debe ser un número entero mayor a 0. El precio unitario no puede ser negativo.
- Un mismo tipo de vacío no puede repetirse dentro de un movimiento (al elegirlo en un renglón desaparece del selector de los demás).
- Solo se ofrecen los tipos de contenedor que requieren vacío (`requiere_vacio`): cajón, jaula, bandeja, etc.

## Impacto en la cuenta corriente
| Operación | Efecto |
|-----------|--------|
| Crear carga | Suma el importe |
| Crear devolución | Resta el importe |
| Editar (renglones o tipo) | Revierte el efecto anterior y aplica el nuevo |
| Editar cambiando el proveedor | Revierte en el proveedor anterior y aplica en el nuevo |
| Eliminar | Revierte el efecto del movimiento |

## Pantallas involucradas
- Listado: `/empty-movement`
- Selección del tipo: `/empty-movement/create`
- Alta de carga: `/empty-movement/create/load`
- Alta de devolución: `/empty-movement/create/return`
- Edición: `/empty-movement/edit/:id`
- Detalle: `/empty-movement/detail/:id`
- Formularios de compra: muestran un aviso fijo de que los vacíos se cargan aparte.

## Endpoints
- `GET /empty-movement/` — listado. Filtros: `proveedor` (búsqueda parcial por nombre o nombre de fantasía, sin distinguir mayúsculas), `tipo` (`CARGA` | `DEVOLUCION`), `importe` (coincidencia exacta), `fecha_desde`, `fecha_hasta`.
- `POST /empty-movement/` — alta: `{ proveedor, fecha, tipo, nro_comprobante?, contenedores: [{ tipo_contenedor, cantidad, precio_unitario }] }`. El importe lo calcula el backend.
- `GET /empty-movement/:id/` — detalle con renglones y subtotal por renglón.
- `PUT /empty-movement/:id/` — reemplazo completo: exige los mismos campos que el alta (lo que no se envía, como `nro_comprobante`, queda vacío). Es lo que usa el formulario de edición.
- `PATCH /empty-movement/:id/` — edición parcial: solo cambia los campos enviados. Si se envían `contenedores`, se reemplazan y se recalcula el importe.
- `DELETE /empty-movement/:id/` — eliminación.

## Consideraciones
- Modelo: `MovimientoVacio` (el vale: proveedor, fecha, tipo, N° de comprobante, importe) y `MovimientoVacioContenedor` (los renglones: tipo de contenedor, cantidad, precio unitario). La tabla de renglones resuelve la relación N:N entre movimientos y tipos de contenedor.
- Antes, los vacíos se cargaban dentro de la compra (`compra_vacio`) sin afectar la cuenta corriente. Esa tabla se eliminó y sus registros no se migraron, porque nunca habían impactado en la cuenta corriente.
- Los tipos de movimiento se definen en un solo lugar por capa: el enum `EmptyMovementType` (`movimiento_vacio/enums.py`) en el backend y `constants/emptyMovementTypes.js` en el frontend. Para agregar un tipo nuevo se suma en ambos (valor, etiqueta y efecto en la cuenta corriente en `EmptyMovementService._balance_effect`); la selección, las rutas, el filtro y los badges se arman a partir de esa constante.
- El listado no permite eliminar varios movimientos a la vez, para evitar ajustes simultáneos sobre la cuenta corriente de un mismo proveedor.
