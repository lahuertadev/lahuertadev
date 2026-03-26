/**
 * Mapa de rutas → breadcrumbs.
 * Cada entrada define el trail completo para esa sección.
 * Se usa en GenericList (auto-detección por URL) y puede importarse
 * en páginas standalone como ConditionIvaTypeList.
 *
 * Formato de cada item: { label: string, path?: string }
 * El último item no lleva `path` (es la página actual).
 */

const HOME = { label: 'Home', path: '/' };
const CATALOGOS = { label: 'Catálogos' };

export const breadcrumbsMap = {
  '/client':           [HOME, { label: 'Clientes' }],
  '/bill':             [HOME, { label: 'Facturas / Remitos' }],
  '/buy':              [HOME, { label: 'Compras' }],
  '/expense':          [HOME, { label: 'Gastos' }],
  '/client-payment':   [HOME, { label: 'Pagos de Clientes' }],
  '/product':          [HOME, { label: 'Productos' }],
  '/price-list':       [HOME, { label: 'Listas de Precios' }],
  '/supplier':         [HOME, CATALOGOS, { label: 'Proveedores' }],
  '/market':           [HOME, CATALOGOS, { label: 'Mercados' }],
  '/condition-iva-type': [HOME, CATALOGOS, { label: 'Condición de IVA' }],
  '/category':         [HOME, CATALOGOS, { label: 'Categorías' }],
};
