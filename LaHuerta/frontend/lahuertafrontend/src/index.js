import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import Root from "./routes/root"; // Importa el componente Root
import ExpenseForm from "./routes/forms/ExpenseForm";
import ExpenseList from "./routes/lists/ExpenseList";

// Definir las rutas
const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />, 
    children:[
      {
        path: '/expense/create',
        element: <ExpenseForm />
      },
      {
        path: '/expense/list', 
        element: <ExpenseList />
      },
      {
        path: '/expense/edit/:id',  // Ruta dinámica para editar un gasto
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