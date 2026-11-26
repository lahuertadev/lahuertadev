// Número de un comprobante del sistema (compra, pago) con 8 dígitos: 70 → "00000070".
export const formatDocumentNumber = (id) => String(id).padStart(8, '0');
