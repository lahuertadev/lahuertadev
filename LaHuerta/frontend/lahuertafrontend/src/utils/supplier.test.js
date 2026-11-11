import { formatSupplierLabel } from './supplier';

test('formatSupplierLabel muestra el nombre del proveedor con su puesto', () => {
  expect(formatSupplierLabel({ nombre: 'Fruta Sur', puesto: 12 })).toBe('Fruta Sur — Puesto 12');
});
