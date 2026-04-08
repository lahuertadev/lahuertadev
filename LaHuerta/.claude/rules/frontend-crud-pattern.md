# Frontend CRUD pattern

Aplicar esta regla al crear o extender CRUDs frontend.

## Flujo esperado
Antes de implementar:
1. revisar si la entidad ya existe
2. buscar una pantalla similar
3. decidir si es CRUD completo o catálogo simple inline
4. listar archivos a tocar
5. recién después proponer implementación

## Dos patrones

### CRUD completo
Usar para entidades con:
- varios campos
- validaciones más complejas
- relaciones
- navegación entre pantallas
- detalle si aplica

Estructura habitual:
- listado
- formulario
- detalle si aplica

### CRUD simple inline
Usar para entidades pequeñas, especialmente cuando:
- solo tienen `descripcion`
- tienen pocos campos
- no requieren detalle
- no requieren formulario separado

En este patrón:
- usar una sola pantalla
- formulario inline arriba
- tabla/listado abajo
- create, edit y delete en la misma vista

## Listados
- Reutilizar `GenericList` cuando encaje.
- Definir columnas en `constants/grid/...`.
- Mapear la respuesta backend al shape de UI antes de renderizar si mejora claridad.

## Formularios
- Para entidades completas: seguir el patrón actual del proyecto.
- Para catálogos simples: preferir formulario inline.