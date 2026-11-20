// Reparto de un pago a proveedor entre sus compras (DEV-150). Los importes se calculan en centavos
// para no arrastrar errores de punto flotante.

const toCents = (value) => {
  const number = parseFloat(value);
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
};

const fromCents = (cents) => (cents / 100).toFixed(2);

//* Compras de la más vieja a la más nueva (misma fecha: la cargada primero).
export const sortOldestFirst = (buys) =>
  [...buys].sort((a, b) => (a.fecha === b.fecha ? a.id - b.id : a.fecha < b.fecha ? -1 : 1));

/**
 * Reparte el importe entre las compras elegidas, de la más vieja a la más nueva, sin darle a
 * ninguna más que su saldo disponible. Devuelve { [id]: importe } con las elegidas; las que no
 * alcanzan quedan en '0.00'.
 *
 *   buys        — [{ id, fecha, available }] (available: lo que se le puede aplicar)
 *   selectedIds — ids elegidos
 *   amount      — importe del pago
 */
export const distributeAmount = (buys, selectedIds, amount) => {
  const selected = new Set(selectedIds.map(String));
  let remaining = toCents(amount);
  const allocations = {};
  sortOldestFirst(buys.filter((buy) => selected.has(String(buy.id)))).forEach((buy) => {
    const applied = Math.max(Math.min(toCents(buy.available), remaining), 0);
    allocations[buy.id] = fromCents(applied);
    remaining -= applied;
  });
  return allocations;
};

//* Total aplicado a las compras.
export const totalApplied = (allocations) =>
  fromCents(Object.values(allocations).reduce((sum, value) => sum + toCents(value), 0));

//* Lo que no se aplica a ninguna compra y queda a cuenta (nunca negativo).
export const onAccountAmount = (allocations, amount) =>
  fromCents(Math.max(toCents(amount) - toCents(totalApplied(allocations)), 0));

/**
 * Errores del reparto: por compra, si recibe más que su saldo disponible; y en total, si lo
 * aplicado supera el importe del pago.
 */
export const allocationErrors = (buys, allocations, amount) => {
  const rows = {};
  buys.forEach((buy) => {
    if (allocations[buy.id] !== undefined && toCents(allocations[buy.id]) > toCents(buy.available)) {
      rows[buy.id] = 'Supera el saldo de la compra.';
    }
  });
  const total = toCents(totalApplied(allocations)) > toCents(amount)
    ? 'Lo aplicado a las compras supera el importe del pago.'
    : null;
  return { rows, total };
};

//* Compras para el backend: solo las que reciben algo (las que quedaron en cero no se mandan).
export const applicationsPayload = (allocations) =>
  Object.entries(allocations)
    .filter(([, value]) => toCents(value) > 0)
    .map(([id, value]) => ({ compra: Number(id), importe: fromCents(toCents(value)) }));

/**
 * Compras que, al editar el pago, pierden parte o todo lo que este pago les cubría (se destildaron
 * o se les bajó lo aplicado): vuelven a deber esa diferencia. Devuelve [{ id, released }].
 *
 *   currentApplications — [{ id, importe_aplicado }] lo que el pago les aplicaba antes de editarlo
 *   allocations         — { [id]: importe } lo que les aplica ahora (sin la compra: se destildó)
 */
export const releasedBuys = (currentApplications, allocations) =>
  currentApplications
    .map((buy) => ({ id: buy.id, released: fromCents(toCents(buy.importe_aplicado) - toCents(allocations[buy.id])) }))
    .filter((buy) => toCents(buy.released) > 0);
