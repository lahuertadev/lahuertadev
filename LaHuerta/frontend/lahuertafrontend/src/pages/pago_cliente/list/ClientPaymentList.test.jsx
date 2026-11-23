import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import ClientPaymentList from '.';
import { ToastProvider } from '../../../context/ToastContext';
import { paymentTypeUrl } from '../../../constants/urls';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock('../../../components/DatePicker', () => ({ label }) => <span>{label}</span>);

const PAYMENT = {
  id: 8, fecha_pago: '2026-11-16', importe: '500000.00', observaciones: null, estado_pago: 'VIGENTE',
  cliente: { razon_social: 'Clöe' }, tipo_pago: { descripcion: 'Efectivo' }, cheques: [],
};

const mockPayments = (payments) => axios.get.mockImplementation((url) => Promise.resolve({ data: url === paymentTypeUrl ? [] : payments }));

const renderList = async () => {
  render(<ToastProvider><MemoryRouter><ClientPaymentList /></MemoryRouter></ToastProvider>);
  await screen.findByText('Clöe');
};

beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn(), addListener: jest.fn(), removeListener: jest.fn() });
});

beforeEach(() => mockPayments([PAYMENT]));
afterEach(() => jest.clearAllMocks());

test('Detalle, Editar y Anular van juntos en la columna "Acción", con sus data-tour', async () => {
  await renderList();

  expect(screen.getByText('Acción')).toBeInTheDocument();
  const cell = document.querySelector('[data-id="8"] [data-field="actions"]');
  ['grid-detail', 'grid-edit', 'grid-delete'].forEach((tour) => expect(cell.querySelector(`[data-tour="${tour}"]`)).not.toBeNull());
});

test('entra en la solapa Vigentes y pide al backend los pagos vigentes', async () => {
  await renderList();

  expect(screen.getByRole('tab', { name: 'Vigentes' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: 'Anulados' })).toBeInTheDocument();
  expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('state=VIGENTE'));
});

test('un pago anulado muestra el importe tachado', async () => {
  mockPayments([{ ...PAYMENT, estado_pago: 'ANULADO' }]);
  await renderList();

  expect(screen.getByText('$500.000,00')).toHaveClass('line-through');
});

test('al anular, el diálogo explica qué pasa con la cuenta corriente y los cheques', async () => {
  mockPayments([{
    ...PAYMENT,
    tipo_pago: { descripcion: 'Cheque' },
    cheques: [{ id: 31, numero: 171717, estado: 'EN_CARTERA' }, { id: 32, numero: 181818, estado: 'EN_CARTERA' }],
  }]);
  await renderList();

  fireEvent.click(document.querySelector('[data-id="8"] [data-tour="grid-delete"]'));

  expect(await screen.findByText(/Vas a anular el pago de/)).toHaveTextContent('Vas a anular el pago de $500.000,00 de Clöe.');
  expect(screen.getByText(/La deuda del cliente sube/)).toBeInTheDocument();
  expect(screen.getByText(/Los cheques N° 171717, N° 181818 quedan anulados/)).toBeInTheDocument();
});

test('al anular desde el listado pide el motivo y lo manda al backend', async () => {
  axios.post.mockResolvedValue({ data: {} });
  await renderList();

  fireEvent.click(document.querySelector('[data-id="8"] [data-tour="grid-delete"]'));
  const confirm = await screen.findByRole('button', { name: /^Anular$/ });
  expect(confirm).toBeDisabled();

  fireEvent.change(screen.getByLabelText(/Motivo de la anulación/), { target: { value: 'Se cargó dos veces' } });
  fireEvent.click(confirm);

  await waitFor(() => expect(axios.post).toHaveBeenCalledWith(expect.stringMatching(/\/8\/cancel\/$/), { motivo: 'Se cargó dos veces' }));
  expect(await screen.findByText('El pago se anuló correctamente.')).toBeInTheDocument();
});
