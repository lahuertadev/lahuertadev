// Tipos de movimiento de vacíos: mismos valores que el enum EmptyMovementType del backend
// (movimiento_vacio/enums.py). Si se agrega un tipo allá, se agrega acá.
export const EMPTY_MOVEMENT_TYPES = {
  LOAD: 'CARGA',
  RETURN: 'DEVOLUCION',
};

export const EMPTY_MOVEMENT_TYPE_CONFIG = {
  [EMPTY_MOVEMENT_TYPES.LOAD]: {
    label: 'Carga',
    title: 'Carga de vacíos',
    description: 'Vacíos que el proveedor le cobró a La Huerta, en la misma factura de la compra o aparte.',
    subtitle: 'Registrá los vacíos que cobró el proveedor: tipo, cantidad y precio de cada uno.',
    path: 'load',
    icon: 'emptyLoad',
    bg: '#e8f0fb',
    color: '#4a7bc4',
  },
  [EMPTY_MOVEMENT_TYPES.RETURN]: {
    label: 'Devolución',
    title: 'Devolución de vacíos',
    description: 'Vacíos que La Huerta le devolvió al proveedor, según el vale que entrega el puesto.',
    subtitle: 'Registrá los vacíos devueltos tal como figuran en el vale del proveedor.',
    path: 'return',
    icon: 'emptyReturn',
    bg: '#dcfce7',
    color: '#166534',
  },
};

// Opciones para selects ({ name, value }).
export const EMPTY_MOVEMENT_TYPE_OPTIONS = Object.entries(EMPTY_MOVEMENT_TYPE_CONFIG)
  .map(([value, { label }]) => ({ name: label, value }));
