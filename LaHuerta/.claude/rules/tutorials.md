# Tutoriales guiados

Aplicar esta regla al terminar cualquier funcionalidad nueva o al modificar una pantalla que tenga tutorial (ver DEV-138 y `docs/funcionalidades/tutoriales.md`).

## Principio
Cada pantalla con una tarea que el usuario tiene que aprender tiene su tutorial guiado: uno por pantalla, que se muestra en el botón del birrete y en la sección Tutoriales del menú. Los tutoriales y sus pasos están en la base de datos (app `tutorial`, tablas `tutorial` y `tutorial_paso`) y se cargan con migraciones de datos, en la misma rama que el cambio. El frontend no tiene datos de tutoriales.

Lo que conecta cada paso con su pantalla está en el código del frontend y tiene que coincidir con la base:
- el atributo `data-tour="<nombre>"` de cada elemento (campo `elemento` del paso, y `listo_cuando`);
- el evento que emite la pantalla al guardar con `emitTutorialEvent(evento, { id })`, declarado en `TUTORIAL_EVENTS` (`constants/tutorials.js`) (campo `evento` del paso);
- la ruta de la pantalla (campos `ruta` y `ruta_destino`).

## Funcionalidad nueva
Al proponer y al cerrar una funcionalidad nueva, evaluar si lleva tutorial e indicarlo, igual que con la documentación y la novedad.

Sí:
- pantalla nueva con un alta, un flujo o una acción que el usuario tiene que aprender;
- pantalla que ya tiene tutorial y suma un paso del flujo (campo obligatorio nuevo, nueva sección, nueva acción en el listado).

No:
- catálogos simples que se entienden solos (un solo campo `descripcion`);
- ajustes visuales o técnicos sin cambio en cómo se usa la pantalla.

Si hay dudas, preguntar al usuario.

### Cómo crearlo
1. Marcar los elementos de la pantalla con `data-tour`. Reutilizar los que ya existen: `list-add` (botón de alta de `GenericList`), `form-confirm` (Confirmar de `FormActions`), `grid-detail`, `grid-edit`, `grid-delete` y `grid-row` (acciones y filas de `components/Grid`).
2. Si un paso termina al guardar, emitir el evento después de la respuesta 2xx: `emitTutorialEvent(TUTORIAL_EVENTS.x, { id: response.data.id })`, y agregar el evento a `TUTORIAL_EVENTS`.
3. Cargar el tutorial y sus pasos con una migración de datos nueva en `backend/tutorial/migrations/`, con `RunPython` y función de reversa. Referencia: `0002_tutoriales_iniciales.py` (incluye `list_action_steps` para el recorrido de las acciones del listado). Igual que las novedades, la migración no importa constantes de la app: los valores van literales.
4. Si el formulario tiene campos que el backend exige y el formulario no marca como obligatorios, incluirlos en el tutorial (ej. el teléfono del cliente): seguir el tutorial tiene que terminar siempre en un guardado exitoso.
5. Si la funcionalidad lleva novedad (`platform-news.md`), relacionarla con el tutorial (campo `tutorial` de la novedad).
6. Actualizar `docs/funcionalidades/tutoriales.md` (tabla "Tutoriales disponibles").

## Modificar una pantalla que tiene tutorial
Antes de dar el cambio por terminado, validar que su tutorial sigue funcionando.

1. **Ver qué pasos usa la pantalla:** buscar los `data-tour` del archivo y los pasos de esa ruta en las migraciones de `backend/tutorial/migrations/` (o en el admin, Tutoriales).
2. **Revisar lo que rompe un paso:**
   - se renombró, se sacó o se movió a otra pantalla un elemento con `data-tour`;
   - cambió la ruta de la pantalla o la ruta a la que lleva un botón;
   - cambió cuándo se emite el evento de guardado, o se dejó de emitir;
   - se agregó un campo obligatorio que el tutorial no recorre (el guardado fallaría al seguirlo);
   - cambió lo que marca un elemento como completo (`data-tour-complete`).
3. **Corregir con una migración de datos nueva** de la app `tutorial` que actualice los pasos afectados (textos, elemento, orden, pasos nuevos). Nunca editar una migración de datos ya aplicada en `dev` o en producción.
4. **Probar el tutorial en la app** (escritorio y mobile, skill `run`) de punta a punta. Si el tutorial guarda un registro real, borrarlo después por la API (no directo en la base) para que se reviertan sus efectos (cuenta corriente, stock).
5. **Correr los tests** del frontend de tutoriales (`src/utils/tutorial.test.js`, `src/components/Tutorial*`) y los del backend (`pytest tutorial novedad`).

## Qué no hacer
- No cambiar la `clave` de un tutorial ya publicado: el frontend y las URLs de avance lo identifican por clave.
- No renombrar un `data-tour` ni un evento sin actualizar los pasos en la misma rama.
- No poner datos de tutoriales (pasos, textos) en el frontend.
- No guardar datos de prueba: el tutorial acompaña la acción real y las validaciones del formulario siguen activas.

## Al proponer o cerrar una implementación
Indicar, igual que con la documentación funcional y la novedad:
- si la funcionalidad lleva tutorial (nuevo o actualizado) o no, y por qué;
- si se tocó una pantalla con tutorial, qué pasos se revisaron y cómo se probó que sigue funcionando.
