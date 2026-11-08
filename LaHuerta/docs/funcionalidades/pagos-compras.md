# Pagos a proveedores (Pagos de Compras)

## Objetivo
Registrar lo que La Huerta le paga a cada proveedor y descontarlo de su cuenta corriente. Un pago puede ser de una compra cargada en el sistema o **a cuenta**: sobre el saldo del proveedor, sin compra asociada (DEV-141).

## Alcance
- **Pago de compras:** paga una compra cargada. La compra pasa a PARCIAL o ABONADO según lo que reste pagar.
- **Pago a cuenta:** paga parte del saldo del proveedor sin elegir una compra. Sirve para el saldo inicial de un proveedor recién cargado (cuyas compras anteriores no están en el sistema), adelantos o pagos que no corresponden a una compra puntual.
- Medios de pago: efectivo (y los demás tipos de pago simples), cheques de clientes (se endosan) o cheques emitidos (cheques propios). Un pago puede llevar **varios cheques**, todos del mismo tipo.
- Un pago tiene **un solo tipo de pago**: no se mezclan efectivo, cheques de clientes y cheques propios. Si se paga con varios medios, se carga un pago por cada uno.
- Listado, detalle, edición (fecha e importe) y eliminación de pagos.
- No incluye: repartir un mismo pago entre varias compras, ni imputar después un pago a cuenta a una compra.

## Flujo de uso

### Pago de compras
1. Ir a **Pagos de Compras** → **Nuevo pago** → **Pago de compras**.
2. Elegir la compra. Se muestran sus datos: proveedor, importe y saldo pendiente.
3. Elegir la fecha (por defecto hoy) y el tipo de pago.
   - **Efectivo u otro tipo simple:** escribir el importe.
   - **Cheque:** elegir uno o más cheques en cartera ("Agregar cheque" suma otro). Cada cheque se endosa entero; el importe del pago es la suma.
   - **Cheque Propio:** elegir uno o más cheques emitidos e indicar cuánto se usa de cada uno (arranca en su saldo disponible). El importe del pago es la suma.
   Los cheques se ven como tarjetas que se compactan y expanden, con el total del pago abajo.
4. Escribir el importe y tocar **Registrar pago**.
5. El importe se descuenta de la cuenta corriente del proveedor y la compra pasa a PARCIAL o ABONADO.

### Pago a cuenta
1. Ir a **Pagos de Compras** → **Nuevo pago** → **Pago a cuenta**.
2. Elegir el proveedor. Se muestra su saldo en cuenta corriente.
3. Elegir la fecha, el tipo de pago y, si corresponde, los cheques (igual que en el pago de compras).
4. Escribir el importe y tocar **Registrar pago**. El importe se descuenta de la cuenta corriente del proveedor.

### Editar un pago
1. Desde el listado (lápiz de la columna **Acción**) o desde el detalle, tocar **Editar**.
2. Se ven el proveedor, el concepto, el tipo de pago y los cheques, sin poder cambiarlos. Para cambiar alguno, se elimina el pago y se carga de nuevo.
3. Corregir la fecha y, si el pago no es con cheques, el importe. Tocar **Guardar cambios** (se habilita al cambiar algo).
4. La diferencia de importe se ajusta en la cuenta corriente del proveedor; si el pago es de una compra, su estado se recalcula (PARCIAL o ABONADO).

### Eliminar un pago
Desde el listado o el detalle. El importe vuelve a la cuenta corriente del proveedor; si el pago tenía compra, la compra vuelve a su estado anterior, los cheques de clientes vuelven a estar en cartera y lo usado de cada cheque emitido se libera. Lo de un cheque de cliente rechazado no se devuelve dos veces: ya se devolvió al rechazarlo.

## Validaciones importantes
- Todo pago tiene proveedor. En un pago de compras es el de la compra: si no coinciden, el pago se rechaza (`PaymentSupplierMismatchException`).
- En un pago de compras, el importe no puede superar el saldo pendiente de la compra.
- Un pago a cuenta no tiene tope: el saldo del proveedor puede quedar a favor de La Huerta.
- **Un cheque emitido, un proveedor:** lo que no se usa de un cheque emitido queda para otros pagos al mismo proveedor (de compras o a cuenta), nunca para otro proveedor (`OwnCheckOtherSupplierException`). Lo que se usa de cada cheque no puede superar su saldo sin usar.
- Un cheque no puede estar dos veces en el mismo pago, y un pago con cheques lleva al menos uno.
- Un pago con datos de otro tipo de pago (por ejemplo, tipo Cheque con cheques propios) se rechaza.
- Al editar, el importe de un pago sin cheques tiene el mismo tope que al crear, sin contar el importe anterior del propio pago: el saldo pendiente de la compra. Un pago a cuenta no tiene tope.
- En un pago con cheques solo se edita la fecha: el importe sale de los cheques (`PaymentEditBlockedException`).
- No se puede cambiar el proveedor de una compra que ya tiene pagos (`BuySupplierChangeBlockedException`): los pagos quedarían a nombre del proveedor anterior.

