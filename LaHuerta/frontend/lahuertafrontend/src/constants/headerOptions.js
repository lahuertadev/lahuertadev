import { FaHome, FaUser, FaMoneyBill, FaFileInvoice, FaBook, FaTags } from 'react-icons/fa';

export const headerOptions = [
  { text: 'Inicio', icon: <FaHome />, path: '/' },
  { text: 'Clientes', icon: <FaUser />, path: '/client/' },
  { text: 'Gastos', icon: <FaMoneyBill />, path: '/expense/' },
  {
    text: 'Catálogos',
    icon: <FaBook />,
    children: [
      { text: 'Condiciones de IVA', icon: <FaFileInvoice />, path: '/condition-iva-type' },
      { text: 'Categorías', icon: <FaTags />, path: '/category' },
    ],
  },
];