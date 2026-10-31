# Tutoriales guiados

## Objetivo
Enseñar a usar cada pantalla mientras el usuario hace la tarea real, sin depender de que otra persona le explique. Lo que se carga durante un tutorial queda guardado de verdad (ej. el cliente queda creado con los datos que cargó). Ver DEV-138.

## Alcance
- Un tutorial por pantalla. Por ahora: Clientes, Facturación, Pagos de Clientes, Compras, Vacíos y Cheques emitidos.
- Botón flotante del **birrete**, abajo a la derecha, solo en las pantallas que tienen tutorial. Muestra únicamente el tutorial de esa pantalla.
- Sección **Tutoriales** al final del menú lateral, con todos los tutoriales agrupados como el menú.
- Registro por usuario del estado de cada tutorial: sin terminar, completado u omitido.
- Oferta del tutorial desde el aviso de una novedad que lo tenga (ver `novedades.md`).

No incluye: datos de prueba ni modo "demo". Todo lo que se carga durante un tutorial se guarda como cualquier alta.

## Tutoriales disponibles

| Tutorial | Clave | Pantallas | Qué enseña |
|---|---|---|---|
| Clientes | `clients` | Clientes → Nuevo cliente | Alta de un cliente (con o sin lista de precios, con o sin dirección de entrega) y, en el listado, cómo ver el detalle, editar y eliminar. |
| Facturación | `bills` | Facturación → Nueva factura | Qué hay en Facturas y en Remitos, y cómo hacer una factura (precio de la lista o a mano según el cliente). |
| Pagos de Clientes | `client-payments` | Pagos de Clientes → Nuevo pago | Registrar un pago (con los datos del cheque si es con cheque) y las acciones del listado. |
| Compras | `purchases` | Compras → Nueva compra → Carga simple | Diferencia entre carga simple y masiva, cargar una compra simple y las acciones del listado. |
| Vacíos | `empty-movements` | Vacíos → Nuevo movimiento → Carga de vacíos | Diferencia entre carga y devolución, cargar un movimiento (proveedor, fecha, comprobante y renglones) y las acciones del listado. |
| Cheques emitidos | `own-checks` | Cheques emitidos → Nuevo cheque | Registrar un cheque propio (número, banco, importe y fechas, con la de depósito si es diferido) y, en el listado, cómo verlo, editarlo, cobrarlo o anularlo. |

## Flujo de uso
1. El usuario abre un tutorial de una de estas dos formas:
   - en una pantalla con tutorial, toca el birrete: aparece el tutorial de esa pantalla, con su estado, y "Ver todos los tutoriales";
   - desde el menú, entra en **Tutoriales** y elige uno: la app lo lleva a la pantalla y lo arranca.
2. Toca **Empezar** (o **Repetir** si ya lo completó). Si ya está en una pantalla del tutorial, arranca ahí; si no, la app lo lleva a la primera.
3. Cada paso oscurece el resto de la pantalla, resalta un elemento y explica qué hacer. Hay dos tipos de pasos:
   - **De acción:** el tutorial avanza cuando el usuario llega a la pantalla que pide el paso (ej. toca "Nuevo cliente"), elige una opción, completa un campo y toca **Continuar** (solo se habilita con el campo completo) o guarda con éxito.
   - **De recorrido:** muestran algo sin cargar nada (ej. las pestañas Facturas y Remitos, o los íconos de ver, editar y eliminar de la fila) y se sigue con **Siguiente**. Los íconos de la fila no se pueden tocar durante el recorrido.
4. Después de guardar, en los listados se recorren las acciones de la fila del registro recién creado (si no está en la página visible, la primera fila). En el celular, como no hay íconos en la fila, se muestra que tocando la fila se abre el detalle.
5. Con **<** vuelve al paso anterior de la misma pantalla, sin perder lo cargado (ej. para corregir un campo). Desde ahí sigue con **>**, que se habilita si el paso está completo. No vuelve a una pantalla anterior, porque se perdería lo cargado.
6. Al terminar el último paso, el tutorial queda **completado**.
7. Con **Salir** se abandona en cualquier momento y queda **omitido**. Se puede volver a empezar desde el birrete o desde la sección Tutoriales. Si lo vuelve a empezar en la misma pantalla con el formulario a medio cargar, **retoma** después del último campo completo.

