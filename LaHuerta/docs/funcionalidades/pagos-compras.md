# Pagos a proveedores (Pagos de Compras)

## Objetivo
Registrar lo que La Huerta le paga a cada proveedor y descontarlo de su cuenta corriente. Un mismo pago se aplica a **una compra, a varias o a ninguna**: lo que no se aplica a ninguna compra queda **a cuenta** del saldo del proveedor (DEV-141, DEV-150).

## Alcance
- **Un solo formulario:** se elige el proveedor, se cargan los datos del pago y se tildan las compras que cubre. No hay que elegir antes entre "pago de compras" y "pago a cuenta".
- **Reparto entre compras:** el importe se reparte solo entre las compras tildadas, de la más vieja a la más nueva, y se puede corregir lo de cada una. Ninguna compra recibe más que su saldo pendiente.
- **Pago a cuenta:** un pago sin compras tildadas, o lo que sobra de un pago después de cubrir sus compras. Sirve para el saldo inicial de un proveedor recién cargado, adelantos o pagos que no corresponden a una compra puntual.
- Medios de pago: efectivo (y los demás tipos de pago simples), cheques de clientes (se endosan) o cheques emitidos (cheques propios). Un pago puede llevar **varios cheques**, todos del mismo tipo, y un cheque puede cubrir varias compras.
- Un pago tiene **un solo tipo de pago**: no se mezclan efectivo, cheques de clientes y cheques propios. Si se paga con varios medios, se carga un pago por cada uno.
- Listado, detalle, edición (fecha, compras que cubre e importe) y **anulación** de pagos. Un pago no se elimina: se anula (borrado lógico) y queda como registro con estado Anulado.
- **Cheques rechazados o anulados:** si se rechaza un cheque con el que se pagó (de un cliente o emitido) o se anula un cheque emitido, el pago pierde solo la parte de ese cheque (ver "Rechazo o anulación de un cheque").

## Flujo de uso

### Registrar un pago
1. Ir a **Pagos de Compras** → **Nuevo pago**.
2. Elegir el proveedor. Se muestra su saldo en cuenta corriente.
3. Elegir la fecha (por defecto hoy) y el tipo de pago.
   - **Efectivo u otro tipo simple:** escribir el importe.
   - **Cheque:** elegir uno o más cheques en cartera ("Agregar cheque" suma otro). Cada cheque se endosa entero; el importe del pago es la suma.
   - **Cheque Propio:** elegir uno o más cheques emitidos. Igual que los de clientes, cada cheque se usa entero; el importe del pago es la suma.
4. En **Compras pendientes de pago** aparecen las compras del proveedor con saldo pendiente, de la más vieja a la más nueva. Tildar las que se pagan: el importe se reparte solo y se puede corregir lo de cada una. Abajo se ve el importe del pago, lo aplicado a compras y lo que queda a cuenta. Si el importe no alcanza, las compras más nuevas quedan en cero (no se guardan) y lo avisa.
5. Tocar **Registrar pago**. El importe entero se descuenta de la cuenta corriente del proveedor y cada compra pasa a PARCIAL o ABONADO según lo que se le aplicó.

### Editar un pago
1. Desde el listado (lápiz de la columna **Acción**) o desde el detalle, tocar **Editar**.
2. Se ven el proveedor, el tipo de pago y los cheques, sin poder cambiarlos. Para cambiar alguno, se anula el pago y se carga de nuevo.
3. Corregir la fecha, las compras que cubre (tildar, destildar o cambiar lo aplicado a cada una) y, si el pago no es con cheques, el importe. Al cambiar el importe o las compras tildadas, el importe se vuelve a repartir. Tocar **Guardar cambios** (se habilita al cambiar algo). Si alguna compra deja de estar cubierta por el pago (se destildó o se le bajó lo aplicado), antes de guardar se pide confirmación: el aviso dice cuánto vuelve a deber cada compra y cuánto queda a cuenta.
4. La diferencia de importe se ajusta en la cuenta corriente del proveedor, y el estado de cada compra se recalcula. Destildar todas las compras deja el pago a cuenta. Un pago a cuenta con un cheque que en realidad cubría compras se puede repartir después así.

### Anular un pago
Un pago no se elimina: se **anula**. Vale igual para todos los tipos de pago (efectivo, transferencia, cheques de clientes y cheques emitidos).
1. Desde el listado (botón **Anular** de la columna **Acción**) o desde el detalle, tocar **Anular**. El sistema pide confirmación y explica qué se revierte.
2. Al confirmar:
   - El importe vuelve a la cuenta corriente del proveedor.
   - Sus compras dejan de contarlo y vuelven a su estado anterior (PENDIENTE o PARCIAL).
   - Los cheques de clientes vuelven a **En cartera** y se pueden usar en otro pago.
   - Los cheques emitidos quedan libres: siguen **Emitidos** y vuelven a estar disponibles, también para otro proveedor.
   - Lo de un cheque rechazado o anulado no se devuelve dos veces (ya se sacó del pago y se le devolvió al proveedor en su momento): ese cheque sigue como estaba y queda en el pago como registro.
