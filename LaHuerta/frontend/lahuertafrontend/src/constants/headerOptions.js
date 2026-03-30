import { FaHome, FaUser, FaMoneyBill, FaFileInvoice, FaBook, FaTags, FaListAlt, FaMoneyCheckAlt, FaReceipt, FaTruck, FaStore, FaShoppingCart, FaUniversity, FaMoneyCheck } from 'react-icons/fa';

export const headerOptions = [
  { text: 'Inicio', icon: <FaHome />, path: '/' },
  {
    text: 'Clientes',
    icon: <FaUser />,
    children: [
      { text: 'Clientes', icon: <FaUser />, path: '/client' },
      { text: 'Facturas / Remitos', icon: <FaReceipt />, path: '/bill' },
      { text: 'Pagos de Clientes', icon: <FaMoneyCheckAlt />, path: '/client-payment' },
      { text: 'Cheques', icon: <FaMoneyCheck />, path: '/check' },
    ],
  },
  {
    text: 'Proveedores',
    icon: <FaTruck />,
    children: [
      { text: 'Proveedores', icon: <FaTruck />, path: '/supplier' },
      { text: 'Compras', icon: <FaShoppingCart />, path: '/buy' },
    ],
  },
  {
    text: 'Finanzas',
    icon: <FaMoneyBill />,
    children: [
      { text: 'Gastos', icon: <FaMoneyBill />, path: '/expense' },
      { text: 'Listas de Precios', icon: <FaListAlt />, path: '/price-list' },
    ],
  },
  {
    text: 'Catálogos',
    icon: <FaBook />,
    children: [
      { text: 'Productos', icon: <FaFileInvoice />, path: '/product' },
      { text: 'Mercados', icon: <FaStore />, path: '/market' },
      { text: 'Bancos', icon: <FaUniversity />, path: '/bank' },
      { text: 'Categorías', icon: <FaTags />, path: '/category' },
      { text: 'Condiciones de IVA', icon: <FaFileInvoice />, path: '/condition-iva-type' },
    ],
  },
];
