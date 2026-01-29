import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import App from "./App";
import Home from './pages/home';
import ExpenseForm from "./pages/forms/Expense/ExpenseForm";
import ClientForm from "./pages/forms/Client/ClientForm";
import ExpenseList from "./pages/lists/Expense";
import ClientsList from "./pages/lists/Client";
import ConditionIvaTypeForm from "./pages/forms/TipoCondicionIVA";
import ConditionIvaTypeList from "./pages/lists/TipoCondicionIVA";
import Login from "./pages/authentication/Login";
import Register from "./pages/authentication/Register";
import PasswordResetRequest from "./pages/authentication/PasswordResetRequest";
import PasswordResetConfirm from "./pages/authentication/PasswordResetConfirm";

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
  //! Con header
  {
    path: '/',
    element: <App />,
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
      }
    ],
  }
]);

// Renderizar el RouterProvider con las rutas definidas
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);