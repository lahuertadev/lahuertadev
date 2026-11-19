# Cheques Propios

## Objetivo
Gestionar los cheques emitidos por La Huerta para el pago de compras a proveedores. Permite registrar, editar, eliminar, cobrar, anular y registrar el rechazo de cheques propios, y usarlos como medio de pago al abonar compras.

## Alcance
- Crear, editar y eliminar cheques propios en estado EMITIDO.
- Listar cheques con filtros por banco y estado.
- Usar un cheque propio como medio de pago al registrar pagos a proveedores: pagos de compras y pagos a cuenta (ver `pagos-compras.md`).
- Igual que un cheque de cliente, un cheque emitido se usa **entero y en un solo pago** (DEV-150). Un pago puede cubrir varias compras y lo que sobra queda a cuenta, así que no hace falta repartir el cheque entre pagos.
- Si se anula el pago donde estaba, el cheque queda libre de nuevo, también para otro proveedor.
- Cobrar un cheque (transición EMITIDO → COBRADO).
- Anular un cheque (transición EMITIDO → ANULADO), con reversión completa de los efectos sobre pagos, facturas y cuenta corriente del proveedor.
- Registrar que el banco rechazó un cheque (transición EMITIDO o COBRADO → RECHAZADO), con el mismo efecto que el rechazo de un cheque de cliente endosado (DEV-150).

## Estados del cheque

| Estado   | Descripción |
|----------|-------------|
| EMITIDO  | Cheque creado y disponible para ser usado como medio de pago |
| COBRADO  | Cheque debitado de la cuenta bancaria. Estado final, no reversible |
| ANULADO  | Cheque anulado. Estado final, no reversible |
| RECHAZADO | Cheque rechazado por el banco. Estado final, no reversible |

Solo los cheques en estado **EMITIDO** pueden editarse, eliminarse, cobrarse o anularse. El rechazo se registra desde **EMITIDO** o **COBRADO** (por si se marcó cobrado antes de que el banco lo rechace).

## Fecha de depósito (cheques diferidos)

Los cheques emitidos por La Huerta suelen entregarse al proveedor antes de que puedan cobrarse (cheques diferidos, comunes a 30/60/90 días). El campo **fecha de depósito** (`fecha_deposito`) registra desde cuándo el proveedor puede efectivamente depositar el cheque.

- Es un campo **opcional**: puede dejarse vacío si el cheque no es diferido o si aún no se acordó la fecha. En ese caso, el cheque se considera a la vista y no tiene restricción para cobrarse.
- Se ingresa y edita en el formulario de creación/edición, y se muestra en el detalle entre la fecha de emisión y la fecha de vencimiento.
- Si está cargada, condiciona cuándo el cheque puede marcarse como COBRADO (ver "Cobrar un cheque" más abajo).
- En el listado de Cheques emitidos, la acción Cobrar se destaca con un círculo verde que aparece y se va (el color del estado Cobrado) cuando el cheque está EMITIDO, está en un pago y su fecha de depósito es hoy o anterior; el tooltip dice "Cobrar: la fecha de depósito ya llegó". Es el mismo aviso que Depositar en Cheques de clientes, que va en ámbar. Sin fecha de depósito no se destaca. La fecha se compara con el día local (DEV-150).
- El detalle y el listado muestran un indicador visual:
  - Si la fecha de depósito es **futura** y el cheque sigue EMITIDO, se marca como "todavía en espera".
  - Si la fecha de depósito **ya llegó o pasó** y el cheque sigue EMITIDO, se marca como "disponible" para depositar/cobrar.
- El naming (`fecha_deposito`) se alinea con el campo homónimo del modelo `Cheque` (cheques recibidos de clientes, app `cheque`), que ya cumple el mismo rol para esa entidad.

## Flujo de uso

### Crear un cheque propio
1. Acceder a **Cheques emitidos** desde el menú.
2. Hacer clic en **Nuevo cheque**.
3. Ingresar número de cheque, banco, importe, fecha de emisión, fecha de depósito (opcional) y fecha de vencimiento.
   Al cargar la fecha de depósito, la fecha de vencimiento se completa sola con 30 días corridos (plazo de presentación de un cheque diferido, Ley de Cheques 24.452, art. 25). Los meses cortos no son un caso especial: un depósito del 30-01 vence el 01-03. Se puede cambiar a mano; si se vuelve a cambiar la fecha de depósito, se recalcula. Si se borra la fecha de depósito, el vencimiento queda como estaba (DEV-150).
4. Confirmar. El cheque queda en estado EMITIDO.

