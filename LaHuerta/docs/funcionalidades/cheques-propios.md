# Cheques Propios

## Objetivo
Gestionar los cheques emitidos por La Huerta para el pago de compras a proveedores. Permite registrar, editar, eliminar, cobrar y anular cheques propios, y usarlos como medio de pago al abonar compras.

## Alcance
- Crear, editar y eliminar cheques propios en estado EMITIDO.
- Listar cheques con filtros por banco y estado.
- Usar un cheque propio como medio de pago al registrar pagos de compras.
- Un cheque puede aplicarse parcialmente a una compra y el saldo restante puede usarse en otras compras del mismo proveedor.
- Un cheque solo puede asociarse a compras de un único proveedor.
- Cobrar un cheque (transición EMITIDO → COBRADO).
- Anular un cheque (transición EMITIDO → ANULADO), con reversión completa de los efectos sobre pagos, facturas y cuenta corriente del proveedor.

## Estados del cheque

| Estado   | Descripción |
|----------|-------------|
| EMITIDO  | Cheque creado y disponible para ser usado como medio de pago |
| COBRADO  | Cheque debitado de la cuenta bancaria. Estado final, no reversible |
| ANULADO  | Cheque anulado. Estado final, no reversible |

Solo los cheques en estado **EMITIDO** pueden editarse, eliminarse, cobrarse o anularse.

## Fecha de depósito (cheques diferidos)

Los cheques emitidos por La Huerta suelen entregarse al proveedor antes de que puedan cobrarse (cheques diferidos, comunes a 30/60/90 días). El campo **fecha de depósito** (`fecha_deposito`) registra desde cuándo el proveedor puede efectivamente depositar el cheque.

- Es un campo **opcional**: puede dejarse vacío si el cheque no es diferido o si aún no se acordó la fecha. En ese caso, el cheque se considera a la vista y no tiene restricción para cobrarse.
- Se ingresa y edita en el formulario de creación/edición, y se muestra en el detalle entre la fecha de emisión y la fecha de vencimiento.
- Si está cargada, condiciona cuándo el cheque puede marcarse como COBRADO (ver "Cobrar un cheque" más abajo).
- El detalle y el listado muestran un indicador visual:
  - Si la fecha de depósito es **futura** y el cheque sigue EMITIDO, se marca como "todavía en espera".
  - Si la fecha de depósito **ya llegó o pasó** y el cheque sigue EMITIDO, se marca como "disponible" para depositar/cobrar.
- El naming (`fecha_deposito`) se alinea con el campo homónimo del modelo `Cheque` (cheques recibidos de clientes, app `cheque`), que ya cumple el mismo rol para esa entidad.

## Flujo de uso

### Crear un cheque propio
1. Acceder a **Cheques emitidos** desde el menú.
2. Hacer clic en **Nuevo cheque**.
3. Ingresar número de cheque, banco, importe, fecha de emisión, fecha de depósito (opcional) y fecha de vencimiento.
4. Confirmar. El cheque queda en estado EMITIDO.

### Usar un cheque como medio de pago
1. Acceder a **Pagos de Compras** → **Nuevo pago**.
2. Seleccionar la compra a abonar.
3. En "Tipo de pago" seleccionar **Cheque Propio**.
4. El sistema carga los cheques disponibles para ese proveedor: deben estar en estado EMITIDO y tener saldo restante.
5. Seleccionar el cheque e ingresar el importe a abonar (no puede superar el saldo restante del cheque ni el saldo pendiente de la compra).
6. Confirmar. El pago queda registrado, la cuenta corriente del proveedor se actualiza y el estado de la compra cambia a PARCIAL o ABONADO según corresponda.

### Cobrar un cheque
1. Desde el detalle de un cheque EMITIDO, hacer clic en **Cobrar**.
   - El botón aparece deshabilitado (con explicación al pasar el mouse) si el cheque tiene fecha de depósito cargada y todavía no llegó.
2. El sistema valida, en este orden: que el cheque esté EMITIDO, que tenga al menos un pago asociado, y que la fecha de depósito (si tiene) ya se haya cumplido.
3. El estado pasa a COBRADO. No tiene efectos sobre pagos ni cuenta corriente.

