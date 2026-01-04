//* Rutas de backend

const API_BASE = '';

//! Expense
export const expenseUrl = `${API_BASE}/expense/`;

//! Client
export const clientUrl = `${API_BASE}/client/`;

//! Iva Condition
export const ConditionIvaTypeUrl = `${API_BASE}/type_condition_iva/`;

//! Facturation Type
export const billingTypeUrl = `${API_BASE}/type_facturation/`;

//! Expense Type
export const expenseTypeUrl = `${API_BASE}/type_expense/`;

//! External Services 
//? Provinces
export const provincesUrl = 'https://apis.datos.gob.ar/georef/api/provincias?campos=id,nombre&max=25';