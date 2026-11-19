# Cheques de Clientes (de terceros)

## Objetivo
Gestionar los cheques que La Huerta recibe de sus clientes como medio de pago, incluyendo su ciclo de vida (depositar, acreditar, rechazar) y su uso posterior para pagarle a proveedores (endoso).

## Alcance
- Registrar un cheque al cargar un pago de cliente (tipo de pago "Cheque").
- Editar los datos de un cheque ya cargado, incluyendo su número.
- Listar y ver el detalle de cheques recibidos, con el cliente que lo abonó.
- Endosar un cheque a un pago de compra (usarlo para pagarle a un proveedor).
- Depositar, acreditar o rechazar un cheque en cartera.
- Eliminar un pago de cliente con cheque, o anular un pago de compra que usó un cheque endosado.

## Estados del cheque

| Estado      | Descripción |
|-------------|-------------|
| EN_CARTERA  | Cheque recibido, sin depositar ni endosar |
| DEPOSITADO  | Cheque depositado en la cuenta de La Huerta |
| ACREDITADO  | Cheque acreditado (cobrado) |
| RECHAZADO   | Cheque rechazado por el banco tras depositarse |
| ENDOSADO    | Cheque entregado a un proveedor como pago de una compra |

## Identidad del cheque

`numero` **no es único de forma global**: pueden existir dos cheques con el mismo número si son de bancos distintos, o si pertenecen a clientes distintos. La identidad real del registro es `id` (no `numero`), tanto en la base de datos como en las URLs del frontend y las llamadas a la API.

Esto reemplazó un diseño anterior donde `numero` era la primary key global del modelo: cargar un segundo cheque con el mismo número (aunque fuera de otro banco o cliente) sobrescribía silenciosamente el cheque existente, sin ningún error visible. Ver DEV-120.

## Flujo de uso

### Registrar un cheque (alta de pago de cliente)
1. Acceder a **Pagos de Clientes** → **Nuevo pago**.
2. Seleccionar cliente, importe, fecha de pago y tipo de pago **Cheque**.
3. Completar número, banco y fecha de emisión del cheque. Opcionalmente, marcar "Cheque diferido" y cargar la fecha de depósito.
4. Confirmar. El cheque queda en estado EN_CARTERA, la cuenta corriente del cliente se descuenta por el importe del pago.

### Formulario de pago de cliente (DEV-150)
- **Cliente:** se elige con un buscador, el mismo de Facturación: se escribe la razón social, el nombre de fantasía o el CUIT (con o sin guiones), sin distinguir mayúsculas ni acentos.
- **Saldo:** al elegir el cliente se muestra su saldo en cuenta corriente (lo que debe hoy) y, resaltado, cómo queda con el pago ("Saldo después del pago"), que se actualiza al escribir el importe. Al editar se llama "Saldo al guardar los cambios": como el saldo de hoy ya tiene descontado el pago, se le suma lo que tenía guardado y se le resta el importe nuevo (si se cambia el cliente, al nuevo se le resta el importe entero).
- **Tipo de pago:** en orden alfabético, como en Pagos de Compras.

### Editar un pago con cheque
1. Desde el listado o detalle de **Pagos de Clientes**, editar el pago.
2. Todos los campos del cheque (número, banco, fecha de emisión, fecha de depósito) son editables mientras el cheque **no esté endosado**.
3. Si el cheque **ya fue endosado** a un proveedor, el formulario bloquea Cliente, Importe y todos los datos del cheque (número, banco, fecha de emisión, fecha de depósito), mostrando un aviso. Solo Observaciones queda editable.

### Endosar un cheque a un proveedor
1. Al cargar un **Pago de Compra** con tipo de pago "Cheque", se elige un cheque en cartera desde el desplegable (identificado por `id`, no por `numero`).
2. Al confirmar, el cheque pasa a estado ENDOSADO, queda vinculado a ese pago de compra, y la cuenta corriente del proveedor se descuenta por el importe abonado. Un mismo pago, y por lo tanto un mismo cheque, puede cubrir varias compras del proveedor.

### Depositar, acreditar, rechazar
Desde el listado de Cheques, sobre un cheque EN_CARTERA: acción "Depositar" (→ DEPOSITADO). Sobre uno DEPOSITADO: "Acreditar" (→ ACREDITADO) o "Rechazar" (→ RECHAZADO, revierte la cuenta corriente del cliente si el cheque tiene un pago de cliente asociado).

### Solapas del listado y aviso de depósito (DEV-150)
El listado de Cheques tiene tres solapas debajo del título, como Pagos de Compras. Se combinan con los filtros.
- **Todos:** todos los cheques (es la que queda elegida al entrar).
- **Pendientes:** solo los que ya hay que depositar: EN_CARTERA y con la fecha de depósito hoy o antes. No entran los que tienen la fecha de depósito más adelante ni los que no la tienen.
- **Rechazados:** solo los RECHAZADO.

En esos mismos cheques pendientes, el ícono de Depositar de la columna Acción se resalta con un círculo ámbar que aparece y se va, y su tooltip dice "Depositar: la fecha de depósito ya llegó". Al depositar, el listado se recarga en la misma solapa y con los mismos filtros.

El estado ACREDITADO no tiene solapa: se busca con el filtro Estado.

