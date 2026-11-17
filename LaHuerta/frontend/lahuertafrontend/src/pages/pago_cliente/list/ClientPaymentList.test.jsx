import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import ClientPaymentList from '.';
import { ToastProvider } from '../../../context/ToastContext';
import { paymentTypeUrl } from '../../../constants/urls';

jest.mock('axios', () => ({ get: jest.fn(), delete: jest.fn() }));
jest.mock('../../../components/DatePicker', () => ({ label }) => <span>{label}</span>);

const PAYMENT = {
  id: 8, fecha_pago: '2026-11-16', importe: '500000.00', observaciones: null,
  cliente: { razon_social: 'Clöe' }, tipo_pago: { descripcion: 'Efectivo' }, cheque: null,
};

beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn(), addListener: jest.fn(), removeListener: jest.fn() });
});

beforeEach(() => {
  axios.get.mockImplementation((url) => Promise.resolve({ data: url === paymentTypeUrl ? [] : [PAYMENT] }));
});
afterEach(() => jest.clearAllMocks());

test('Detalle, Editar y Eliminar van juntos en la columna "Acción", con sus data-tour', async () => {
  render(<ToastProvider><MemoryRouter><ClientPaymentList /></MemoryRouter></ToastProvider>);
  await screen.findByText('Clöe');

  expect(screen.getByText('Acción')).toBeInTheDocument();
  ['Detalle', 'Editar', 'Eliminar'].forEach((header) => expect(screen.queryByRole('columnheader', { name: header })).toBeNull());
  const cell = document.querySelector('[data-id="8"] [data-field="actions"]');
  ['grid-detail', 'grid-edit', 'grid-delete'].forEach((tour) => expect(cell.querySelector(`[data-tour="${tour}"]`)).not.toBeNull());
});

test('al eliminar, el diálogo explica qué pasa con la cuenta corriente y el cheque', async () => {
  axios.get.mockImplementation((url) => Promise.resolve({
    data: url === paymentTypeUrl ? [] : [{ ...PAYMENT, tipo_pago: { descripcion: 'Cheque' }, cheque: { id: 31, numero: 171717, estado: 'EN_CARTERA' } }],
  }));
  render(<ToastProvider><MemoryRouter><ClientPaymentList /></MemoryRouter></ToastProvider>);
  await screen.findByText('Clöe');

  fireEvent.click(document.querySelector('[data-id="8"] [data-tour="grid-delete"]'));

  expect(await screen.findByText(/Vas a eliminar el pago de/)).toHaveTextContent('Vas a eliminar el pago de $500.000,00 de Clöe. No se puede deshacer.');
  expect(screen.getByText(/La deuda del cliente sube/)).toBeInTheDocument();
  expect(screen.getByText('Se elimina el cheque N° 171717.')).toBeInTheDocument();
  expect(screen.getByText(/no se va a poder eliminar/)).toBeInTheDocument();
});