### Usar un cheque como medio de pago
1. Acceder a **Pagos de Compras** → **Nuevo pago**.
2. Seleccionar el proveedor.
3. En "Tipo de pago" seleccionar **Cheque Propio**.
4. El sistema carga los cheques disponibles: en estado EMITIDO y sin un pago vigente.
5. Seleccionar uno o más cheques ("Agregar cheque" suma otro). Cada cheque se usa entero y el importe del pago es la suma.
6. Tildar las compras que cubre el pago: el importe se reparte de la más vieja a la más nueva (ver `pagos-compras.md`). Lo que no se aplica a ninguna compra queda a cuenta.
7. Confirmar. El pago queda registrado y la cuenta corriente del proveedor se actualiza. Cada compra cubierta pasa a PARCIAL o ABONADO según lo que se le aplicó.

### Ver el detalle de un cheque
La sección **Proveedor y pagos** del detalle muestra:
- el proveedor al que se entregó el cheque (puesto y nombre): el del pago vigente donde está. Si sus pagos están anulados, no tiene proveedor;
- los pagos hechos con el cheque, ordenados por fecha: tipo (pago de compras o pago a cuenta), las compras que cubre el pago (con enlace a cada una; pueden ser varias) o "A cuenta", y el importe. En desktop es una tabla y en mobile una tarjeta por pago; tocar un pago abre su detalle.

Si el cheque todavía no se usó, la sección avisa que no está asociado a ningún pago.

### Cobrar un cheque
1. Desde el detalle de un cheque EMITIDO, hacer clic en **Cobrar**.
   - El botón aparece deshabilitado (con explicación al pasar el mouse) si el cheque tiene fecha de depósito cargada y todavía no llegó.
2. El sistema valida, en este orden: que el cheque esté EMITIDO, que tenga al menos un pago asociado, y que la fecha de depósito (si tiene) ya se haya cumplido.
3. El estado pasa a COBRADO. No tiene efectos sobre pagos ni cuenta corriente.

### Anular un cheque
1. Desde el listado de cheques, hacer clic en **Anular** en un cheque EMITIDO.
2. El sistema muestra un diálogo de confirmación.
   - Si el cheque **no tiene pagos asociados**: advierte que el registro quedará pero no podrá editarse ni eliminarse.
   - Si el cheque **tiene pagos asociados** (de compras o a cuenta): advierte que se descontará de esos pagos lo pagado con este cheque, la cuenta corriente del proveedor será restaurada, las compras pagadas volverán a su estado anterior y los pagos no se eliminan.
3. Al confirmar, el sistema ejecuta en una transacción atómica:
   - Por cada pago en que se usó el cheque, devuelve a la cuenta corriente del proveedor lo que se pagó con este cheque.
   - Cada pago baja su importe en esa parte, descontada de sus compras de la más nueva a la más vieja; esas compras vuelven a PARCIAL o PENDIENTE. Si las compras no alcanzan, el resto sale de lo que el pago tenía a cuenta.
   - El pago **no se elimina**, aunque quede en cero: el cheque anulado queda en él como registro, igual que un cheque rechazado. En el listado de pagos lo marca el ícono rojo y el detalle del pago lo avisa.
   - Marca el cheque como ANULADO.

### Registrar el rechazo de un cheque
1. Desde el detalle de un cheque EMITIDO o COBRADO con pagos, tocar **Rechazado por el banco**.
2. El sistema muestra un diálogo de confirmación que explica el efecto.
3. Al confirmar, el sistema ejecuta en una transacción atómica:
   - Por cada pago en que se usó el cheque, devuelve a la cuenta corriente del proveedor lo que se pagó con este cheque.
   - Cada pago baja su importe en esa parte, descontada de sus compras de la más nueva a la más vieja; esas compras vuelven a PARCIAL o PENDIENTE.
   - El pago **no se elimina**, aunque quede en cero: el cheque rechazado queda en él como registro (igual que en la anulación).
   - Marca el cheque como RECHAZADO.

## Reglas de negocio

