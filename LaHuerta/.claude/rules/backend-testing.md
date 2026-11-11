# Backend testing

Aplicar esta regla al escribir o modificar tests backend.

## Estructura de tests
Los tests se organizan dentro de cada app así:
- `app_name/tests/repository_tests.py`
- `app_name/tests/service_tests.py`
- `app_name/tests/view_tests.py`

## Datos de prueba
Convención definida en DEV-144 y DEV-148. Si cambia la forma de un modelo, se corrige en un solo lugar.
- **Tests con base de datos:** factories de `core/tests/factories.py` (`make_supplier(...)`).
- **Tests de service y de views sin base de datos:** constructores de `core/tests/mocks.py` (`mock_supplier(...)`), con los campos del modelo como parámetros. Fallan si se usa un atributo que el modelo no tiene.
- **Al verificar un resultado:** guardar la entidad y preguntar sobre ella (`assert supplier.cuenta_corriente == ...`), sin recorrer relaciones (`payment.proveedor.cuenta_corriente`).
- **Las anotaciones de una consulta** no son campos: se declaran en `annotations` del constructor y solo existen si se pasan.
- **`Mock()` común** solo para repositorios y servicios inyectados, y para objetos que el test pasa de un lado a otro sin leerles atributos.
- **Entidad nueva:** agregar su constructor y sumarlo a `ALL_MOCKS` en `core/tests/test_mocks.py`.

## Qué se testea
En este proyecto se suele testear:
- repositories
- services
- views

## Repository tests
Validar:
- queries
- filtros
- búsquedas por id
- persistencia básica
- comportamiento con entidades inexistentes

## Service tests
Validar:
- reglas de negocio
- cálculos
- coordinación entre entidades
- comportamiento transaccional

## View tests
Validar:
- status codes
- estructura de response
- validaciones
- manejo de errores
- flujo HTTP esperado

## Cobertura mínima esperada
Para CRUDs importantes, contemplar:
- creación exitosa
- listado
- detalle
- actualización
- eliminación lógica o física
- entidad inexistente
- validación de campos obligatorios
- reglas de negocio relevantes

## Ante cualquier cambio de código
- Todo cambio de lógica (backend o frontend) debe venir acompañado de tests nuevos o actualizados que cubran el comportamiento agregado o modificado. No alcanza con tocar una sola capa: si el cambio afecta repository, service y views, las tres necesitan tests.
- Antes de tocar código existente, correr la suite de tests actual (al menos la de la app afectada) para tener una baseline de qué pasa y qué falla ANTES del cambio.
- Después del cambio, volver a correr esa misma suite. Si un test que antes pasaba ahora falla, no alcanza con arreglar el test para que vuelva a pasar sin revisar por qué: hay que confirmar explícitamente si la ruptura es la consecuencia esperada de haber cambiado la lógica, o un efecto colateral no buscado sobre otra funcionalidad. Reportar ambos casos al usuario, no corregir el test en silencio.
- Si hay cambios ya mezclados sin commitear y no se puede aislar fácilmente una baseline, usar `git stash` para comparar el estado sin el cambio contra el estado con el cambio, y restaurar los cambios con `git stash pop` al terminar la comparación.
- Un test que falla desde antes del cambio (no relacionado a lo que se está tocando) se reporta como preexistente, no se "arregla" de paso salvo que el usuario lo pida explícitamente.