## Validaciones y reglas importantes
- **Las validaciones del formulario siguen funcionando:** el tutorial no permite saltear campos obligatorios ni guarda datos de prueba. Si el guardado falla (ej. CUIT inválido), el tutorial se queda en ese paso y el error de la pantalla se ve encima del oscurecido.
- **Pasos que dependen de lo que elige el usuario:** si un campo no aparece (ej. la lista de precios cuando el cliente no usa lista, la dirección de entrega cuando se le entrega en la de facturación, o los datos del cheque cuando no paga con cheque), ese paso se saltea.
- **Completado es definitivo:** si el usuario repite un tutorial completado y sale a mitad de camino, sigue figurando como completado.
- **Oferta desde novedades:** si una novedad tiene tutorial y el usuario no lo completó, el aviso de la novedad muestra **Ver tutorial**. Si ya lo completó, no se le vuelve a ofrecer solo, pero sigue disponible en el birrete y en la sección Tutoriales.
- **Por rol:** solo se ofrecen tutoriales de pantallas a las que el rol tiene acceso.
- **Si cambia de pantalla:** si vuelve a una pantalla anterior del tutorial (ej. cancela el formulario), retoma desde el primer paso de esa pantalla. Si va a una pantalla que no es del tutorial, queda en pausa con las opciones **Volver al tutorial** y **Salir**.
- Ni la tecla Escape ni un clic fuera del elemento resaltado cierran el tutorial: se sale solo con **Salir**.

## Datos

| Tabla | Qué guarda |
|---|---|
| `tutorial` | Una fila por tutorial: clave (única), título, descripción, sección del menú, rol destino opcional, orden en la sección Tutoriales y si está activo. |
| `tutorial_paso` | Los pasos de cada tutorial, en orden: ruta de la pantalla, elemento a resaltar (el `data-tour` de la pantalla), título, texto, cómo avanza (`next` siguiente, `route` llegar a una ruta, `event` guardado exitoso, `check` condición del campo) con su dato (ruta destino, evento o condición y si pide Continuar), y si es opcional, de solo lectura, en qué dispositivo va y qué indica que la pantalla cargó (`listo_cuando`). |
| `tutorial_usuario` | Una fila por usuario y tutorial (FK a `tutorial`): estado (`iniciado`, `completado`, `omitido`) y fecha del último cambio. Un usuario no puede tener dos filas para el mismo tutorial. |

Los tutoriales y sus pasos se cargan con migraciones de datos de la app `tutorial` (los iniciales, en `0002_tutoriales_iniciales`) y se pueden ver y corregir desde el admin de Django (**Tutoriales**). El frontend no tiene datos de tutoriales: los pide al backend.

En el código de cada pantalla queda solo lo que conecta los pasos con ella: los atributos `data-tour` de los elementos y el aviso de guardado (`emitTutorialEvent`). Si se renombra uno de ellos, hay que actualizar los pasos que lo usan con una migración.

## Endpoints involucrados
- `GET /api/tutorials/` — tutoriales activos del rol del usuario logueado, en orden, con sus pasos y el estado de cada uno para ese usuario.
- `POST /api/tutorials/{clave}/start/` — lo marca como iniciado (404 si no existe o no es para su rol).
- `POST /api/tutorials/{clave}/complete/` — lo marca como completado.
- `POST /api/tutorials/{clave}/skip/` — lo marca como omitido (si ya estaba completado, no cambia).

## Pantallas involucradas
- Botón del birrete en las pantallas con tutorial (`components/TutorialButton`).
- Sección Tutoriales (`pages/tutorial/TutorialList.jsx`, ruta `/tutorials`), al pie del menú lateral, separada de las demás secciones (`bottom: true` en `headerOptions`).
- Clientes, Facturación, Pagos de Clientes, Compras, Vacíos y Cheques emitidos: listados y formularios de alta.
- Inicio: aviso de novedades con "Ver tutorial".

## Consideraciones
- **Agregar el tutorial de otra pantalla:**
  1. Marcar los elementos de la pantalla con el atributo `data-tour`. Si un paso termina al guardar, la pantalla avisa con `emitTutorialEvent(evento, { id })` después de la respuesta exitosa (el evento va en `TUTORIAL_EVENTS`). Para el recorrido de las acciones del listado ya están los de la grilla (`grid-detail`, `grid-edit`, `grid-delete`, `grid-row`).
  2. Cargar el tutorial y sus pasos con una migración de datos de la app `tutorial` (referencia: `0002_tutoriales_iniciales`).
  3. Para ofrecerlo desde el Inicio, relacionarlo con una novedad (campo `tutorial`).
- **Cambiar un texto o un paso** se hace con una migración de datos (o desde el admin para una corrección puntual): no hace falta tocar el frontend. El avance de los usuarios no se pierde, porque está relacionado con el tutorial y no con sus pasos.
- **No cambiar la clave** de un tutorial ya publicado: el frontend y las URLs de avance lo identifican por clave.
- El tutorial de Clientes incluye el teléfono, aunque el formulario no lo marca como obligatorio, porque el backend lo exige al registrar el cliente.
- El listado de clientes no ordena los más nuevos primero: el cliente recién creado puede no estar en la primera página y entonces el recorrido usa la primera fila.
- El tutorial de Facturación termina al generar la factura: la app pasa a la vista de impresión, que queda fuera del menú.
- Funciona en el celular y en tema claro y oscuro. Los desplegables y calendarios se abren por encima del oscurecido.
- Se usa la librería `driver.js` para el resaltado y los globos.