3. El pago queda con estado **Anulado** y la fecha de anulación. Se sigue viendo en el listado (solapa Anulados, con el importe tachado), en su detalle, en el detalle de sus compras y en el de sus cheques emitidos, pero no cuenta para nada. No se puede editar ni volver a anular.
4. El detalle del pago anulado sigue mostrando **todos los cheques con que se registró**, de clientes y emitidos. Los que quedaron libres figuran como **Liberado**, aunque después se hayan usado en otro pago (también con otro proveedor); los rechazados o anulados conservan su estado.

### Rechazo o anulación de un cheque
Al rechazar un cheque de cliente endosado (ver `cheques-clientes.md`), o registrar el rechazo o la anulación de un cheque emitido (ver `cheques-propios.md`):
1. La Huerta vuelve a deberle al proveedor lo que valía ese cheque en el pago (sube su cuenta corriente).
2. El pago baja su importe en esa parte, descontada primero de su compra más nueva, después de la anterior, y así. Esas compras vuelven a PARCIAL o PENDIENTE. Si las compras no alcanzan, el resto sale de lo que el pago tenía a cuenta.
3. El pago no se elimina aunque quede en cero: el cheque rechazado o anulado queda visible en él como registro, y sus compras siguen listadas con lo que les quedó aplicado.

## Validaciones importantes
- Todo pago tiene proveedor, y las compras que cubre son de ese proveedor (`PaymentSupplierMismatchException`).
- Ninguna compra recibe más que su saldo pendiente (`PaymentExceedsBalanceException`). Al editar, el saldo de cada compra cuenta lo que este pago ya le aplicaba.
- Lo aplicado a las compras no supera el importe del pago (`PaymentApplicationsExceedAmountException`); lo que sobra queda a cuenta.
- Una compra no puede estar dos veces en el mismo pago, y lo aplicado a cada una es mayor a cero.
- Lo que queda a cuenta no tiene tope: el saldo del proveedor puede quedar a favor de La Huerta.
- **Un cheque, un pago:** cada cheque, de cliente o emitido, se usa entero y en un solo pago vigente. Un cheque emitido que ya está en un pago vigente no se acepta en otro (`OwnCheckNotAvailableException`).
- Un cheque no puede estar dos veces en el mismo pago, y un pago con cheques lleva al menos uno.
- Solo se usan cheques de clientes **en cartera** (`CheckInvalidStateException`) y cheques emitidos en estado **Emitido** (`OwnCheckNotAvailableException`).
- Un pago con datos de otro tipo de pago (por ejemplo, tipo Cheque con cheques propios) se rechaza.
- En un pago con cheques no se cambia el importe: sale de los cheques (`PaymentEditBlockedException`). Sí se cambian la fecha y las compras que cubre.
- Un pago anulado no se edita (`PaymentEditBlockedException`) ni se vuelve a anular (`PaymentCancelBlockedException`).
- No se anula un pago con un cheque emitido ya **cobrado**: el banco ya le pagó al proveedor (`PaymentCancelBlockedException`).
- No se puede cambiar el proveedor de una compra que ya tiene pagos (`BuySupplierChangeBlockedException`).

## Pantallas involucradas
- `/purchase-payment` — Listado. La columna **Proveedor** muestra "Puesto 21 - Nombre": primero el puesto, que es como se identifica al proveedor; si el nombre es largo se corta con "…" y se ve completo al pasar el mouse. La columna **Concepto** muestra cuántas compras cubre el pago ("1 compra", "3 compras") o "A cuenta"; los números de cada compra se ven en el detalle del pago. El ícono rojo junto al tipo de pago marca un pago con un cheque rechazado o anulado. Las acciones de cada fila (ver detalle, editar y anular) están juntas en la columna **Acción**; un pago anulado (solapa Anulados) muestra el importe tachado, sin etiqueta porque la solapa ya lo dice, y no deja editarlo ni anularlo.
  Solapas **Vigentes** y **Anulados** debajo del título: al entrar se ven los vigentes, y la solapa elegida se combina con los filtros. Filtros: **Proveedor** (un número busca por puesto; un texto, por nombre), **Concepto** (Compras: cubre al menos una compra; A cuenta: no cubre ninguna), **Tipo de pago**, **Importe mín./máx.** y **Fecha desde/hasta** (fecha del pago). El listado se ordena del pago más nuevo al más viejo.
- `/purchase-payment/create` — Formulario único. Las rutas anteriores (`/purchase-payment/create/purchase` y `/purchase-payment/create/on-account`) llevan acá.
- `/purchase-payment/edit/:id` — Edición de la fecha, las compras que cubre y el importe.
- `/purchase-payment/detail/:id` — Detalle: proveedor (nombre y puesto), datos del pago, las compras que cubre (con enlace a cada una y lo aplicado) y lo que quedó a cuenta, el aviso de pago anulado o de cheque rechazado o anulado si corresponde, y la lista de cheques (de los emitidos, también lo que se usó de cada uno en el pago).
- `/buy/detail/:id` — El detalle de la compra lista sus pagos con lo que cada uno le aplicó (ver `compras.md`).
- Tutorial guiado de Pagos de Compras (`purchase-payments`, ver `tutoriales.md`), ofrecido por la novedad "Un pago para varias compras de un proveedor".

