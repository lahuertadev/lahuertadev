/**
 * Mapa de rutas → breadcrumbs.
 * Cada entrada define el trail completo para esa sección.
 * Se usa en GenericList (auto-detección por URL) y puede importarse
 * en páginas standalone como ConditionIvaTypeList.
 *
 * Formato de cada item: { label: string, path?: string }
 * El último item no lleva `path` (es la página actual).
 */

export const HOME = { label: 'Inicio', path: '/' };
export const PROVEEDORES = { label: 'Proveedores', path: '/supplier' };
const CATALOGOS = { label: 'Catálogos' };

export const breadcrumbsMap = {
  '/client':           [HOME, { label: 'Clientes' }],
  '/bill':             [HOME, { label: 'Facturación' }],
  '/buy':              [HOME, PROVEEDORES, { label: 'Compras' }],
  '/expense':          [HOME, { label: 'Gastos' }],
  '/client-payment':   [HOME, { label: 'Pagos de Clientes' }],
  '/product':          [HOME, { label: 'Productos' }],
  '/price-list':       [HOME, { label: 'Listas de Precios' }],
  '/supplier':         [HOME, { label: 'Proveedores' }],
  '/purchase-payment': [HOME, PROVEEDORES, { label: 'Pagos de Compras' }],
  '/market':           [HOME, CATALOGOS, { label: 'Mercados' }],
  '/condition-iva-type': [HOME, CATALOGOS, { label: 'Condición de IVA' }],
  '/category':         [HOME, CATALOGOS, { label: 'Categorías' }],
  '/bank':             [HOME, CATALOGOS, { label: 'Bancos' }],
  '/check':            [HOME, { label: 'Cheques' }],
  '/own-check':        [HOME, PROVEEDORES, { label: 'Cheques emitidos' }],
};
