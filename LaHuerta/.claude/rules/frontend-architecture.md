# Frontend architecture

Aplicar esta regla al trabajar sobre frontend React.

## Principios
- Seguir la arquitectura real del frontend de La Huerta.
- Priorizar reutilización de componentes, constantes y utilidades existentes.
- No introducir capas nuevas si el proyecto no las usa.

## Patrones existentes
El frontend usa:
- React
- React Router
- Axios
- Material UI
- componentes reutilizables propios
- constantes compartidas
- utilidades de formato
- CSS específico por funcionalidad cuando hace falta

## Convenciones
- Centralizar endpoints en `constants/urls`.
- Centralizar columnas de listados en `constants/grid/...`.
- Reutilizar utilidades de formato antes de formatear inline.
- Mantener la lógica HTTP cerca de la pantalla/componente si ese es el patrón existente.
- Reutilizar componentes existentes antes de crear nuevos.

## Naming
No es obligatorio usar siempre `index.jsx`.

Usar:
- `index.js` o `index.jsx` cuando sea entrypoint natural de carpeta
- nombres explícitos cuando mejoren claridad:
  - `ClientForm.jsx`
  - `ClientDetail.jsx`
  - `FacturaForm.jsx`
  - `PriceListDetail.jsx`