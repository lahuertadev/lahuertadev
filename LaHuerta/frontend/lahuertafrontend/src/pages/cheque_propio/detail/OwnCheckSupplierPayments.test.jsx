import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OwnCheckSupplierPayments from './OwnCheckSupplierPayments';

const CHECK = {
  supplier: { id: 7, nombre: 'Ricardo', puesto: 27 },
  used_amount: '450000.00',
  remaining_balance: '550000.00',
  payments: [
    { id: 1, fecha_pago: '2026-10-28', tipo: 'COMPRA', compra: { id: 12, fecha: '2026-10-22' }, importe_abonado: '300000.00' },
    { id: 2, fecha_pago: '2026-10-29', tipo: 'A_CUENTA', compra: null, importe_abonado: '150000.00' },
  ],
};

const renderSection = (check) =>
  render(
    <MemoryRouter initialEntries={['/own-check/detail/1']}>
      <Routes>
        <Route path="/own-check/detail/1" element={<OwnCheckSupplierPayments check={check} />} />
        <Route path="/buy/detail/:id" element={<div>Detalle compra</div>} />
        <Route path="/purchase-payment/detail/:id" element={<div>Detalle pago</div>} />
      </Routes>
    </MemoryRouter>
  );

test('sin pagos avisa que el cheque no está asociado a ningún pago', () => {
  renderSection({ supplier: null, payments: [] });

  expect(screen.getByText('Todavía no se encuentra asociado a ningún pago.')).toBeInTheDocument();
});

test('muestra el proveedor con su puesto', () => {
  renderSection(CHECK);

  expect(screen.getByText('27 · Ricardo')).toBeInTheDocument();
});

test('lista los pagos de compras y a cuenta, con "A cuenta" en lugar de la compra', () => {
  renderSection(CHECK);
  const table = screen.getByRole('table');
  const rows = within(table).getAllByRole('row').slice(1);

  expect(rows).toHaveLength(2);
  expect(within(rows[0]).getByText('Pago de compras')).toBeInTheDocument();
  expect(within(rows[0]).getByRole('button', { name: 'N° 00000012' })).toBeInTheDocument();
  expect(within(rows[1]).getByText('Pago a cuenta')).toBeInTheDocument();
  expect(within(rows[1]).getByText('A cuenta')).toBeInTheDocument();
});

test('el número de compra lleva al detalle de la compra', () => {
  renderSection(CHECK);

  fireEvent.click(within(screen.getByRole('table')).getByRole('button', { name: 'N° 00000012' }));

  expect(screen.getByText('Detalle compra')).toBeInTheDocument();
});

test('la fila del pago lleva al detalle del pago', () => {
  renderSection(CHECK);

  fireEvent.click(within(screen.getByRole('table')).getByText('Pago a cuenta'));

  expect(screen.getByText('Detalle pago')).toBeInTheDocument();
});
