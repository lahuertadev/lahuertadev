//* Rutas de backend
// Para desarrollo, apuntamos al backend en localhost:8080.
// En producción podés definir REACT_APP_API_BASE_URL en el .env de React.

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

//! Auth
export const authLoginUrl = `${API_BASE}/auth/login/`;
export const authRegisterUrl = `${API_BASE}/auth/register/`;
export const authLogoutUrl = `${API_BASE}/auth/logout/`;
export const authMeUrl = `${API_BASE}/auth/me/`;
export const authPasswordResetUrl = `${API_BASE}/auth/password-reset/`;
export const authPasswordResetConfirmUrl = `${API_BASE}/auth/password-reset-confirm/`;
export const authVerifyEmailUrl = `${API_BASE}/auth/verify-email/`;
export const authResendVerificationCodeUrl = `${API_BASE}/auth/resend-verification-code/`;
export const authCsrfUrl = `${API_BASE}/auth/csrf/`;

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