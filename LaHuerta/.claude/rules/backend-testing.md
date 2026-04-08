# Backend testing

Aplicar esta regla al escribir o modificar tests backend.

## Estructura de tests
Los tests se organizan dentro de cada app así:
- `app_name/tests/repository_tests.py`
- `app_name/tests/service_tests.py`
- `app_name/tests/view_tests.py`

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