### Rechazo de un cheque endosado a un proveedor
Un cheque ENDOSADO también puede rechazarse. Además de lo anterior (DEV-150):
1. La Huerta vuelve a deberle al proveedor el importe del cheque (sube su cuenta corriente).
2. El pago a proveedor baja su importe en lo que valía el cheque. Esa parte se descuenta primero de la compra más nueva que cubre el pago, después de la anterior, y así; esas compras vuelven a PARCIAL o PENDIENTE. Si las compras no alcanzan, el resto sale de lo que el pago tenía a cuenta.
3. El pago no se elimina aunque quede en cero: el cheque rechazado queda visible en él como registro (ver `pagos-compras.md`).

### Eliminar un pago de cliente con cheque
- Si el cheque **no está endosado**: se elimina el pago y el cheque junto con él, revirtiendo la cuenta corriente del cliente.
- Si el cheque **ya está endosado**: el borrado se bloquea con un mensaje que indica el proveedor y la fecha del pago a proveedor que hay que resolver primero.
- Si el cheque **se usó en un pago a proveedor que después se anuló**: el borrado también se bloquea. El pago anulado conserva el cheque como registro, así que el cheque no se puede borrar; el mensaje indica los números de esos pagos. Lo mismo pasa al cambiar el tipo de pago de Cheque a otro, porque eso borra el cheque. Cuando los pagos de clientes se puedan anular en lugar de eliminarse, este caso se resuelve anulando el pago del cliente.

### Anular un pago de compra que usó un cheque endosado
Los pagos de compras no se eliminan, se anulan (ver `pagos-compras.md`). Al anular el pago de compra, el cheque se desendosa automáticamente (vuelve a EN_CARTERA, pierde el vínculo con ese pago de compra) y la cuenta corriente del proveedor se revierte. Un cheque rechazado no vuelve a cartera: sigue rechazado, y su importe no se devuelve otra vez. El cheque vuelve a estar disponible para otro pago; el pago anulado queda como registro.

## Reglas de negocio

- **Duplicado por número + banco + cliente**: no puede cargarse un cheque con el mismo número, banco y cliente que uno ya existente. Un mismo número puede repetirse si el banco o el cliente son distintos.
- **Cheque endosado, datos congelados**: una vez que un cheque fue endosado a un proveedor, ninguno de sus datos (número, banco, importe, fechas) puede modificarse desde el pago de cliente que lo originó — el cheque ya es un documento físico en manos del proveedor. Solo Observaciones del pago sigue editable.
- **Borrado de pago de cliente bloqueado si el cheque está endosado**: hay que resolver (editar o anular) el pago al proveedor primero.
- **Un cheque usado en un pago a proveedor no se borra nunca**, aunque ese pago esté anulado: queda en el pago como registro (tabla `pago_compra_cheque`, igual que los cheques emitidos en `pago_compra_cheque_propio`). Por eso tampoco se puede eliminar el pago de cliente que lo trajo ni cambiarle el tipo de pago a otro que no sea Cheque. Sus datos sí se pueden editar una vez que el pago a proveedor se anuló; el pago anulado sigue mostrando el importe que valía el cheque cuando se pagó.
- **Anular un pago de compra con cheque no tiene restricción propia**: el efecto es desendosar el cheque y revertir la cuenta corriente del proveedor.

## Validaciones importantes
- Duplicado: `numero` + `banco` + `cliente` (vía la relación indirecta `Cheque.pago_cliente.cliente`, ya que `Cheque` no tiene FK directa a `Cliente`).
- Los campos de cheque son obligatorios cuando el tipo de pago es "Cheque" (número, banco, fecha de emisión).
- Con cheque endosado: cualquier intento de cambiar cliente, número, banco, importe, fecha de emisión o fecha de depósito se rechaza con `CheckEditBlockedException`, tanto en el frontend (campos deshabilitados) como en el backend (por si se fuerza el request).

## Pantallas involucradas
- `/client-payment` — Listado de pagos de clientes
- `/client-payment/create`, `/client-payment/edit/:id` — Formulario de pago de cliente
- `/client-payment/detail/:id` — Detalle de pago de cliente (muestra cliente, cheque y banco)
- `/check` — Listado de cheques (columna Cliente; solapas Todos, Pendientes y Rechazados)
- `/check/detail/:id` — Detalle de cheque (sección Datos del Cliente; si está endosado, sección Pago Asociado con el link "Pago N° …" al detalle del pago a proveedor)
- `/purchase-payment/create` — Formulario de pago de compra (sección Cheque)

## Endpoints involucrados
- `POST /api/client-payments/`, `PUT /api/client-payments/:id/`, `PATCH /api/client-payments/:id/` — Alta/edición de pago con cheque
- `DELETE /api/client-payments/:id/` — Eliminar pago (bloqueado si el cheque está endosado)
- `GET /api/checks/`, `GET /api/checks/:id/` — Listado/detalle de cheques. El listado acepta `solapa=pendientes|rechazados` además de los filtros (`banco`, `estado`, `endosado`, `fecha_deposito_desde`, `fecha_deposito_hasta`).
- `POST /api/checks/:id/deposit|credit|reject/` — Transiciones de estado
- `POST /api/purchase-payments/` — Endosa un cheque al crearse (tipo de pago "Cheque")
- `POST /api/purchase-payment/:id/cancel/` — Anula el pago (queda como registro) y desendosa el cheque

## Impacto sobre otras funcionalidades
- **Pagos de compras**: un cheque de cliente endosado es uno de los medios de pago disponibles. Anular ese pago de compra desendosa el cheque automáticamente.
- **Cuenta corriente del cliente**: se descuenta al cargar el pago, se revierte al eliminarlo (si el cheque no está endosado) o al rechazar el cheque.
- **Cuenta corriente del proveedor**: se descuenta al endosar un cheque a un pago de compra, se revierte al anular ese pago.
