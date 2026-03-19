# Backend architecture

Aplicar esta regla al trabajar sobre archivos backend Python/Django/DRF.

## Principios
- Respetar la arquitectura existente de La Huerta.
- Priorizar consistencia con apps reales del proyecto, especialmente las que siguen el patrón de `factura`.
- No introducir capas nuevas que el proyecto no usa.

## Capas del backend
Cuando aplique, seguir esta separación:
- `models.py`: entidades del dominio
- `serializers.py`: validación de entrada y serialización de salida
- `interfaces.py`: contratos abstractos
- `repositories.py`: acceso a datos y consultas ORM
- `service.py`: lógica de negocio
- `factory.py`: armado de dependencias
- `exceptions.py`: errores de dominio
- `views.py`: capa HTTP
- `urls.py`: rutas
- `tests/`: tests por capa

## Views
- Deben ser delgadas.
- Deben coordinar request, serializer, repository/service y response.
- No deben contener lógica de negocio compleja.

## Cuándo usar service
No todo endpoint debe pasar por `service.py`.

Para endpoints simples, como:
- list
- retrieve
- gets simples
- consultas sin lógica de negocio relevante

puede usarse `view + repository` directamente.

Usar `service.py` cuando:
- haya lógica de negocio
- intervengan varias entidades
- haya cálculos
- haya reglas de dominio
- haya transacciones
- haya efectos sobre otras entidades

## Serializers
- Usarlos para validación de entrada y serialización.
- Separar por responsabilidad cuando haga falta:
  - creación
  - edición
  - respuesta
  - query params

## Repositories
- Centralizar acceso a datos.
- Encapsular queries ORM.
- Usar `select_related` y `prefetch_related` cuando corresponda.
- No duplicar queries en otras capas.

## Services
- Concentrar reglas de dominio.
- Orquestar repositories.
- Usar `transaction.atomic` cuando la operación afecte consistencia entre varias acciones.

## Exceptions
- Usar errores de dominio claros.
- Evitar mensajes ambiguos.