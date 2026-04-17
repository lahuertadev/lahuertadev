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

## Componentes reutilizables obligatorios

Siempre usar los componentes ya existentes en `src/components/`. **Nunca usar el equivalente de MUI directamente** si ya existe un wrapper propio:

| Necesidad | Componente a usar | Nunca usar |
|-----------|-------------------|------------|
| Select / dropdown | `BasicSelect` (`components/Select`) | `<Select>` de MUI |
| Date picker | `BasicDatePicker` (`components/DatePicker`) | `<DatePicker>` de MUI directamente |
| Input de texto | `components/Input` | `<TextField>` de MUI si hay wrapper propio |
| Input de monto | `components/AmountInput` | input numérico crudo |
| Rango de fechas | `components/DateRange` | dos DatePicker sueltos |

### Formato de `BasicSelect`
```jsx
<BasicSelect
  label="Etiqueta"
  name="fieldName"
  value={selectedOption}          // objeto { name, value } o ''
  options={[{ name: 'Texto', value: 'id' }]}
  onChange={e => setSelected(e.target.value)}  // e.target.value es el objeto completo
/>
```

### Formato de `BasicDatePicker`
```jsx
<BasicDatePicker
  label="Etiqueta"
  name="fieldName"
  value={dateString}              // string 'YYYY-MM-DD' o null
  onChange={setDateString}        // recibe string 'YYYY-MM-DD' o null
/>
```

Usar MUI (`Button`, `Paper`, `Typography`, `CircularProgress`, etc.) solo para los elementos que **no tienen wrapper propio** en el proyecto.

## Definición de columnas para DataGrid

El componente `Grid/index.js` calcula `minWidth` automáticamente en base al largo del header y el contenido de las filas. No hace falta calcularlo a mano.

### Convención estándar
- Usar siempre `flex` para controlar el ancho proporcional. No mezclar columnas con `flex` y sin `flex` en la misma grilla.
- Usar `flex: 1` para la mayoría de columnas, `flex: 2` para columnas de nombre/descripción larga.
- Agregar siempre `align: 'center'` y `headerAlign: 'center'` en todas las columnas.
- No poner `minWidth` explícito salvo que el cálculo automático no alcance.

### Cuándo poner `minWidth` explícito
Solo cuando la columna tenga contenido especial que el cálculo estima mal:
- Columnas con badge (`renderCell` con span estilizado): usar `minWidth: 160` como piso, ya que el CSS del header aplica `textTransform: uppercase` y `letterSpacing` que hacen el texto más ancho de lo que el cálculo predice.

### Ejemplo de columnas bien definidas
```javascript
export const columns = [
  { field: 'number',   headerName: 'N° Compra', flex: 1, align: 'center', headerAlign: 'center' },
  { field: 'supplier', headerName: 'Proveedor', flex: 2, align: 'center', headerAlign: 'center' },
  { field: 'amount',   headerName: 'Importe',   flex: 1, align: 'center', headerAlign: 'center' },
  {
    field: 'status',
    headerName: 'Estado',
    flex: 1,
    minWidth: 160,         // badge: uppercase + letter-spacing necesitan más espacio
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => { ... },
  },
];
```

## Formato de respuesta
Siempre responder en este orden:
1. enfoque
2. patrón elegido
3. archivos a tocar
4. componentes y constantes reutilizadas
5. implementación
6. rutas o columnas nuevas si aplican
7. riesgos o impacto si existen