## Pantallas involucradas
- `/purchase-payment` — Listado. La columna **Proveedor** muestra "Puesto 21 - Nombre": primero el puesto, que es como se identifica al proveedor; si el nombre es largo se corta con "…" y se ve completo al pasar el mouse. La columna **Concepto** muestra qué se pagó: la etiqueta "Compra" con el número de la compra, o la etiqueta "A cuenta". Las acciones de cada fila (ver detalle, editar y eliminar) están juntas en la columna **Acción**.
  Filtros: **Proveedor** (un número busca por puesto; un texto, por nombre), **Concepto** (Compra o A cuenta), **Tipo de pago**, **Importe mín./máx.** y **Fecha desde/hasta** (fecha del pago). El listado se ordena del pago más nuevo al más viejo.
- `/purchase-payment/create` — Elegir entre pago de compras y pago a cuenta.
- `/purchase-payment/create/purchase` y `/purchase-payment/create/on-account` — Formularios.
- `/purchase-payment/edit/:id` — Edición de la fecha y el importe.
- `/purchase-payment/detail/:id` — Detalle: proveedor (nombre y puesto), compra o "A cuenta", datos del pago y la lista de cheques (de los emitidos, también lo que se usó de cada uno en el pago).
- Tutorial guiado de Pagos de Compras (`purchase-payments`, ver `tutoriales.md`), ofrecido por la novedad "Pagos a cuenta a proveedores".

## Endpoints involucrados
- `GET /api/purchase-payment/` — Listado, del más nuevo al más viejo, con filtros opcionales `compra_id`, `supplier_id`, `supplier` (puesto o nombre), `kind` (`COMPRA` o `A_CUENTA`), `payment_type_id`, `amount_min`, `amount_max`, `date_from` y `date_to`.
- `POST /api/purchase-payment/` — Alta. `proveedor` obligatorio; `compra` opcional (sin compra, el pago es a cuenta); `cheque_ids` (cheques de clientes) u `own_checks` (`[{id, importe}]`, cheques emitidos) según el tipo de pago; con otro tipo, `importe_abonado`.
- `GET /api/purchase-payment/:id/` — Detalle, con `proveedor` (`id`, `nombre`, `puesto`), `compra` (`null` si es a cuenta), `cheques` y `cheques_propios` (con `importe_usado`).
- `PUT /api/purchase-payment/:id/` — Editar: `importe_abonado` y `fecha_pago`.
- `DELETE /api/purchase-payment/:id/` — Eliminar.

## Consideraciones
- La relación entre pagos y cheques emitidos es N a N, en la tabla `pago_compra_cheque_propio` con el importe que se usa de cada cheque en cada pago. Los pagos que tenían un cheque emitido se pasaron a esa tabla con una migración.
- El proveedor se guarda en el pago (`PagoCompra.proveedor`). Los pagos existentes antes de DEV-141 lo tomaron de su compra con una migración de datos.
- El estado de pago de una compra se calcula solo con los pagos de esa compra: los pagos a cuenta no cambian el estado de ninguna compra.

## Impacto sobre otras funcionalidades
- **Cuenta corriente del proveedor:** cada pago la reduce y cada eliminación la restaura.
- **Cheques emitidos:** el detalle del cheque muestra todos sus pagos, de compras y a cuenta, con lo que se usó del cheque en cada uno (ver `cheques-propios.md`). Anular un cheque descuenta su parte de cada pago: si era el único cheque del pago, el pago se elimina.
- **Rechazo de un cheque de cliente:** devuelve a la cuenta corriente del proveedor el importe de ese cheque, no el del pago entero.
- **Cheques de clientes:** un cheque endosado a un proveedor muestra ese proveedor también en los pagos a cuenta.
- **Compras:** no se puede cambiar el proveedor de una compra con pagos.
