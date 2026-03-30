# Backend architecture

Aplicar esta regla al trabajar sobre archivos backend Python/Django/DRF.

## Principios
- Respetar la arquitectura existente de La Huerta.
- Priorizar consistencia con apps reales del proyecto, especialmente las que siguen el patrón de `factura`.
- No introducir capas nuevas que el proyecto no usa.

## Idioma del código
- Variables, funciones, clases y nombres de archivos: **inglés**.
- Mensajes de error y texto visible al usuario: **español**.
- Nombres de entidades de dominio ya definidos en español (ej. `Cheque`, `PagoCliente`) se mantienen tal cual.
- Nunca usar nombres de variables en español para entidades genéricas: usar `check`, `payment`, `supplier`, etc.

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

## Patrón 404 en views
Cuando una entidad no se encuentra, usar la excepción de dominio correspondiente (ej. `SupplierNotFoundException`).
La excepción debe lanzarse **dentro** del bloque `try` para que sea capturada por el `except`.
No retornar `Response` 404 directamente sin pasar por la excepción.

Patrón correcto:
```python
try:
    entity = self.repository.get_by_id(pk)
    if not entity:
        raise EntityNotFoundException('Entidad no encontrada.')
    # resto de la lógica
except EntityNotFoundException as e:
    return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)
```

Patrón incorrecto (raise fuera del try — la excepción no es capturada):
```python
entity = self.repository.get_by_id(pk)
if not entity:
    raise EntityNotFoundException(...)  # nunca llega al except

try:
    ...
except EntityNotFoundException as e:
    ...  # no se ejecuta
```

## Patrón de filtros en repositorios
Pasar los filtros como parámetros nombrados individuales, con valor default `None`.
Actualizar la firma en `interfaces.py` cada vez que se agregue un filtro nuevo al repositorio.

```python
# interfaces.py
def get_all_suppliers(self, searchQuery=None, mercado=None): pass

# repositories.py
def get_all_suppliers(self, searchQuery=None, mercado=None):
    queryset = Model.objects.all()
    if searchQuery:
        queryset = queryset.filter(...)
    if mercado:
        queryset = queryset.filter(...)
    return queryset
```