## Endpoints involucrados
- `GET /api/purchase-payment/` — Listado, del más nuevo al más viejo, con filtros opcionales `compra_id` (pagos que cubren esa compra), `supplier_id`, `supplier` (puesto o nombre), `kind` (`COMPRA` o `A_CUENTA`), `payment_type_id`, `amount_min`, `amount_max`, `date_from`, `date_to` y `estado` (`VIGENTE` o `ANULADO`). Sin `estado` se listan todos.
- `POST /api/purchase-payment/` — Alta. `proveedor` obligatorio; `compras` opcional (`[{compra, importe}]`, lo aplicado a cada compra; sin compras el pago es a cuenta); `cheque_ids` (cheques de clientes) u `own_check_ids` (cheques emitidos) según el tipo de pago; con otro tipo, `importe_abonado`.
- `GET /api/purchase-payment/:id/` — Detalle, con `proveedor` (`id`, `nombre`, `puesto`), `compras` (`[{id, fecha, importe, importe_aplicado}]`, de la más vieja a la más nueva), `importe_a_cuenta`, `estado_pago`, `fecha_anulacion`, `cheques` y `cheques_propios` (cada uno con `numero`, `banco`, `importe` y `estado`; en un pago anulado, `LIBERADO` para los que quedaron libres).
- `PUT /api/purchase-payment/:id/` — Editar: `fecha_pago`; `compras` (reemplaza las que cubre; si no se manda, se conservan); `importe_abonado` (solo en pagos sin cheques).
- `POST /api/purchase-payment/:id/cancel/` — **Anula** el pago (borrado lógico) y devuelve el pago con `estado_pago: ANULADO`. El pago no se elimina: `DELETE` no está disponible.

## Consideraciones
- La relación entre pagos y compras es N a N, en la tabla `imputacion_pago` con el importe que el pago le aplica a cada compra. El campo `compra` del pago se sacó: con una migración de datos, cada pago con compra pasó a cubrir esa única compra por su importe, y los pagos a cuenta quedaron sin compras.
- La misma migración corrigió los pagos con cheques de clientes ya rechazados antes de este cambio: les bajó el importe en lo que valían esos cheques (la deuda ya se le había devuelto al proveedor al rechazarlos, pero el pago seguía con el importe original y su compra figuraba como pagada).
- Los cheques de clientes y los emitidos funcionan igual. Cada cheque se usa entero en un solo pago vigente, que lo indica `cheque.pago_compra` o `cheque_propio.pago_compra`. Al anular el pago esa columna se vacía y el cheque queda libre; si el cheque ya estaba rechazado o anulado, sigue vinculado al pago.
- El estado y el saldo de una compra se calculan con lo que los pagos le aplicaron, no con el importe entero de cada pago. Lo que queda a cuenta no cambia el estado de ninguna compra.
- Una compra cubierta por un pago, vigente o anulado, no se puede eliminar: el pago la conserva como registro. Para eliminarla, primero se edita el pago vigente y se destilda la compra (ver `compras.md`).
- El historial de cheques de cada pago está en `pago_compra_cheque` (de clientes) y `pago_compra_cheque_propio` (emitidos), con el importe que valía cada cheque al pagar. No se borra al anular el pago: así el pago anulado sigue mostrando sus cheques. Un cheque que figura en ese historial no se puede eliminar.
- El estado del pago está en `pago_compra.estado_pago` (`VIGENTE` o `ANULADO`) y la fecha en `fecha_anulacion`. Un pago anulado conserva sus filas de `imputacion_pago` y del historial de cheques como registro; lo pagado de cada compra cuenta solo los pagos vigentes.
- La lógica de bajar un pago y desaplicarlo de sus compras está en `reduce_payment_amount` (`pago_compra/service.py`), que usan el rechazo de cheques de clientes, el rechazo de cheques emitidos y la anulación de cheques emitidos.

## Impacto sobre otras funcionalidades
- **Cuenta corriente del proveedor:** cada pago la reduce por su importe entero (aplicado a compras y a cuenta) y cada anulación la restaura.
- **Compras:** su estado y saldo salen de lo aplicado por sus pagos; el detalle lista esos pagos. No se puede cambiar el proveedor de una compra con pagos.
- **Cheques emitidos:** el detalle del cheque muestra todos sus pagos con las compras que cubre cada uno (ver `cheques-propios.md`). Anular un cheque o registrar su rechazo descuenta su parte del pago, sin eliminar el pago: el cheque queda en él como registro.
- **Cheques de clientes:** rechazar un cheque endosado baja el pago y sus compras, además de devolverle la deuda al proveedor.
