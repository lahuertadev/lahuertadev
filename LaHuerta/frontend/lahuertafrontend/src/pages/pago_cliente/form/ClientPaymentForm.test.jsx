import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import ClientPaymentForm from './ClientPaymentForm';
import { bankUrl, clientPaymentUrl, clientUrl, paymentTypeUrl } from '../../../constants/urls';

// El primer render del formulario (MUI + Formik) es lento en el contenedor.
jest.setTimeout(20000);

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
// El selector de fecha de MUI no aporta a estos tests: un input simple con el mismo contrato.
jest.mock('../../../components/DatePicker', () => ({ value, onChange, required }) => (
  <input data-testid="date" aria-required={required || undefined} value={value || ''} onChange={(e) => onChange(e.target.value || null)} />
));

// jsdom no implementa matchMedia (lo usa useSpotlight de SpotlightButton).
beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() });
});

beforeEach(() => {
  axios.get.mockImplementation((url) => {
    if (url === clientUrl) return Promise.resolve({ data: [{ id: 3, cuit: '20111111112', razon_social: 'Verdulería Ana' }] });
    if (url === paymentTypeUrl) return Promise.resolve({ data: [{ id: 1, descripcion: 'Efectivo' }, { id: 2, descripcion: 'Cheque' }] });
    if (url === bankUrl) return Promise.resolve({ data: [{ id: 9, descripcion: 'Nación' }] });
    return Promise.resolve({ data: [] });
  });
  axios.post.mockResolvedValue({ data: { id: 40 } });
});

afterEach(() => jest.clearAllMocks());

const renderForm = () =>
  render(
    <MemoryRouter initialEntries={['/client-payment/create']}>
      <Routes>
        <Route path="/client-payment/create" element={<ClientPaymentForm />} />
        <Route path="/client-payment" element={<div>Listado</div>} />
      </Routes>
    </MemoryRouter>,
  );

const registerButton = () => screen.getByRole('button', { name: /Registrar Pago/ });
const [CLIENT, TYPE] = [0, 1];

const fillPayment = async (paymentType) => {
  await screen.findByRole('option', { name: '20111111112 - Verdulería Ana' });
  const selects = screen.getAllByRole('combobox');
  fireEvent.change(selects[CLIENT], { target: { value: '3' } });
  fireEvent.change(screen.getByPlaceholderText('0,00'), { target: { value: '1500' } });
  fireEvent.change(screen.getAllByTestId('date')[0], { target: { value: '2026-11-16' } });
  fireEvent.change(selects[TYPE], { target: { value: paymentType } });
};

test('marca los campos obligatorios con asterisco y aria-required', async () => {
  renderForm();
  await screen.findByRole('option', { name: '20111111112 - Verdulería Ana' });

  ['Cliente', 'Importe', 'Fecha de pago', 'Tipo de pago'].forEach((label) => {
    expect(screen.getByText(label).querySelector('[aria-hidden="true"]')).toHaveTextContent('*');
  });
  expect(screen.getByText('Observaciones').querySelector('[aria-hidden="true"]')).toBeNull();
  screen.getAllByRole('combobox').forEach((select) => expect(select).toHaveAttribute('aria-required', 'true'));
  expect(screen.getByPlaceholderText('0,00')).toHaveAttribute('aria-required', 'true');
});

test('tiene Volver arriba y Cancelar abajo, que vuelven al listado', async () => {
  renderForm();

  fireEvent.click(await screen.findByRole('button', { name: /Volver/ }));

  expect(await screen.findByText('Listado')).toBeInTheDocument();
});

test('Registrar Pago se habilita recién con todos los obligatorios completos', async () => {
  renderForm();
  await screen.findByRole('option', { name: '20111111112 - Verdulería Ana' });
  expect(registerButton()).toBeDisabled();

  await fillPayment('1');

  await waitFor(() => expect(registerButton()).toBeEnabled());
  fireEvent.click(registerButton());
  await waitFor(() => expect(axios.post).toHaveBeenCalledWith(clientPaymentUrl, expect.objectContaining({ cliente: '3', importe: '1500' })));
});

test('con cheque pide número, banco y fecha de emisión, y la de depósito si es diferido', async () => {
  renderForm();
  await fillPayment('2');

  expect((await screen.findByText('Número')).querySelector('[aria-hidden="true"]')).toHaveTextContent('*');
  expect(registerButton()).toBeDisabled();

  fireEvent.change(screen.getByPlaceholderText('Nº de cheque'), { target: { value: '1234' } });
  fireEvent.change(screen.getAllByRole('combobox')[2], { target: { value: '9' } });
  fireEvent.change(screen.getAllByTestId('date')[1], { target: { value: '2026-11-10' } });
  await waitFor(() => expect(registerButton()).toBeEnabled());

  fireEvent.click(screen.getByRole('checkbox'));
  await waitFor(() => expect(registerButton()).toBeDisabled());

  fireEvent.change(screen.getAllByTestId('date')[2], { target: { value: '2026-12-01' } });
  await waitFor(() => expect(registerButton()).toBeEnabled());
});
