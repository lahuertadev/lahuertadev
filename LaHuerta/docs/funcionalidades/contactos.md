# Contactos de clientes y proveedores

## Objetivo
Guardar varios teléfonos de contacto por cliente y por proveedor, y saber para qué es cada uno (pagos, compras, el encargado del puesto, etc.).

## Alcance
Incluye:
- Contactos de clientes y de proveedores: teléfono (obligatorio), descripción y email (opcionales).
- Alta, edición y eliminación de contactos desde el formulario del cliente o del proveedor.

No incluye:
- Una pantalla propia de contactos: se cargan y se ven siempre desde su cliente o proveedor.
- Compartir un contacto entre dueños: si un número es de un cliente y de un proveedor, se carga en los dos.

## Flujo de uso
1. En el alta o la edición de un cliente o proveedor, ir a la sección **Contacto**.
2. Cargar el teléfono y, si se quiere, una descripción (para qué es) y un email.
3. Para sumar otro, tocar **Agregar contacto**: aparece una fila nueva (en el celular, una tarjeta "Contacto N").
4. Para sacar uno, tocar el tacho de su fila. Si queda uno solo, el tacho se deshabilita.
5. Guardar el cliente o proveedor: los contactos se guardan junto con él.
6. En el detalle, la sección **Contacto** muestra todos; lo que no se cargó aparece como "—".

## Validaciones importantes
- Cada cliente y cada proveedor tiene al menos un contacto.
- Teléfono obligatorio (hasta 20 caracteres; el formulario guarda solo los dígitos).
- Descripción de hasta 50 caracteres; email con formato válido. Vacíos se guardan como `NULL`.
- La descripción se guarda con mayúscula inicial en cada palabra, como los nombres ("marta COMPRAS" queda "Marta Compras"), porque suele ser un nombre o un sector.
- Un contacto pertenece a un solo dueño: un cliente o un proveedor, nunca los dos ni ninguno (restricción `contacto_un_solo_duenio` en la base).
- Al editar, solo se pueden modificar contactos del mismo cliente o proveedor.

## Pantallas involucradas
- Alta, edición y detalle de clientes (`/client/...`) y de proveedores (`/supplier/...`).
- Listados de clientes y proveedores: la columna Teléfono muestra el del primer contacto.
- Compras: los datos del proveedor elegido muestran el teléfono de su primer contacto.

## Endpoints involucrados
No tiene endpoints propios. Los de cliente (`/api/client/`) y proveedor (`/api/supplier/`) devuelven y reciben `contactos`:

```json
"contactos": [
  { "id": 1, "numero": "1155551234", "descripcion": null, "email": null },
  { "numero": "1166667777", "descripcion": "Pagos", "email": "pagos@cliente.com" }
]
```

Al guardar, los que llegan con `id` se modifican, los que llegan sin `id` se crean y los que no llegan se eliminan. En un `PATCH` sin `contactos`, quedan como están.

## Consideraciones
- Modelo `Contacto` (app `contacto`, tabla `contacto`), con una FK nullable a `Cliente` y otra a `Proveedor`. Si mañana otra entidad necesita contactos, se le suma su FK.
- Al migrar (DEV-119), el teléfono que tenía cada cliente y proveedor pasó a ser su primer contacto, sin descripción ni email, y se borró el campo `telefono`.
- Al eliminar un cliente o proveedor se eliminan sus contactos.
