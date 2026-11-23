import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import ClientPaymentDetail from './ClientPaymentDetail';
import { ToastProvider } from '../../../context/ToastContext';
import { BADGE_COLORS } from '../../../constants/badgeColors';
import { formatDate } from '../../../utils/date';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));

const check = (id, numero, estado = 'EN_CARTERA', importe = '1000000.00') => ({
  id, numero, importe, banco: 1, banco_descripcion: 'Nación', fecha_emision: '2026-11-10', fecha_deposito: null, endosado: false, estado,
});

const PAYMENT = {
  id: 8,
  fecha_pago: '2026-11-16',
  importe: '2000000.00',
  observaciones: null,
  estado_pago: 'VIGENTE',
  fecha_anulacion: null,
  motivo_anulacion: null,
  cliente: { razon_social: 'Clöe', cuit: '20111111112' },
  tipo_pago: { descripcion: 'Cheque' },
  cheques: [check(31, 123), check(32, 456)],
};

const CANCELLED = { ...PAYMENT, estado_pago: 'ANULADO', fecha_anulacion: '2026-11-20', motivo_anulacion: 'Lo pagó Kona, no Clöe' };

const setMobile = (matches) => {
  window.matchMedia = (query) => ({ matches, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() });
};

beforeEach(() => setMobile(false));
afterEach(() => jest.clearAllMocks());

const renderDetail = (payment) => {
  axios.get.mockResolvedValue({ data: payment });
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/client-payment/detail/8']}>
        <Routes>
          <Route path="/client-payment/detail/:id" element={<ClientPaymentDetail />} />
          <Route path="/client-payment" element={<div>Listado</div>} />
          <Route path="/check/detail/:id" element={<div>Detalle del cheque</div>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
};

test('un pago vigente muestra el estado "Vigente" y todos sus cheques', async () => {
  renderDetail(PAYMENT);

  expect(await screen.findByText('Vigente')).toBeInTheDocument();
  expect(screen.getByText('Cheques (2)')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '123' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '456' })).toBeInTheDocument();
});

test('un pago con un cheque rechazado avisa que su importe se descontó', async () => {
  renderDetail({ ...PAYMENT, cheques: [check(31, 123, 'RECHAZADO'), check(32, 456)] });

  expect(await screen.findByText(/El cheque N° 123 fue rechazado/)).toBeInTheDocument();
  expect(screen.getByText('Rechazado')).toHaveStyle({ color: BADGE_COLORS.red.color });
});

test('un pago anulado muestra el aviso con la fecha y el motivo, sin Editar', async () => {
  renderDetail(CANCELLED);

  expect(await screen.findByText(new RegExp(`Pago anulado el ${formatDate('2026-11-20')}`))).toBeInTheDocument();
  expect(screen.getByText('Lo pagó Kona, no Clöe')).toBeInTheDocument();
  expect(screen.getByText('Anulado')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Editar pago/ })).toBeNull();
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

test('en mobile, anular pide el motivo y muestra el pago anulado', async () => {
  setMobile(true);
  axios.post.mockResolvedValue({ data: CANCELLED });
  renderDetail(PAYMENT);

  fireEvent.click(await screen.findByRole('button', { name: /^Anular$/ }));
  const confirm = screen.getAllByRole('button', { name: /Anular/ }).at(-1);
  expect(confirm).toBeDisabled();

  fireEvent.change(screen.getByLabelText(/Motivo de la anulación/), { target: { value: '  Lo pagó Kona, no Clöe ' } });
  expect(confirm).toBeEnabled();
  fireEvent.click(confirm);

  expect(await screen.findByText('El pago se anuló correctamente.')).toBeInTheDocument();
  expect(axios.post).toHaveBeenCalledWith(expect.stringMatching(/\/8\/cancel\/$/), { motivo: 'Lo pagó Kona, no Clöe' });
  expect(screen.getByText(/Pago anulado el/)).toBeInTheDocument();
});
