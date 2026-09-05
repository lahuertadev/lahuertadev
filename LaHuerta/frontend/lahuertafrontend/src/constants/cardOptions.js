// `size: 'featured'` marca los accesos de uso más frecuente: en el bento de la Home
// ocupan el doble de alto (rectángulo) en vez de compartir el cuadrado del resto.
export const cardOptions = [
    { title: 'Gastos', description: 'Registrá y visualizá todos los gastos', url: '/expense/', icon: 'expense', size: 'compact' },
    { title: 'Clientes', description: 'Gestioná todos los clientes', url: '/client/', icon: 'clients', size: 'featured' },
    { title: 'Facturación', description: 'Facturá a tus clientes', url: '/bill/', icon: 'billing', size: 'featured' },
    { title: 'Pagos de Clientes', description: 'Registrá y controlá los pagos de tus clientes', url: '/client-payment/', icon: 'payments', size: 'featured' },
    { title: 'Proveedores', description: 'Gestioná tus proveedores', url: '/supplier/', icon: 'suppliers', size: 'compact' },
    { title: 'Compras', description: 'Registrá las compras a tus proveedores', url: '/buy/', icon: 'purchases', size: 'compact' },
    { title: 'Listas de Precios', description: 'Armá y actualizá tus listas de precios', url: '/price-list/', icon: 'priceList', size: 'compact' },
    { title: 'Reportes', description: 'Consultá reportes de clientes', url: '/report/', icon: 'reports', size: 'compact' },
];
