# Backend CRUD pattern

Aplicar esta regla al crear o extender CRUDs backend.

## Flujo esperado
Antes de implementar:
1. revisar si la app ya existe
2. buscar una app similar
3. listar archivos a crear o modificar
4. decidir si el caso necesita service o si alcanza con repository
5. recién después proponer implementación

## CRUD típico
Evaluar si corresponde crear o modificar:
- `models.py`
- `serializers.py`
- `interfaces.py`
- `repositories.py`
- `service.py`
- `factory.py`
- `exceptions.py`
- `views.py`
- `urls.py`
- `tests/`

## Endpoints simples
No forzar el uso de `service.py` en:
- listados simples
- retrieve
- catálogos sin lógica de dominio

## Endpoints con dominio
Sí usar `service.py` cuando:
- el endpoint afecte varias entidades
- haya cálculo de importes
- haya actualización de relaciones
- haya impacto en cuenta corriente o estados
- haya reglas de negocio explícitas