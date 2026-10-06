# Compras

## Objetivo
Registrar las compras que La Huerta realiza a sus proveedores, incluyendo los productos adquiridos, cantidades, precios y señas. Cada compra actualiza automáticamente la cuenta corriente del proveedor.

## Alcance
- Crear, editar y eliminar compras.
- Cargar de una vez varias compras a distintos proveedores para una misma fecha (carga masiva).
- Listar compras con filtros por proveedor, importe y rango de fechas.
- Cada compra tiene uno o más ítems (productos) con cantidad, precio por bulto y precio unitario.
- El importe final se calcula como: `Σ(cantidad × precio_bulto) - seña`.
- La cuenta corriente del proveedor se ajusta automáticamente al crear, editar o eliminar una compra.

## Flujo de uso
1. El usuario accede a **Compras** desde el menú principal.
2. Ve el listado de compras con número, fecha, proveedor, bultos, seña e importe.
3. Hace clic en **Nueva compra** y elige el tipo de carga: **Carga simple** (un proveedor para una fecha) o **Carga masiva** (ver más abajo).
4. En la carga simple, selecciona el proveedor (autocomplete), ingresa fecha, bultos y seña (opcional).
5. Agrega productos a la tabla de ítems: selecciona producto, ingresa cantidad, precio por bulto y precio unitario.
6. El formulario calcula el subtotal por ítem y el total general en tiempo real.
7. Confirma. El sistema guarda la compra, actualiza la cuenta corriente del proveedor y redirige al listado.
8. Desde el listado puede editar o eliminar una compra existente.

## Validaciones importantes
- Debe seleccionarse un proveedor.
- La fecha es obligatoria.
- Los bultos deben ser un número entero mayor a 0.
- Al menos un producto es requerido.
- No se puede repetir el mismo producto en una misma compra.
- Si el proveedor ya tiene una compra cargada en esa fecha, se muestra un aviso debajo del proveedor y otra vez al confirmar. No es bloqueante: se puede guardar igual. Al editar, la propia compra no cuenta.
- Cantidad y precio por bulto son obligatorios por ítem.
- El precio unitario es opcional.

## Pantallas involucradas
- `/buy` — Listado de compras
- `/buy/create` — Elección del tipo de carga (simple o masiva)
- `/buy/create/simple` — Formulario de nueva compra (un proveedor)
- `/buy/create/bulk` — Carga masiva de compras
- `/buy/edit/:id` — Formulario de edición de compra

## Endpoints involucrados
- `GET /buy/` — Listado con filtros opcionales (`proveedor_id`, `fecha_desde`, `fecha_hasta`, `importe_min`, `importe_max`)
- `POST /buy/` — Crear compra
- `POST /buy/bulk/` — Crear varias compras para una misma fecha (carga masiva)
- `GET /buy/:id/` — Detalle de compra
- `PUT /buy/:id/` — Actualizar compra
- `DELETE /buy/:id/` — Eliminar compra

## Carga masiva

### Objetivo
En el Mercado Central se compra en una misma fecha a varios proveedores (uno por puesto). La carga masiva permite registrar todas esas compras en una sola sesión, sin volver a cargar la fecha ni reiniciar el formulario por cada proveedor. El resultado es el mismo que cargarlas una por una: **una compra separada por proveedor**.

### Flujo de uso
1. En **Nueva compra** se elige **Carga masiva**.
2. Se ingresa la fecha una sola vez, arriba de todo. Todas las compras de la carga usan esa fecha.
3. Se completa el primer bloque: proveedor, seña (opcional), productos y vacíos, igual que en la carga simple.
4. Con **Agregar proveedor** se suma otro bloque, y así por cada proveedor de la planilla. Cada bloque se puede compactar con la flecha de su encabezado, que muestra el proveedor y el total de esa compra.
5. Si el proveedor elegido ya tiene una compra en esa fecha, se avisa debajo del selector (sin bloquear).
6. Se presiona **Confirmar N compras**. Antes de guardar, el sistema muestra una advertencia agrupada por proveedor si:
   - el proveedor ya tiene una compra cargada para esa fecha, o
   - faltan vacíos (misma regla que en la carga simple).
   El usuario puede volver a revisar o guardar igual.
7. Si todas se guardan, vuelve al listado de compras con un aviso de éxito.
8. Si alguna falla, las que se guardaron quedan marcadas como **guardadas** (con su número de compra) y bloqueadas, y las que fallaron muestran su error. Se corrigen y se vuelve a confirmar: solo se envían las que faltan.

### Validaciones importantes
- La fecha es obligatoria y queda fija una vez que hay compras guardadas en la carga.
- Un proveedor no puede repetirse en la misma carga: al elegirlo en un bloque, desaparece del selector de los demás.
- Un mismo producto puede cargarse para distintos proveedores, pero no dos veces para el mismo (igual que en la carga simple).
- Cada compra se valida y guarda de forma independiente: un error en una no impide guardar las otras.

### Endpoint
`POST /buy/bulk/` recibe `{ fecha, compras: [{ proveedor, senia, items, vacios }] }` y responde `{ creadas: [{ index, compra }], errores: [{ index, errores }] }`, donde `index` es la posición de la compra en la lista enviada.
- `201` — se guardaron todas.
- `207` — se guardaron algunas.
- `400` — no se guardó ninguna, o la carga es inválida (sin fecha, sin compras o con un proveedor repetido).

## Vacíos

### Concepto
En el mercado, muchos productos se compran dentro de contenedores retornables (cajones, jaulas, bandejas) que tienen un valor de depósito. Ese depósito se llama **vacío**. Cuando el contenedor se devuelve al proveedor, el valor del vacío se reintegra. Si no se devuelve, se cobra el producto más el vacío.

### Registro en la compra
Al crear o editar una compra se puede registrar la cantidad de vacíos por tipo de contenedor, junto con el precio de depósito de cada uno. Este registro sirve para tener trazabilidad y gestionar las devoluciones futuras.

### Tipos de contenedor y vacíos
No todos los tipos de contenedor generan vacíos. La regla está definida en el campo `requiere_vacio` del modelo `TipoContenedor`:

| Tipo de contenedor | Requiere vacío | Motivo |
|--------------------|---------------|--------|
| Cajón | Sí | Contenedor de madera/metal retornable |
| Jaula | Sí | Contenedor metálico retornable |
| Bandeja | Sí | Bandeja retornable |
| Bolsa | No | Envase descartable |
| Unidad | No | Productos que se venden sueltos (ej: sandía). No hay contenedor que devolver |
| Riestra | No | Se vende la tira sola, sin contenedor retornable |
| Caja | No | Caja de cartón descartable (reemplaza al cajón de madera en algunos productos, ej: manzana) |

### Advertencia en el formulario
Si se compran productos con tipo de venta **Bulto** y su contenedor requiere vacío, el sistema muestra una advertencia si los vacíos cargados son insuficientes o no fueron registrados. El usuario puede guardar de todas formas (por ejemplo, cuando el proveedor usa cajas de cartón en lugar de cajones de madera y no cobra el vacío).

## Consideraciones
- La cuenta corriente del proveedor (`cuenta_corriente`) se actualiza automáticamente en el backend con cada operación de compra.
- Al editar una compra y cambiar el proveedor, el sistema ajusta el balance de ambos proveedores.
- Al eliminar una compra, el importe se revierte en la cuenta corriente del proveedor.
- El precio unitario no afecta el cálculo del importe total; es un dato informativo para la gestión de precios de venta.
- Los vacíos **no afectan el importe** de la compra. Son únicamente un registro para gestionar devoluciones.