- **Un cheque, un pago**: un cheque emitido se usa entero en un solo pago vigente. Un cheque que ya está en un pago vigente no se ofrece ni se acepta en otro (`OwnCheckNotAvailableException`).
- **Varios cheques en un pago**: un pago puede usar varios cheques emitidos, cada uno entero. Igual que con los cheques de clientes, el pago en el que está usado hoy un cheque lo indica `cheque_propio.pago_compra` (se vacía al anular el pago), y `pago_compra_cheque_propio` es el historial: guarda cada pago en que se usó, también los anulados, con el importe que valía el cheque.
- **No se puede cobrar un cheque sin pagos**: un cheque debe tener al menos un pago asociado para poder marcarse como COBRADO.
- **No se puede rechazar un cheque sin pagos**: el rechazo solo tiene sentido para un cheque entregado a un proveedor.
- **No se puede cobrar antes de la fecha de depósito**: si el cheque tiene fecha de depósito cargada y todavía no llegó, no puede marcarse como COBRADO. Si no tiene fecha de depósito cargada, se considera a la vista y no aplica esta restricción.
- **Eliminación protegida**: no se puede eliminar un cheque que se usó en pagos, aunque estén anulados: los pagos lo conservan como registro. Si no se va a usar, se anula el cheque.
- **Pagos anulados**: un pago anulado libera el cheque. El cheque sigue Emitido y vuelve a estar disponible, también para otro proveedor. Un cheque rechazado o anulado sigue vinculado al pago, igual que un cheque de cliente rechazado. El detalle del cheque lista el pago anulado como registro. No se puede anular un pago con un cheque ya cobrado.
- **COBRADO, ANULADO y RECHAZADO son estados finales**: no se pueden editar, eliminar, cobrar ni anular nuevamente. Un cheque COBRADO solo puede pasar a RECHAZADO.

## Validaciones importantes
- El número de cheque es único **por banco**: pueden existir dos cheques con el mismo número si son de bancos distintos, pero no dos con igual número y banco (`numero` dejó de ser la PK del registro; ahora es `id`, y la unicidad se valida explícitamente por `numero` + `banco`).
- El número de cheque puede editarse libremente mientras el cheque no esté usado en ningún pago a proveedor (ver "Eliminación protegida" y la regla nueva más abajo).
- Si se informa fecha de depósito, no puede ser posterior a la fecha de vencimiento (validada en `OwnCheckService`, no en el serializer). No aplica si el cheque no tiene fecha de depósito cargada.
- Lo que el pago le aplica a cada compra no puede superar su saldo pendiente.
- Solo aparecen como disponibles los cheques EMITIDO sin un pago vigente.
- **No se puede editar número, banco ni importe de un cheque ya usado en algún pago a proveedor** (aunque siga en estado EMITIDO): el formulario bloquea esos tres campos y muestra un aviso citando al proveedor; el backend rechaza el cambio igual si se lo intenta forzar (`OwnCheckEditBlockedException`, validado en `OwnCheckService.update_own_check`). Fecha de emisión, fecha de depósito, fecha de vencimiento y observaciones siguen editables sin restricción en ese caso.

## Pantallas involucradas
- `/own-check` — Listado de cheques emitidos
- `/own-check/create` — Formulario de nuevo cheque
- `/own-check/edit/:id` — Formulario de edición de cheque
- `/own-check/detail/:id` — Detalle del cheque, con la sección Proveedor y pagos
- `/purchase-payment/create` — Formulario de pago a proveedor (sección Cheques propios)
- Tutorial guiado de Cheques emitidos (`own-checks`, ver `tutoriales.md`): recorre el alta de un cheque y las acciones del listado. Lo ofrece la novedad "Tutorial de Cheques emitidos" del Inicio.

## Endpoints involucrados
- `GET /api/own-checks/` — Listado con filtros opcionales (`state`, `bank`, `available`: emitidos sin pago vigente)
- `POST /api/own-checks/` — Crear cheque
- `GET /api/own-checks/:id/` — Detalle de cheque. Incluye `supplier` (`id`, `nombre`, `puesto`, el del pago vigente) y `payments` (`id`, `fecha_pago`, `tipo` `COMPRA`/`A_CUENTA`, `compras` (`[{id, fecha}]`, vacía si es a cuenta), `importe_abonado`, `estado_pago`), incluidos los pagos anulados.
- `PUT /api/own-checks/:id/` — Editar cheque
- `DELETE /api/own-checks/:id/` — Eliminar cheque (falla si se usó en pagos, vigentes o anulados)
- `POST /api/own-checks/:id/cash/` — Cobrar cheque
- `POST /api/own-checks/:id/cancel/` — Anular cheque
- `POST /api/own-checks/:id/reject/` — Registrar el rechazo del cheque (desde EMITIDO o COBRADO)

## Impacto sobre otras funcionalidades
- **Pagos de compras**: el cheque propio es un tipo de pago disponible al registrar pagos de compras y pagos a cuenta. Al anular un pago con cheque propio, el cheque queda libre para otro pago.
- **Compras**: el estado de pago de una compra (`PENDIENTE`, `PARCIAL`, `ABONADO`) se recalcula dinámicamente según los pagos asociados. Al anular un cheque o registrar su rechazo, las compras afectadas vuelven a PENDIENTE o PARCIAL.
- **Cuenta corriente del proveedor**: cada pago con cheque propio reduce la deuda del proveedor. Al anular el cheque, registrar su rechazo o anular un pago, la cuenta corriente se restaura sumando el importe correspondiente.
