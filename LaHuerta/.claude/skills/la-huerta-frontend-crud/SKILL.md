---
name: la-huerta-frontend-crud
description: Crear o extender pantallas CRUD frontend de La Huerta siguiendo el patrón real de React, rutas, componentes reutilizables y constantes del proyecto.
---

# La Huerta Frontend CRUD

Usar esta skill cuando el usuario pida:
- crear una pantalla nueva
- extender un CRUD frontend
- agregar una vista de listado, formulario o detalle
- implementar un catálogo simple inline
- adaptar una pantalla al patrón visual y estructural de La Huerta

## Objetivo
Implementar frontend alineado con el proyecto actual:
- React
- React Router
- Axios
- Material UI
- constantes compartidas
- utilidades compartidas
- componentes reutilizables
- CSS específico cuando haga falta

## Procedimiento
1. Analizar si la entidad ya existe.
2. Buscar una pantalla similar.
3. Decidir si corresponde:
   - CRUD completo
   - CRUD simple inline
4. Listar archivos a crear o modificar.
5. Identificar componentes y constantes reutilizables.
6. Explicar el enfoque.
7. Recién después proponer implementación.

## Dos patrones

### CRUD completo
Usar cuando la entidad tenga:
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
Usar cuando la entidad:
- solo administre `descripcion`
- tenga pocos campos
- no necesite detalle
- no justifique pantalla de formulario separada

En este caso:
- usar una única pantalla
- formulario inline arriba
- tabla/listado debajo
- create, edit y delete en la misma vista

## Convenciones
- centralizar endpoints en `constants/urls`
- centralizar columnas en `constants/grid/...`
- reutilizar `GenericList` cuando encaje
- reutilizar componentes internos antes de crear nuevos
- reutilizar utilidades de formato antes de formatear inline
- no introducir una capa API nueva si el proyecto no la usa

## Formato de respuesta
Siempre responder en este orden:
1. enfoque
2. patrón elegido
3. archivos a tocar
4. componentes y constantes reutilizadas
5. implementación
6. rutas o columnas nuevas si aplican
7. riesgos o impacto si existen