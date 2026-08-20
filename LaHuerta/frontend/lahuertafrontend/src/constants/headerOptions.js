import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import PaymentOutlinedIcon from '@mui/icons-material/PaymentOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import AttachMoneyOutlinedIcon from '@mui/icons-material/AttachMoneyOutlined';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';

const iconSx = { fontSize: 20 };

export const headerOptions = [
  { text: 'Inicio', icon: <HomeOutlinedIcon sx={iconSx} />, path: '/' },
  {
    text: 'Clientes',
    icon: <PersonOutlineIcon sx={iconSx} />,
    path: '/client',
    children: [
      { text: 'Clientes', icon: <PersonOutlineIcon sx={iconSx} />, path: '/client' },
      { text: 'Facturación', icon: <ReceiptLongOutlinedIcon sx={iconSx} />, path: '/bill' },
      { text: 'Pagos de Clientes', icon: <PaymentsOutlinedIcon sx={iconSx} />, path: '/client-payment' },
      { text: 'Cheques', icon: <PaymentOutlinedIcon sx={iconSx} />, path: '/check' },
    ],
  },
  {
    text: 'Proveedores',
    icon: <LocalShippingOutlinedIcon sx={iconSx} />,
    children: [
      { text: 'Proveedores', icon: <LocalShippingOutlinedIcon sx={iconSx} />, path: '/supplier' },
      { text: 'Compras', icon: <ShoppingCartOutlinedIcon sx={iconSx} />, path: '/buy' },
      { text: 'Pagos de Compras', icon: <PaymentsOutlinedIcon sx={iconSx} />, path: '/purchase-payment' },
      { text: 'Cheques emitidos', icon: <PaymentOutlinedIcon sx={iconSx} />, path: '/own-check' },
    ],
  },
  {
    text: 'Finanzas',
    icon: <AttachMoneyOutlinedIcon sx={iconSx} />,
    children: [
      { text: 'Gastos', icon: <AttachMoneyOutlinedIcon sx={iconSx} />, path: '/expense' },
      { text: 'Listas de Precios', icon: <ListAltOutlinedIcon sx={iconSx} />, path: '/price-list' },
    ],
  },
  {
    text: 'Catálogos',
    icon: <MenuBookOutlinedIcon sx={iconSx} />,
    children: [
      { text: 'Productos', icon: <DescriptionOutlinedIcon sx={iconSx} />, path: '/product' },
      { text: 'Mercados', icon: <StorefrontOutlinedIcon sx={iconSx} />, path: '/market' },
      { text: 'Bancos', icon: <AccountBalanceOutlinedIcon sx={iconSx} />, path: '/bank' },
      { text: 'Categorías', icon: <LocalOfferOutlinedIcon sx={iconSx} />, path: '/category' },
      { text: 'Condiciones de IVA', icon: <DescriptionOutlinedIcon sx={iconSx} />, path: '/condition-iva-type' },
    ],
  },
  {
    text: 'Reportes',
    icon: <BarChartOutlinedIcon sx={iconSx} />,
    children: [
      { text: 'Clientes', icon: <PersonOutlineIcon sx={iconSx} />, path: '/report' },
    ],
  },
  {
    text: 'Usuarios',
    icon: <AdminPanelSettingsOutlinedIcon sx={iconSx} />,
    path: '/user',
    roles: ['superuser'],
  },
];
