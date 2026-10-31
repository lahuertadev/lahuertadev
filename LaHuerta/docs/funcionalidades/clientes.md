# Clientes

## Objetivo
Registrar a los clientes a los que se les vende: sus datos fiscales, dónde se les factura y dónde se les entrega, cómo se les factura y su saldo de cuenta corriente.

## Alcance
Incluye:
- Alta, edición, detalle y eliminación de clientes.
- Dirección de facturación y, opcionalmente, una dirección de entrega distinta (DEV-136).
- Lista de precios opcional (DEV-135) y saldo inicial de cuenta corriente.

No incluye:
- Facturas, remitos ni pagos del cliente (ver `facturacion.md`).
- Varios contactos por cliente: hoy tiene un solo teléfono (DEV-119).

## Flujo de uso
1. En Clientes, tocar **Nuevo cliente**.
2. Cargar CUIT, razón social y, si tiene, nombre de fantasía.
3. En la sección **Dirección**, grupo **Facturación**, elegir provincia, municipio y localidad, y escribir la dirección.
4. Debajo, dejar el interruptor **¿Se entrega en otra dirección?** en No si se le entrega en la dirección de facturación. Si se le entrega en otro lugar, pasarlo a Sí: aparece el grupo **Entrega**, con provincia, municipio, localidad y dirección de entrega.
5. Elegir la condición de IVA y si se le factura con lista de precios (y cuál).
6. Cargar el saldo inicial (si tiene), la fecha de inicio de ventas, el teléfono y el estado.
7. Tocar **Registrar Cliente**. Desde el listado se puede ver el detalle, editar o eliminar cada cliente.

## Validaciones importantes
- CUIT de 11 números, único.
- Razón social única; se compara ya normalizada (mayúsculas, "S.A.", "S.R.L.").
- La localidad de facturación es obligatoria.
- Las direcciones (de facturación y de entrega) se guardan con mayúscula inicial en cada palabra y con las abreviaturas escritas de una sola forma, sin importar cómo se tipeen: "av", "AV" o "av." quedan "Av.". Las abreviaturas llevan punto (Av., Avda., Bv., Bvar., Pje., Diag., Gral., Cnel., Tte., Pte., Dr., Ing., Gdor., Sta., Sto., Nro., Esq., Dto., Dpto., Mz., Mza.); los símbolos y las siglas no (Km, PB, UF, PH, S/N, CABA). La lista está en `core/text.py` (`ADDRESS_ABBREVIATIONS`) y también se aplica a la dirección del perfil de usuario.
- Dirección de entrega: con el interruptor en Sí, provincia, municipio, localidad y dirección de entrega son obligatorias. El backend exige las dos (localidad y dirección) si llega una.
- Con lista de precios en Sí, la lista es obligatoria.
- No se puede eliminar un cliente con facturas o pagos: se lo marca como inactivo.

## Pantallas involucradas
- Listado de clientes (`/client`).
- Alta y edición (`/client/create`, `/client/edit/:id`).
- Detalle (`/client/detail/:id`): en la sección Dirección muestra la de facturación y, en Entrega, la dirección de entrega o "Igual a la de facturación".

## Endpoints involucrados
- `GET/POST /api/client/`, `GET/PUT/PATCH/DELETE /api/client/:id/`.
- Campos de la dirección de entrega: `domicilio_entrega` y `localidad_entrega`. Al guardar, la localidad llega como objeto de georef (con municipio y provincia) y el backend la crea si no existe, igual que la de facturación. En `null` significa que se entrega en la dirección de facturación.

## Consideraciones
- La dirección de entrega es un dato del cliente: las facturas y los remitos siguen mostrando la dirección de facturación.
- Al editar, el interruptor aparece en Sí si el cliente tiene dirección de entrega. Pasarlo a No la borra al guardar.
- El tutorial de Clientes recorre el interruptor de la dirección de entrega; los pasos de sus campos solo aparecen si se elige Sí.
