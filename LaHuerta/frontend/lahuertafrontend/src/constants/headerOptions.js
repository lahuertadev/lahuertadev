import { FaHome, FaUser, FaMoneyBill, FaFileInvoice, FaBook, FaTags, FaListAlt, FaMoneyCheckAlt, FaReceipt, FaTruck, FaStore } from 'react-icons/fa';

export const headerOptions = [
  { text: 'Inicio', icon: <FaHome />, path: '/' },
  { text: 'Clientes', icon: <FaUser />, path: '/client/' },
  { text: 'Facturas / Remitos', icon: <FaReceipt />, path: '/bill' },
  { text: 'Gastos', icon: <FaMoneyBill />, path: '/expense/' },
  { text: 'Pagos de Clientes', icon: <FaMoneyCheckAlt />, path: '/client-payment' },
  { text: 'Productos', icon: <FaFileInvoice />, path: '/product' },
  { text: 'Listas de Precios', icon: <FaListAlt />, path: '/price-list' },
  {
    text: 'Catálogos',
    icon: <FaBook />,
    children: [
      { text: 'Proveedores', icon: <FaTruck />, path: '/supplier' },
      { text: 'Mercados', icon: <FaStore />, path: '/market' },
      { text: 'Condiciones de IVA', icon: <FaFileInvoice />, path: '/condition-iva-type' },
      { text: 'Categorías', icon: <FaTags />, path: '/category' },
    ],
  },
];