### Anular un cheque
1. Desde el listado de cheques, hacer clic en **Anular** en un cheque EMITIDO.
2. El sistema muestra un diálogo de confirmación.
   - Si el cheque **no tiene compras asociadas**: advierte que el registro quedará pero no podrá editarse ni eliminarse.
   - Si el cheque **tiene compras asociadas**: advierte que los pagos serán eliminados, la cuenta corriente del proveedor será restaurada y las facturas volverán a su estado anterior.
3. Al confirmar, el sistema ejecuta en una transacción atómica:
   - Elimina todos los pagos asociados al cheque.
   - Por cada pago eliminado: restaura la cuenta corriente del proveedor sumando el importe abonado.
   - Recalcula el estado de cada compra afectada (PENDIENTE o PARCIAL según lo que reste abonar).
   - Marca el cheque como ANULADO.

## Reglas de negocio

- **Un cheque, un proveedor**: una vez que un cheque es utilizado para pagar una compra de un proveedor, solo puede usarse para pagar compras de ese mismo proveedor.
- **Saldo parcial**: el importe abonado con el cheque puede ser menor a su importe total. El saldo restante puede aplicarse a otras compras del mismo proveedor.
- **No se puede cobrar un cheque sin pagos**: un cheque debe tener al menos un pago asociado para poder marcarse como COBRADO.
- **No se puede cobrar antes de la fecha de depósito**: si el cheque tiene fecha de depósito cargada y todavía no llegó, no puede marcarse como COBRADO. Si no tiene fecha de depósito cargada, se considera a la vista y no aplica esta restricción.
- **Eliminación protegida**: no se puede eliminar un cheque que tenga pagos asociados. Primero deben eliminarse los pagos o anular el cheque.
- **COBRADO y ANULADO son estados finales**: no se pueden editar, eliminar, cobrar ni anular nuevamente.

## Validaciones importantes
- El número de cheque es único. No pueden existir dos cheques con el mismo número.
- Si se informa fecha de depósito, no puede ser posterior a la fecha de vencimiento (validada en frontend y backend). No aplica si el cheque no tiene fecha de depósito cargada.
- El importe abonado no puede superar el saldo restante del cheque.
- El importe abonado no puede superar el saldo pendiente de la compra.
- Solo aparecen como disponibles los cheques EMITIDO con saldo > 0 y sin pagos a otro proveedor.

## Pantallas involucradas
- `/own-check` — Listado de cheques emitidos
- `/own-check/create` — Formulario de nuevo cheque
- `/own-check/edit/:id` — Formulario de edición de cheque
- `/purchase-payment/create` — Formulario de pago de compra (sección Cheque Propio)

## Endpoints involucrados
- `GET /api/own-checks/` — Listado con filtros opcionales (`state`, `bank`, `available`, `supplier_id`)
- `POST /api/own-checks/` — Crear cheque
- `GET /api/own-checks/:id/` — Detalle de cheque
- `PUT /api/own-checks/:id/` — Editar cheque
- `DELETE /api/own-checks/:id/` — Eliminar cheque (falla si tiene pagos asociados)
- `POST /api/own-checks/:id/cash/` — Cobrar cheque
- `POST /api/own-checks/:id/cancel/` — Anular cheque

## Impacto sobre otras funcionalidades
- **Pagos de compras**: el cheque propio es un tipo de pago disponible al registrar pagos. Al eliminar un pago con cheque propio, el saldo restante del cheque se incrementa automáticamente.
- **Compras**: el estado de pago de una compra (`PENDIENTE`, `PARCIAL`, `ABONADO`) se recalcula dinámicamente según los pagos asociados. Al anular un cheque, las compras afectadas vuelven a PENDIENTE o PARCIAL.
- **Cuenta corriente del proveedor**: cada pago con cheque propio reduce la deuda del proveedor. Al anular el cheque o eliminar un pago, la cuenta corriente se restaura sumando el importe correspondiente.
