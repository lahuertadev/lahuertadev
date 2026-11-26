# Tipos de unidad

## Objetivo
Administrar las unidades en que se venden los productos (Unidad, Kilogramo, Cajón…), con su abreviatura y su tipo de medición. El tipo de medición define cómo se carga el producto: por **peso** (peso aproximado) o por **cantidad** (cantidad por bulto).

## Alcance
- Incluye: listado, alta, edición y eliminación de tipos de unidad, en la pantalla **Catálogos › Tipos de unidad** (`/unit-type`).
- No incluye: la carga de productos, que elige el tipo de unidad en su formulario.

## Flujo de uso
1. Entrar a **Catálogos › Tipos de unidad**. Cada tipo es una tarjeta con su descripción, abreviatura y medición.
2. Para agregar uno, tocar **Nuevo tipo de unidad**, completar descripción, abreviatura y medición, y guardar (✓ o Enter).
3. Para editarlo, tocar el lápiz de la tarjeta, cambiar los datos y guardar. Escape o ✕ cancela.
4. Para eliminarlo, tocar el tacho y confirmar.
5. El buscador filtra por descripción y por abreviatura.

## Validaciones importantes
- Los tres campos son obligatorios. Descripción hasta 20 caracteres y abreviatura hasta 5.
- La descripción no se puede repetir: "Ya existe un tipo de unidad con esa descripción."
- La abreviatura tampoco, sin distinguir mayúsculas ("kg" y "KG" son la misma): "Ya existe un tipo de unidad con esa abreviatura."
- Los registros del sistema (Unidad, Kilogramo, Planta, Diente) tienen candado: no se editan ni se eliminan.
- No se puede eliminar un tipo de unidad que tiene productos.
- No se puede cambiar el tipo de medición de un tipo de unidad que tiene productos: sus productos quedarían cargados con el dato equivocado (peso en lugar de cantidad por bulto, o al revés). La descripción y la abreviatura sí se pueden cambiar.

## Pantallas involucradas
- Catálogos › Tipos de unidad.
- Productos (formulario y detalle), que usan el tipo de unidad y su medición.
- Listas de precios y facturas, que muestran la abreviatura.

## Endpoints
- `GET/POST /api/unit_type/`
- `GET/PUT/DELETE /api/unit_type/<id>/`

## Consideraciones
- La pantalla usa el componente de catálogos (`components/Catalog`), el mismo de Mercados, Bancos, Categorías y Condiciones de IVA. Cada catálogo define sus campos; el primero es el título de la tarjeta y los `select` se muestran como etiqueta de color.
