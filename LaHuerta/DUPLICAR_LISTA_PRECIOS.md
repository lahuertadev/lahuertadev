# Funcionalidad: Duplicar Lista de Precios

## Descripción

Esta funcionalidad permite crear una copia completa de una lista de precios existente, incluyendo todos sus productos y precios asociados.

## Características

### Backend

1. **Endpoint**: `POST /price_list/{id}/duplicate/`
2. **Funcionalidad**:
   - Duplica una lista de precios con todos sus productos
   - Genera automáticamente un nombre único agregando "Copia de" al nombre original
   - Si ya existe una lista con ese nombre, agrega un número entre paréntesis: "(1)", "(2)", etc.
   - Copia todos los productos asociados con sus precios unitarios y de bulto
   - Las fechas de creación y actualización son nuevas (no se copian de la original)

3. **Validaciones**:
   - Verifica que la lista original existe
   - Maneja el constraint de nombre único del modelo
   - Genera nombres únicos automáticamente

### Frontend

1. **Botón "Duplicar"**: Disponible en la página de detalle de la lista de precios
2. **Diálogo de confirmación**: Muestra información sobre qué se va a copiar
3. **Redirección automática**: Después de duplicar, redirige a la página de edición de la nueva lista
4. **Edición de nombre**: El nombre de la lista duplicada se puede editar en la página de edición
5. **Validación de nombre único**: Si intentas guardar un nombre que ya existe, el backend devuelve un error

## Uso

### Para el usuario:

1. Ir a la página de detalle de una lista de precios
2. Hacer clic en el botón "Duplicar"
3. Confirmar en el diálogo que aparece
4. Esperar mientras se duplica (muestra "Duplicando...")
5. Se redirige automáticamente a la página de edición de la nueva lista
6. Editar el nombre, descripción y precios según sea necesario
7. Hacer clic en "Guardar Cambios"

### Restricciones:

- El nombre NO puede repetirse (constraint `unique=True` en el modelo)
- Las fechas de creación y actualización NO se pueden editar (son automáticas)
- El nombre tiene un máximo de 30 caracteres
- La descripción tiene un máximo de 200 caracteres

## Casos de uso comunes

1. **Actualización de precios periódica**: Duplicar la lista actual, cambiarle el nombre (ej: "Lista Marzo 2026") y actualizar los precios
2. **Listas similares**: Crear una nueva lista basada en una existente pero con pequeñas modificaciones
3. **Backup manual**: Duplicar antes de hacer cambios importantes en la lista original
4. **Listas por temporada**: Duplicar y adaptar para diferentes temporadas del año

## Testing

Se incluyen tests automatizados separados por responsabilidad:

### Tests del Repositorio (`backend/lista_precios/tests/test_repository.py`)

Testa la lógica de negocio del repositorio:

- `test_generate_unique_name_no_collision`: Verifica nombres únicos sin colisión
- `test_generate_unique_name_with_collision`: Verifica nombres con colisión simple
- `test_generate_unique_name_multiple_collisions`: Verifica múltiples colisiones
- `test_duplicate_prices_list_success`: Verifica duplicación exitosa
- `test_duplicate_prices_list_empty_list`: Verifica duplicación de lista vacía
- `test_duplicate_prices_list_unique_names`: Verifica nombres únicos en duplicaciones múltiples
- `test_duplicate_prices_list_preserves_all_fields`: Verifica que todos los campos se copian

### Tests del ViewSet (`backend/lista_precios/tests/test_viewset.py`)

Testa el endpoint HTTP y la integración:

- `test_duplicate_price_list_success`: Verifica que el endpoint duplica correctamente
- `test_duplicate_price_list_unique_name`: Verifica generación de nombres únicos vía API
- `test_duplicate_nonexistent_price_list`: Verifica manejo de error con lista inexistente
- `test_duplicate_empty_price_list`: Verifica duplicación de lista vacía vía API
- `test_duplicate_response_format`: Verifica formato de respuesta
- `test_duplicate_preserves_original`: Verifica que la lista original no se modifica

### Ejecutar los tests:

```bash
# Todos los tests de lista_precios
docker exec -it lahuerta_backend bash
pytest lista_precios/tests/ -v

# Solo tests del repositorio
pytest lista_precios/tests/test_repository.py -v

# Solo tests del viewset
pytest lista_precios/tests/test_viewset.py -v

# Con coverage
pytest lista_precios/tests/ -v --cov=lista_precios --cov-report=term-missing
```

## Implementación técnica

### Archivos modificados:

**Backend:**
- `backend/lista_precios/interfaces.py`: Agregados métodos `duplicate_prices_list` y `generate_unique_name`
- `backend/lista_precios/repositories.py`: Implementación de la duplicación y generación de nombres únicos
- `backend/lista_precios/views.py`: Endpoint custom `@action(detail=True, methods=['post'])` - Vista delgada que delega la lógica al repositorio
- `backend/lista_precios/tests/test_repository.py`: Tests unitarios del repositorio
- `backend/lista_precios/tests/test_viewset.py`: Tests de integración del viewset/endpoint

**Frontend:**
- `frontend/src/pages/PriceListDetail.jsx`: Botón y diálogo de duplicación
- `frontend/src/pages/PriceListEdit.jsx`: Edición de nombre y descripción

### Separación de responsabilidades:

La implementación sigue el patrón Repository correctamente y está optimizada para evitar consultas redundantes:

1. **Vista (views.py)**: 
   - Delgada, solo orquesta
   - Busca la lista original UNA SOLA VEZ
   - Pasa el objeto completo al repositorio (no el ID)
   - Maneja errores y serializa la respuesta

2. **Repositorio (repositories.py)**:
   - Contiene toda la lógica de negocio
   - Recibe el objeto ya cargado (no hace consultas redundantes)
   - `generate_unique_name()`: Genera nombres únicos
   - `duplicate_prices_list(original_list)`: Duplica la lista completa
   - Accede directamente a los modelos solo cuando es necesario

3. **Interfaz (interfaces.py)**:
   - Define el contrato del repositorio
   - Permite inyección de dependencias y testing

**Optimización importante:** El repositorio recibe `original_list` (objeto) en lugar de `original_id`, evitando una consulta redundante a la base de datos ya que la vista ya había cargado ese objeto.

### Flujo de datos:

1. Usuario hace clic en "Duplicar" → `handleDuplicateClick()`
2. Confirma en el diálogo → `handleDuplicateConfirm()`
3. POST a `/price_list/{id}/duplicate/`
4. Backend (Vista):
   - Busca la lista original por ID (1 consulta)
   - Valida que existe
   - Pasa el objeto completo a `repository.duplicate_prices_list(original_list)`
5. Backend (Repositorio):
   - Recibe el objeto ya cargado (NO hace otra consulta)
   - Genera nombre único con `generate_unique_name()`
   - Crea nueva lista
   - Copia todos los productos asociados
   - Retorna la nueva lista
6. Backend (Vista):
   - Serializa la respuesta
   - Retorna HTTP 201 CREATED
7. Frontend recibe respuesta exitosa
8. Redirige a `/price-list/edit/{nuevo_id}`
9. Usuario puede editar nombre, descripción y precios
10. Guarda cambios con PATCH a `/price_list/{nuevo_id}/`
