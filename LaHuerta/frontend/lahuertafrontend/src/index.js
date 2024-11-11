import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import App from "./App"; 
import Home from './pages/home';
import ExpenseForm from "./pages/forms/ExpenseForm";
import ExpenseList from "./pages/lists/Expense";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />, 
    children:[
      {
        path: '/',
        element: <Home />
      },
      {
        path: '/expense/create',
        element: <ExpenseForm />
      },
      {
        path: '/expense/', 
        element: <ExpenseList />
      },
      {
        path: '/expense/edit/:id',
        element: <ExpenseForm />
      }
    ],
  },
]);

// Renderizar el RouterProvider con las rutas definidas
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);