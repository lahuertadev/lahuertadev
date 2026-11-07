# Pagos a proveedores (Pagos de Compras)

## Objetivo
Registrar lo que La Huerta le paga a cada proveedor y descontarlo de su cuenta corriente. Un pago puede ser de una compra cargada en el sistema o **a cuenta**: sobre el saldo del proveedor, sin compra asociada (DEV-141).

## Alcance
- **Pago de compras:** paga una compra cargada. La compra pasa a PARCIAL o ABONADO según lo que reste pagar.
- **Pago a cuenta:** paga parte del saldo del proveedor sin elegir una compra. Sirve para el saldo inicial de un proveedor recién cargado (cuyas compras anteriores no están en el sistema), adelantos o pagos que no corresponden a una compra puntual.
- Medios de pago: efectivo (y los demás tipos de pago simples), cheque de un cliente (se endosa) o cheque emitido (cheque propio).
- Listado, detalle, edición (fecha e importe) y eliminación de pagos.
- No incluye: repartir un mismo pago entre varias compras, ni imputar después un pago a cuenta a una compra.

## Flujo de uso

### Pago de compras
1. Ir a **Pagos de Compras** → **Nuevo pago** → **Pago de compras**.
2. Elegir la compra. Se muestran sus datos: proveedor, importe y saldo pendiente.
3. Elegir la fecha (por defecto hoy) y el tipo de pago. Con cheque, elegir el cheque en cartera o el cheque emitido.
4. Escribir el importe y tocar **Registrar pago**.
5. El importe se descuenta de la cuenta corriente del proveedor y la compra pasa a PARCIAL o ABONADO.

### Pago a cuenta
1. Ir a **Pagos de Compras** → **Nuevo pago** → **Pago a cuenta**.
2. Elegir el proveedor. Se muestra su saldo en cuenta corriente.
3. Elegir la fecha, el tipo de pago y, si corresponde, el cheque.
4. Escribir el importe y tocar **Registrar pago**. El importe se descuenta de la cuenta corriente del proveedor.

### Editar un pago
1. Desde el listado (lápiz de la columna **Acción**) o desde el detalle, tocar **Editar**.
2. Se ven el proveedor, el concepto, el tipo de pago y el cheque, sin poder cambiarlos. Para cambiar alguno, se elimina el pago y se carga de nuevo.
3. Corregir la fecha y/o el importe y tocar **Guardar cambios**.
4. La diferencia de importe se ajusta en la cuenta corriente del proveedor; si el pago es de una compra, su estado se recalcula (PARCIAL o ABONADO).

### Eliminar un pago
Desde el listado o el detalle. El importe vuelve a la cuenta corriente del proveedor; si el pago tenía compra, la compra vuelve a su estado anterior, y si era con un cheque de un cliente, el cheque vuelve a estar en cartera.

## Validaciones importantes
- Todo pago tiene proveedor. En un pago de compras es el de la compra: si no coinciden, el pago se rechaza (`PaymentSupplierMismatchException`).
- En un pago de compras, el importe no puede superar el saldo pendiente de la compra.
- Un pago a cuenta no tiene tope: el saldo del proveedor puede quedar a favor de La Huerta.
- **Un cheque emitido, un proveedor:** lo que no se usa de un cheque emitido queda para otros pagos al mismo proveedor (de compras o a cuenta), nunca para otro proveedor (`OwnCheckOtherSupplierException`). El importe no puede superar el saldo sin usar del cheque.
- Al editar, el importe tiene los mismos topes que al crear, sin contar el importe anterior del propio pago: el saldo pendiente de la compra y el saldo del cheque emitido. Un pago a cuenta no tiene tope.
- Si el pago se hizo con un cheque de un cliente que fue rechazado, su importe no se puede cambiar (la cuenta corriente ya se revirtió); la fecha sí (`PaymentEditBlockedException`).
- No se puede cambiar el proveedor de una compra que ya tiene pagos (`BuySupplierChangeBlockedException`): los pagos quedarían a nombre del proveedor anterior.

## Pantallas involucradas
- `/purchase-payment` — Listado. La columna **Proveedor** muestra "Puesto 21 - Nombre": primero el puesto, que es como se identifica al proveedor; si el nombre es largo se corta con "…" y se ve completo al pasar el mouse. La columna **Concepto** muestra qué se pagó: la etiqueta "Compra" con el número de la compra, o la etiqueta "A cuenta". Las acciones de cada fila (ver detalle, editar y eliminar) están juntas en la columna **Acción**.
- `/purchase-payment/create` — Elegir entre pago de compras y pago a cuenta.
- `/purchase-payment/create/purchase` y `/purchase-payment/create/on-account` — Formularios.
- `/purchase-payment/edit/:id` — Edición de la fecha y el importe.
- `/purchase-payment/detail/:id` — Detalle: proveedor (nombre y puesto), compra o "A cuenta", datos del pago y del cheque.
- Tutorial guiado de Pagos de Compras (`purchase-payments`, ver `tutoriales.md`), ofrecido por la novedad "Pagos a cuenta a proveedores".

## Endpoints involucrados
- `GET /api/purchase-payment/` — Listado, con filtros opcionales `compra_id` y `supplier_id`.
- `POST /api/purchase-payment/` — Alta. `proveedor` obligatorio; `compra` opcional (sin compra, el pago es a cuenta); `cheque_id` u `own_check_id` según el tipo de pago.
- `GET /api/purchase-payment/:id/` — Detalle, con `proveedor` (`id`, `nombre`, `puesto`) y `compra` (`null` si es a cuenta).
- `PUT /api/purchase-payment/:id/` — Editar: `importe_abonado` y `fecha_pago`.
- `DELETE /api/purchase-payment/:id/` — Eliminar.

## Consideraciones
- El proveedor se guarda en el pago (`PagoCompra.proveedor`). Los pagos existentes antes de DEV-141 lo tomaron de su compra con una migración de datos.
- El estado de pago de una compra se calcula solo con los pagos de esa compra: los pagos a cuenta no cambian el estado de ninguna compra.

## Impacto sobre otras funcionalidades
- **Cuenta corriente del proveedor:** cada pago la reduce y cada eliminación la restaura.
- **Cheques emitidos:** el detalle del cheque muestra todos sus pagos, de compras y a cuenta (ver `cheques-propios.md`). Anular un cheque elimina también sus pagos a cuenta.
- **Cheques de clientes:** un cheque endosado a un proveedor muestra ese proveedor también en los pagos a cuenta.
- **Compras:** no se puede cambiar el proveedor de una compra con pagos.
