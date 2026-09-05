import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import getTheme from "./theme";
import "./index.css";
import "./api/axiosConfig";
import { AuthProvider } from "./context/AuthContext";
import { ThemeModeProvider } from "./context/ThemeModeContext";
import App from "./App";
import Home from './pages/home';
import ExpenseForm from "./pages/gasto/form/ExpenseForm";
import ExpenseDetail from "./pages/gasto/detail/ExpenseDetail";
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
import ClientPaymentDetail from "./pages/pago_cliente/detail/ClientPaymentDetail";
import ProductForm from "./pages/producto/form/productForm";
import ProductsList from "./pages/producto/list";
import ProductDetail from "./pages/producto/detail";  
import SupplierList from "./pages/proveedor/list";
import SupplierDetail from "./pages/proveedor/detail/SupplierDetail";
import ProveedorForm from "./pages/proveedor/form/ProveedorForm";
import MarketList from "./pages/mercado/list";
import BankList from "./pages/banco";
import CheckList from "./pages/cheque/list";
import CheckForm from "./pages/cheque/form/CheckForm";
import CheckDetail from "./pages/cheque/detail/CheckDetail";
import OwnCheckList from "./pages/cheque_propio/list";
import OwnCheckForm from "./pages/cheque_propio/form/OwnCheckForm";
import OwnCheckDetail from "./pages/cheque_propio/detail/OwnCheckDetail";
import MercadoForm from "./pages/mercado/form/MercadoForm";
import BillList from "./pages/factura/list";
import FacturaForm from "./pages/factura/form/FacturaForm";
import BillPrintView from "./pages/factura/print/PrintView";
import InvoicePrintView from "./pages/factura/invoice-print/InvoicePrintView";
import BuyList from "./pages/compra/list";
import CompraForm from "./pages/compra/form/CompraForm";
import CompraDetail from "./pages/compra/detail/CompraDetail";
import PurchasePaymentList from "./pages/pago_compra/list";
import PurchasePaymentForm from "./pages/pago_compra/form/PurchasePaymentForm";
import PurchasePaymentDetail from "./pages/pago_compra/detail/PurchasePaymentDetail";
import ClientReport from "./pages/reporte";
import UsersList from "./pages/usuario/list";
import UserDetail from "./pages/usuario/detail/UserDetail";
import Profile from "./pages/profile";
import Login from "./pages/authentication/Login";
import Register from "./pages/authentication/Register";
import PasswordResetRequest from "./pages/authentication/PasswordResetRequest";
import PasswordResetConfirm from "./pages/authentication/PasswordResetConfirm";
import RequireAuth from "./components/RequireAuth";
import RequireRole from "./components/RequireRole";


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
        path: '/expense/detail/:id',
        element: <ExpenseDetail />
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
        path: 'client-payment/detail/:id',
        element: <ClientPaymentDetail />
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
        path: 'supplier/detail/:id',
        element: <SupplierDetail />,
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
        path: 'bill/invoice/:id',
        element: <InvoicePrintView />
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
        path: 'buy/detail/:id',
        element: <CompraDetail />,
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
        path: 'purchase-payment/detail/:id',
        element: <PurchasePaymentDetail />,
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
        path: 'check/detail/:id',
        element: <CheckDetail />,
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
        path: 'own-check/detail/:id',
        element: <OwnCheckDetail />,
      },
      {
        path: 'report',
        element: <ClientReport />,
      },
      {
        path: 'user',
        element: (
          <RequireRole roles={['superuser']}>
            <UsersList />
          </RequireRole>
        ),
      },
      {
        path: 'user/detail/:id',
        element: (
          <RequireRole roles={['superuser']}>
            <UserDetail />
          </RequireRole>
        ),
      },
      {
        path: '/profile',
        element: <Profile />,
      },
    ],
  }
]);

// Renderizar el RouterProvider con las rutas definidas
// AuthProvider guarda el estado de autenticación (user) para toda la app
// ThemeModeProvider guarda la preferencia de tema (claro/oscuro) y persiste en localStorage.
// El theme de MUI acá es siempre claro: cubre login/register/recuperar contraseña,
// que deben verse siempre igual sin importar la preferencia guardada.
// El modo oscuro dinámico solo se aplica dentro del área autenticada (ver App.js).
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeModeProvider>
      <ThemeProvider theme={getTheme('light')}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeProvider>
    </ThemeModeProvider>
  </React.StrictMode>
);