import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";
import "./index.css";
import "./api/axiosConfig";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import Home from './pages/home';
import ExpenseForm from "./pages/gasto/form/ExpenseForm";
import ExpenseList from "./pages/gasto/list";
import ClientForm from "./pages/cliente/form/ClientForm";
import ClientsList from "./pages/cliente/list";
import ClientDetail from "./pages/cliente/detail/ClientDetail";
import ConditionIvaTypeForm from "./pages/tipo_condicion_iva/form";
import ConditionIvaTypeList from "./pages/tipo_condicion_iva/list";
import CategoryForm from "./pages/categoria/form";
import CategoryList from "./pages/categoria/list";
import PriceListList from "./pages/lista_precios/list";
import PriceListDetail from "./pages/lista_precios/detail/PriceListDetail";
import PriceListEdit from "./pages/lista_precios/form/PriceListEdit";
import PriceListForm from "./pages/lista_precios/form/PriceListForm";
import ClientPaymentList from "./pages/pago_cliente/list";
import ClientPaymentForm from "./pages/pago_cliente/form/ClientPaymentForm";
import ProductForm from "./pages/producto/form/productForm";
import ProductsList from "./pages/producto/list";
import ProductDetail from "./pages/producto/detail";  
import SupplierList from "./pages/proveedor/list";
import ProveedorForm from "./pages/proveedor/form/ProveedorForm";
import MarketList from "./pages/mercado/list";
import BankList from "./pages/banco";
import CheckList from "./pages/cheque/list";
import CheckForm from "./pages/cheque/form/CheckForm";
import OwnCheckList from "./pages/cheque_propio/list";
import OwnCheckForm from "./pages/cheque_propio/form/OwnCheckForm";
import MercadoForm from "./pages/mercado/form/MercadoForm";
import BillList from "./pages/factura/list";
import FacturaForm from "./pages/factura/form/FacturaForm";
import BillPrintView from "./pages/factura/print/PrintView";
import BuyList from "./pages/compra/list";
import CompraForm from "./pages/compra/form/CompraForm";
import PurchasePaymentList from "./pages/pago_compra/list";
import PurchasePaymentForm from "./pages/pago_compra/form/PurchasePaymentForm";
import ClientReport from "./pages/reporte";
import Login from "./pages/authentication/Login";
import Register from "./pages/authentication/Register";
import PasswordResetRequest from "./pages/authentication/PasswordResetRequest";
import PasswordResetConfirm from "./pages/authentication/PasswordResetConfirm";
import RequireAuth from "./components/RequireAuth";


const router = createBrowserRouter([
  //! Sin header - Rutas de autenticación
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/password-reset',
    element: <PasswordResetRequest />,
  },
  {
    path: '/reset-password',
    element: <PasswordResetConfirm />,
  },
  //! Con header (requiere sesión; si no hay sesión redirige a /login)
  {
    path: '/',
    element: (
      <RequireAuth>
        <App />
      </RequireAuth>
    ),
    children: [
      {
        path: '/',
        element: <Home />
      },
      {
        path: '/expense', 
        element: <ExpenseList />
      },
      {
        path: '/expense/create',
        element: <ExpenseForm />
      },
      {
        path: '/expense/edit/:id',
        element: <ExpenseForm />
      },
      {
        path: 'product',
        element: <ProductsList/>
      },
      {
        path: '/product/create',
        element: <ProductForm/>
      },
      {
        path: '/product/edit/:id',
        element: <ProductForm/>
      },
      {
        path: '/product/detail/:id',
        element: <ProductDetail/>
      },
      {
        path: '/client', 
        element: <ClientsList />
      },
      {
        path: '/client/create', 
        element: <ClientForm />
      },
      {
        path: '/client/edit/:id',
        element: <ClientForm />
      },
      {
        path: '/client/detail/:id',
        element: <ClientDetail />
      },
      {
        path: 'condition-iva-type/create', 
        element: <ConditionIvaTypeForm />
      },
      {
        path: 'condition-iva-type/edit/:id',
        element: <ConditionIvaTypeForm />
      },
      {
        path: 'condition-iva-type',
        element: <ConditionIvaTypeList />
      },
      {
        path: 'category/create',
        element: <CategoryForm />
      },
      {
        path: 'category/edit/:id',
        element: <CategoryForm />
      },
      {
        path: 'category',
        element: <CategoryList />
      },
      {
        path: 'price-list',
        element: <PriceListList />
      },
      {
        path: 'price-list/create',
        element: <PriceListForm />
      },
      {
        path: 'price-list/detail/:id',
        element: <PriceListDetail />
      },
      {
        path: 'price-list/edit/:id',
        element: <PriceListEdit />
      },
      {
        path: 'client-payment',
        element: <ClientPaymentList />
      },
      {
        path: 'client-payment/create',
        element: <ClientPaymentForm />
      },
      {
        path: 'client-payment/edit/:id',
        element: <ClientPaymentForm />
      },
      {
        path: 'supplier',
        element: <SupplierList />,
      },
      {
        path: 'supplier/create',
        element: <ProveedorForm />,
      },
      {
        path: 'supplier/edit/:id',
        element: <ProveedorForm />,
      },
      {
        path: 'market',
        element: <MarketList />,
      },
      {
        path: 'market/create',
        element: <MercadoForm />,
      },
      {
        path: 'market/edit/:id',
        element: <MercadoForm />,
      },
      {
        path: 'bill',
        element: <BillList />
      },
      {
        path: 'bill/create',
        element: <FacturaForm />
      },
      {
        path: 'bill/edit/:id',
        element: <FacturaForm />
      },
      {
        path: 'bill/detail/:id',
        element: <BillPrintView />
      },
      {
        path: 'buy',
        element: <BuyList />,
      },
      {
        path: 'buy/create',
        element: <CompraForm />,
      },
      {
        path: 'buy/edit/:id',
        element: <CompraForm />,
      },
      {
        path: 'purchase-payment',
        element: <PurchasePaymentList />,
      },
      {
        path: 'purchase-payment/create',
        element: <PurchasePaymentForm />,
      },
      {
        path: 'bank',
        element: <BankList />,
      },
      {
        path: 'check',
        element: <CheckList />,
      },
      {
        path: 'check/create',
        element: <CheckForm />,
      },
      {
        path: 'check/edit/:id',
        element: <CheckForm />,
      },
      {
        path: 'own-check',
        element: <OwnCheckList />,
      },
      {
        path: 'own-check/create',
        element: <OwnCheckForm />,
      },
      {
        path: 'own-check/edit/:id',
        element: <OwnCheckForm />,
      },
      {
        path: 'report',
        element: <ClientReport />,
      },
    ],
  }
]);

// Renderizar el RouterProvider con las rutas definidas
// AuthProvider guarda el estado de autenticación (user) para toda la app
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);