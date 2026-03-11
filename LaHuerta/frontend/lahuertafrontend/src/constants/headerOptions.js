import { FaHome, FaUser, FaMoneyBill, FaFileInvoice, FaBook, FaTags, FaListAlt, FaMoneyCheckAlt, FaReceipt } from 'react-icons/fa';

export const headerOptions = [
  { text: 'Inicio', icon: <FaHome />, path: '/' },
  { text: 'Clientes', icon: <FaUser />, path: '/client/' },
  { text: 'Facturas / Remitos', icon: <FaReceipt />, path: '/bill' },
  { text: 'Gastos', icon: <FaMoneyBill />, path: '/expense/' },
  { text: 'Pagos de Clientes', icon: <FaMoneyCheckAlt />, path: '/client-payment' },
  { text: 'Listas de Precios', icon: <FaListAlt />, path: '/price-list' },
  {
    text: 'Catálogos',
    icon: <FaBook />,
    children: [
      { text: 'Condiciones de IVA', icon: <FaFileInvoice />, path: '/condition-iva-type' },
      { text: 'Categorías', icon: <FaTags />, path: '/category' },
    ],
  },
];