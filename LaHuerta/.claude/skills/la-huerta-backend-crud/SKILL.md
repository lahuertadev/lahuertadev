---
name: la-huerta-backend-crud
description: Crear o extender CRUDs backend Django/DRF en La Huerta siguiendo el patrón real del proyecto.
---

# La Huerta Backend CRUD

Usar esta skill cuando el usuario pida:
- crear una app backend nueva
- extender un CRUD existente
- agregar endpoints DRF
- refactorizar una app backend para alinearla con el patrón de La Huerta

## Objetivo
Implementar cambios backend siguiendo el patrón existente en apps como `factura`, respetando:
- views delgadas
- serializers para validación
- repositories para acceso a datos
- services solo cuando haya lógica de dominio real
- tests por capa

## Procedimiento
1. Analizar si la app ya existe.
2. Buscar una app similar en el proyecto.
3. Listar archivos a crear o modificar.
4. Decidir explícitamente si el caso necesita `service.py` o si alcanza con `view + repository`.
5. Explicar el enfoque brevemente.
6. Recién después proponer implementación.

## Criterio para usar service
No usar `service.py` por defecto.

Usar `service.py` solo cuando:
- haya lógica de negocio
- intervengan varias entidades
- haya reglas de dominio
- haya cálculos
- haya transacciones
- haya efectos sobre otras tablas o relaciones

Para endpoints simples como `list`, `retrieve` o gets sin lógica de dominio relevante:
- resolver con `view + repository`

## Capas esperadas
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

## Tests
Contemplar:
- `tests/repository_tests.py`
- `tests/service_tests.py`
- `tests/view_tests.py`

## Formato de respuesta
Siempre responder en este orden:
1. enfoque
2. archivos a tocar
3. decisión sobre uso o no de service
4. implementación
5. migraciones necesarias
6. estrategia de tests
7. riesgos o impacto si existen