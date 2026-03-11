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
import ExpenseForm from "./pages/forms/Expense/ExpenseForm";
import ClientForm from "./pages/forms/Client/ClientForm";
import ExpenseList from "./pages/lists/Expense";
import ClientsList from "./pages/lists/Client";
import ClientDetail from "./pages/ClientDetail";
import ConditionIvaTypeForm from "./pages/forms/TipoCondicionIVA";
import ConditionIvaTypeList from "./pages/lists/TipoCondicionIVA";
import CategoryForm from "./pages/forms/Categoria";
import CategoryList from "./pages/lists/Categoria";
import PriceListList from "./pages/lists/PriceList";
import PriceListDetail from "./pages/PriceListDetail";
import PriceListEdit from "./pages/PriceListEdit";
import PriceListForm from "./pages/forms/PriceList/PriceListForm";
import ClientPaymentList from "./pages/lists/ClientPayment";
import ClientPaymentForm from "./pages/forms/ClientPayment/ClientPaymentForm";
import BillList from "./pages/lists/Factura";
import FacturaForm from "./pages/forms/Factura/FacturaForm";
import BillPrintView from "./pages/Factura/PrintView";
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