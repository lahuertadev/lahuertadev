// Máximo de dígitos de un teléfono (el backend guarda hasta 20 caracteres).
export const PHONE_MAX_DIGITS = 20;

// Teléfono (solo dígitos) con el formato de un número de Argentina: 11-1234-5678.
// Los de más de 10 dígitos (ej. con el 15 adelante) se muestran sin guiones, para no cortarlos.
export const formatPhone = (raw = '') => {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, PHONE_MAX_DIGITS);
  if (digits.length > 10) return digits;
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
};

// Teléfono del primer contacto de un cliente o proveedor, para listados y resúmenes.
export const getMainPhone = (contacts) => formatPhone(contacts?.[0]?.numero);
