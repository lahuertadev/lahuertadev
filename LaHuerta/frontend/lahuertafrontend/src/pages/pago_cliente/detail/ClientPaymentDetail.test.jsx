import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import ClientPaymentDetail from './ClientPaymentDetail';
import { BADGE_COLORS } from '../../../constants/badgeColors';

jest.mock('axios', () => ({ get: jest.fn(), delete: jest.fn() }));

const PAYMENT = {
  id: 8,
  fecha_pago: '2026-11-16',
  importe: '2000000.00',
  observaciones: null,
  cliente: { razon_social: 'Clöe', cuit: '20111111112' },
  tipo_pago: { descripcion: 'Cheque' },
  cheque: { id: 31, numero: 123, banco_descripcion: 'Nación', fecha_emision: '2026-11-10', fecha_deposito: null, estado: 'EN_CARTERA' },
};

beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() });
});

const renderDetail = (payment) => {
  axios.get.mockResolvedValue({ data: payment });
  render(
    <MemoryRouter initialEntries={['/client-payment/detail/8']}>
      <Routes>
        <Route path="/client-payment/detail/:id" element={<ClientPaymentDetail />} />
        <Route path="/client-payment" element={<div>Listado</div>} />
        <Route path="/check/detail/:id" element={<div>Detalle del cheque</div>} />
      </Routes>
    </MemoryRouter>,
  );
};

test('un pago con el cheque rechazado muestra la etiqueta roja "Rechazado"', async () => {
  renderDetail({ ...PAYMENT, cheque: { ...PAYMENT.cheque, estado: 'RECHAZADO' } });

  expect(await screen.findByText('Rechazado')).toHaveStyle({ color: BADGE_COLORS.red.color });
});

test('un pago sin cheque rechazado muestra la etiqueta verde "Acreditado"', async () => {
  renderDetail(PAYMENT);

  expect(await screen.findByText('Acreditado')).toHaveStyle({ color: BADGE_COLORS.green.color });
});

test('tiene Volver arriba (desktop) y abajo (mobile), que vuelven al listado', async () => {
  renderDetail(PAYMENT);

  const backButtons = await screen.findAllByRole('button', { name: /Volver/ });
  expect(backButtons).toHaveLength(2);
  fireEvent.click(backButtons[1]);

  expect(await screen.findByText('Listado')).toBeInTheDocument();
});

test('el número de cheque lleva al detalle del cheque', async () => {
  renderDetail(PAYMENT);

  fireEvent.click(await screen.findByRole('button', { name: '123' }));

  expect(await screen.findByText('Detalle del cheque')).toBeInTheDocument();
});
