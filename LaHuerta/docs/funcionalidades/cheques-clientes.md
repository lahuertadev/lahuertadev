# Cheques de Clientes (de terceros)

## Objetivo
Gestionar los cheques que La Huerta recibe de sus clientes como medio de pago, incluyendo su ciclo de vida (depositar, acreditar, rechazar) y su uso posterior para pagarle a proveedores (endoso).

## Alcance
- Registrar un cheque al cargar un pago de cliente (tipo de pago "Cheque").
- Editar los datos de un cheque ya cargado, incluyendo su número.
- Listar y ver el detalle de cheques recibidos, con el cliente que lo abonó.
- Endosar un cheque a un pago de compra (usarlo para pagarle a un proveedor).
- Depositar, acreditar o rechazar un cheque en cartera.
- Eliminar un pago de cliente con cheque, o un pago de compra que usó un cheque endosado.

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

### Editar un pago con cheque
1. Desde el listado o detalle de **Pagos de Clientes**, editar el pago.
2. Todos los campos del cheque (número, banco, fecha de emisión, fecha de depósito) son editables mientras el cheque **no esté endosado**.
3. Si el cheque **ya fue endosado** a un proveedor, el formulario bloquea Cliente, Importe y todos los datos del cheque (número, banco, fecha de emisión, fecha de depósito), mostrando un aviso. Solo Observaciones queda editable.

### Endosar un cheque a un proveedor
1. Al cargar un **Pago de Compra** con tipo de pago "Cheque", se elige un cheque en cartera desde el desplegable (identificado por `id`, no por `numero`).
2. Al confirmar, el cheque pasa a estado ENDOSADO, queda vinculado a ese pago de compra, y la cuenta corriente del proveedor se descuenta por el importe abonado.

### Depositar, acreditar, rechazar
Desde el listado de Cheques, sobre un cheque EN_CARTERA: acción "Depositar" (→ DEPOSITADO). Sobre uno DEPOSITADO: "Acreditar" (→ ACREDITADO) o "Rechazar" (→ RECHAZADO, revierte la cuenta corriente del cliente si el cheque tiene un pago de cliente asociado).

### Eliminar un pago de cliente con cheque
- Si el cheque **no está endosado**: se elimina el pago y el cheque junto con él, revirtiendo la cuenta corriente del cliente.
- Si el cheque **ya está endosado**: el borrado se bloquea con un mensaje que indica el proveedor y la fecha del pago a proveedor que hay que resolver primero.

### Eliminar un pago de compra que usó un cheque endosado
Es una operación válida y soportada: al eliminar el pago de compra, el cheque se desendosa automáticamente (vuelve a EN_CARTERA, pierde el vínculo con ese pago de compra) y la cuenta corriente del proveedor se revierte. No hay ninguna restricción para esto — es simétrico al flujo de "eliminar un pago de cliente con cheque sin endosar".

## Reglas de negocio

- **Duplicado por número + banco + cliente**: no puede cargarse un cheque con el mismo número, banco y cliente que uno ya existente. Un mismo número puede repetirse si el banco o el cliente son distintos.
- **Cheque endosado, datos congelados**: una vez que un cheque fue endosado a un proveedor, ninguno de sus datos (número, banco, importe, fechas) puede modificarse desde el pago de cliente que lo originó — el cheque ya es un documento físico en manos del proveedor. Solo Observaciones del pago sigue editable.
- **Borrado de pago de cliente bloqueado si el cheque está endosado**: hay que resolver (editar o eliminar) el pago al proveedor primero.
- **Borrado de pago de compra con cheque no tiene restricción propia**: siempre se puede eliminar, sin importar si el cheque de cliente usado sigue existiendo o no; el efecto es desendosar el cheque y revertir la cuenta corriente del proveedor.

## Validaciones importantes
- Duplicado: `numero` + `banco` + `cliente` (vía la relación indirecta `Cheque.pago_cliente.cliente`, ya que `Cheque` no tiene FK directa a `Cliente`).
- Los campos de cheque son obligatorios cuando el tipo de pago es "Cheque" (número, banco, fecha de emisión).
- Con cheque endosado: cualquier intento de cambiar cliente, número, banco, importe, fecha de emisión o fecha de depósito se rechaza con `CheckEditBlockedException`, tanto en el frontend (campos deshabilitados) como en el backend (por si se fuerza el request).

## Pantallas involucradas
- `/client-payment` — Listado de pagos de clientes
- `/client-payment/create`, `/client-payment/edit/:id` — Formulario de pago de cliente
- `/client-payment/detail/:id` — Detalle de pago de cliente (muestra cliente, cheque y banco)
- `/check` — Listado de cheques (columna Cliente)
- `/check/detail/:id` — Detalle de cheque (sección Datos del Cliente)
- `/purchase-payment/create` — Formulario de pago de compra (sección Cheque)

## Endpoints involucrados
- `POST /api/client-payments/`, `PUT /api/client-payments/:id/`, `PATCH /api/client-payments/:id/` — Alta/edición de pago con cheque
- `DELETE /api/client-payments/:id/` — Eliminar pago (bloqueado si el cheque está endosado)
- `GET /api/checks/`, `GET /api/checks/:id/` — Listado/detalle de cheques
- `POST /api/checks/:id/deposit|credit|reject/` — Transiciones de estado
- `POST /api/purchase-payments/` — Endosa un cheque al crearse (tipo de pago "Cheque")
- `DELETE /api/purchase-payments/:id/` — Elimina el pago y desendosa el cheque (sin restricciones)

## Impacto sobre otras funcionalidades
- **Pagos de compras**: un cheque de cliente endosado es uno de los medios de pago disponibles. Eliminar ese pago de compra desendosa el cheque automáticamente.
- **Cuenta corriente del cliente**: se descuenta al cargar el pago, se revierte al eliminarlo (si el cheque no está endosado) o al rechazar el cheque.
- **Cuenta corriente del proveedor**: se descuenta al endosar un cheque a un pago de compra, se revierte al eliminar ese pago.
