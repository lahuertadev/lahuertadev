# Listas de precios

## Objetivo
Definir los precios de venta de cada producto, por bulto y por unidad, agrupados en listas (ej. "Lista Mayo 2026") que después se asignan a los clientes.

## Alcance
- Crear, ver, editar y eliminar listas de precios.
- Cada producto de una lista tiene dos precios: **Precio Bulto** y **Precio Unidad**. Internamente se guardan como dos registros de `ListaPreciosProducto`, uno por tipo de venta.
- El Precio Unidad se sugiere automáticamente a partir del Precio Bulto (ver más abajo).
- Descargar la lista en PDF desde el detalle.
- Asignar la lista a varios clientes de una vez.

## Flujo de uso
1. El usuario accede a **Lista de Precios** desde el menú principal.
2. Hace clic en nueva lista e ingresa nombre y descripción (opcional).
3. En la sección **Productos** carga una fila por producto: elige el producto e ingresa el **Precio Bulto**.
4. El **Precio Unidad** se completa solo con la sugerencia. Se puede corregir a mano.
5. Al completar una fila se agrega automáticamente una fila nueva vacía.
6. Confirma con **Registrar Lista** y el sistema redirige al detalle de la lista.
7. Desde el detalle puede pasar a **Editar**: ahí modifica nombre, descripción y precios en la grilla, o agrega/elimina productos.

## Sugerencia del Precio Unidad
Al cargar o modificar el Precio Bulto (en creación, en la grilla de edición y en el diálogo "Agregar Producto"):

`Precio Unidad = (Precio Bulto × 1,05) / divisor`, **redondeado siempre para arriba a la centena**.

- El divisor es el **peso aproximado** si el producto se vende por peso (Kilogramo), o la **cantidad por bulto** si se vende por cantidad (Unidad, Paquete, Maple, Diente, Planta).
- Ejemplo: cajón de Manzana Roja de ~18 kg a $80.000 → 84.000 / 18 = 4.666,67 → **$4.700/kg**.
- Si el producto se vende por cantidad y el bulto trae una sola unidad (ej. Sandía), la unidad es el mismo bulto: el Precio Unidad sugerido es **igual** al Precio Bulto, sin recargo.
- Si el producto no tiene peso aproximado ni cantidad por bulto cargados, no hay sugerencia y el Precio Unidad se carga a mano.
- Una vez que el Precio Unidad se edita a mano, cambiar el Precio Bulto ya no lo pisa. Si se borra el Precio Unidad, vuelve a completarse con la sugerencia.

## Asignar a clientes
Desde el **detalle** o desde **Editar lista**, el botón **Asignar a clientes** abre un diálogo con los clientes activos:

1. Se puede buscar por razón social, nombre de fantasía o CUIT.
2. Cada cliente muestra qué lista tiene hoy ("Sin lista", u otra). Los que ya tienen esta lista aparecen como "Ya asignado".
3. Se marcan los clientes (o "Seleccionar todos" sobre lo filtrado) y se confirma con **Asignar a N clientes**.
4. Los elegidos pasan a usar esta lista, aunque tuvieran otra; se avisa antes cuántos cambian de lista.

El diálogo solo asigna, no desasigna: un cliente sin lista no se puede facturar. Para sacar a un cliente de una lista, se le asigna otra.

Endpoint: `POST /price_list/{id}/assign_clients/` con `{ "client_ids": [...] }`. Si algún cliente no existe, no se asigna a ninguno.

## Validaciones importantes
- El nombre de la lista es obligatorio.
- El nombre se guarda siempre con cada palabra en mayúscula y sin espacios repetidos (ej. "copia de lista mino" → "Copia De Lista Mino"). Lo aplica el backend al crear, al editar y al duplicar una lista.
- El nombre de la lista es único. En creación, si ya existe una lista con ese nombre (sin distinguir mayúsculas ni espacios en los extremos), se muestra un aviso debajo del campo y no se puede registrar.
- En creación, cada producto elegido debe tener Precio Bulto y Precio Unidad mayores a 0.
- Un mismo producto no puede estar en dos filas de la misma lista: el selector no ofrece productos ya elegidos.
- No se puede eliminar una lista asignada a uno o más clientes: quedarían sin lista y no se les podría facturar. Primero hay que asignarles otra lista.

## Pantallas involucradas
- `/price-list`: listado de listas de precios.
- `/price-list/create`: nueva lista de precios.
- `/price-list/detail/:id`: detalle de la lista (solo lectura y PDF).
- `/price-list/edit/:id`: edición de la lista. En mobile redirige al detalle.

## Consideraciones
- Las facturas guardan el precio usado en cada línea (`precio_aplicado`): son un snapshot. Modificar o eliminar una lista no cambia las facturas ya emitidas; las nuevas toman el precio vigente.
- La sugerencia es solo de pantalla: el backend guarda el precio final que quede en el campo, sea el sugerido o el editado a mano.
- El cálculo vive en `frontend/lahuertafrontend/src/utils/priceList.js`, compartido entre creación y edición.
