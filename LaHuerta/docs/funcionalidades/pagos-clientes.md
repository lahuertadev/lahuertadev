# Pagos de Clientes

## Objetivo
Registrar lo que paga cada cliente y descontarlo de su cuenta corriente. Un pago puede hacerse en efectivo, transferencia u otro tipo de pago, o con uno o varios cheques. Un pago no se elimina: se anula y queda como registro (DEV-155).

## Alcance
- Alta, edición, detalle y anulación de pagos de clientes.
- Pagos con varios cheques; el importe del pago es la suma.
- Anulación con motivo, manual o automática cuando el banco rechaza todos los cheques del pago.
- No incluye imputar el pago a facturas: el pago va a cuenta del cliente (la tabla `pago_factura` existe, pero ningún flujo la usa).
- Los cheques se gestionan en `cheques-clientes.md` (depositar, acreditar, rechazar, endosar).

## Flujo de uso

### Registrar un pago
1. **Pagos de Clientes** → **Nuevo pago**.
2. Elegir el cliente con el buscador (razón social, nombre de fantasía o CUIT). Se muestra su saldo y cómo queda con el pago.
3. Elegir la fecha y el tipo de pago. Un pago tiene un solo tipo: si el cliente pagó de varias formas, se carga un pago por cada una.
4. Sin cheques: escribir el importe.
5. Con **Cheque**: cargar cada cheque (número, banco, importe, fecha de emisión y, si es diferido, la fecha de depósito). Con "Agregar cheque" se suma otro. El importe del pago es la suma y no se escribe.
6. **Registrar Pago**: el importe se descuenta de la cuenta corriente del cliente y los cheques quedan EN_CARTERA.

### Editar un pago
- **Sin cheques:** se edita todo (cliente, importe, fecha, tipo de pago, observaciones), incluido pasarlo a Cheque cargando sus cheques. La diferencia se ajusta en la cuenta corriente.
- **Con cheques:**
  - Se pueden cambiar la fecha y las observaciones del pago.
  - Un cheque **EN_CARTERA** se corrige entero (número, banco, importe, fechas) y se puede quitar. También se pueden agregar cheques nuevos. El importe del pago se recalcula y la diferencia se ajusta en la cuenta corriente.
  - Un cheque endosado a un proveedor o que ya no está en cartera (depositado, acreditado, rechazado) aparece compacto, con un candado rojo que explica por qué, y no se abre: no se modifica ni se quita. Los demás cheques del pago sí.
  - Un cheque que se quita se borra (fue una carga equivocada). No se puede quitar si alguna vez se usó en un pago a proveedor, aunque esté anulado: ese pago lo conserva como registro.
  - Para cambiar el cliente o el tipo de pago hay que anular el pago y cargarlo de nuevo.
- Un pago anulado no se edita.

### Anular un pago
1. Desde la columna Acción del listado (o desde el detalle en mobile), **Anular**.
2. El diálogo explica qué pasa y pide el **motivo** (obligatorio, hasta 200 caracteres).
3. Al confirmar:
   - el importe vuelve a la cuenta corriente del cliente;
   - los cheques pasan a **ANULADO**: salen de la cartera y ya no se ofrecen para pagar a proveedores, pero no se borran;
   - los cheques rechazados quedan RECHAZADOS (su importe ya había vuelto a la cuenta corriente);
   - el pago queda con estado Anulado, la fecha y el motivo.

### Rechazo de cheques
Al rechazar un cheque de un pago de cliente (desde Cheques):
- El importe **del cheque** vuelve a la cuenta corriente del cliente y se descuenta del pago, que sigue vigente si le quedan otros cheques.
- Si era el último cheque sin rechazar, el pago **se anula solo**, con el motivo "Cheque rechazado: N° …" o "Cheques rechazados: N° …, N° …". El pago anulado muestra el importe original (la suma de todos sus cheques).

## Validaciones importantes
- Con Cheque: al menos un cheque, sin repetir número y banco dentro del pago. Con otro tipo de pago no se mandan cheques y el importe es obligatorio.
- Duplicado de cheque: número + banco + cliente. Los cheques ANULADOS no cuentan, así se pueden volver a cargar los de un pago anulado (por ejemplo, un pago cargado a Clöe que en realidad hizo Kona). Los RECHAZADOS sí cuentan.
- No se anula un pago ya anulado ni uno con un cheque endosado a un pago a proveedor vigente: primero hay que anular ese pago al proveedor.
- El motivo de anulación es obligatorio.

## Pantallas involucradas
- `/client-payment` — Listado, con solapas **Vigentes** (al entrar) y **Anulados**. Un pago anulado muestra el importe tachado; uno vigente con cheques rechazados lleva el ícono de alerta en el tipo de pago.
- `/client-payment/create`, `/client-payment/edit/:id` — Formulario.
- `/client-payment/detail/:id` — Detalle, con el estado, los cheques y, si está anulado, la sección **Anulación** al principio (estado, fecha y motivo). Si el importe no incluye cheques rechazados, lleva el "!" con cuáles son y el importe original al pasar el mouse.

## Endpoints involucrados
- `GET /api/client-payment/` — Listado. Filtros: `client_id`, `business_name`, `amount_min`, `amount_max`, `date_from`, `date_to`, `payment_type_id` y `state` (`VIGENTE` | `ANULADO`).
- `POST /api/client-payment/`, `PUT /api/client-payment/:id/`, `PATCH /api/client-payment/:id/` — Alta y edición. Con Cheque llevan `cheques: [{id?, numero, banco, importe, fecha_emision, fecha_deposito}]`; al editar, los cheques que ya tenía el pago van con su `id`, los nuevos sin `id` y los que no van se quitan.
- `POST /api/client-payment/:id/cancel/` con `{"motivo": "..."}` — Anula el pago. No hay `DELETE`.

## Consideraciones
- Los pagos que ya tenían su cheque rechazado antes de DEV-155 quedaron anulados por migración, con el motivo "Cheque rechazado: N° …" y la fecha de la migración (no se guardaba la fecha del rechazo).
- El reporte del cliente y los totales no cuentan los pagos anulados.
- Un cliente con pagos, aunque estén todos anulados, no se puede eliminar: borrarlo borraría esos registros.

## Impacto sobre otras funcionalidades
- **Cheques** (`cheques-clientes.md`): estado nuevo ANULADO; el rechazo actúa sobre el pago del cliente.
- **Pagos de Compras**: un cheque anulado no se puede endosar.
- **Reporte del cliente**: solo pagos vigentes.
