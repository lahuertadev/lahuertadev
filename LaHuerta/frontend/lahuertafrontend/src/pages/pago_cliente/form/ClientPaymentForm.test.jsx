import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import ClientPaymentForm from './ClientPaymentForm';
import { ToastProvider } from '../../../context/ToastContext';
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

const renderForm = (path = '/client-payment/create') =>
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/client-payment/create" element={<ClientPaymentForm />} />
          <Route path="/client-payment/edit/:id" element={<ClientPaymentForm />} />
          <Route path="/client-payment" element={<div>Listado</div>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
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
  // Vuelve al listado con el mensaje de éxito.
  expect(await screen.findByText('El pago se registró correctamente.')).toBeInTheDocument();
  expect(screen.getByText('Listado')).toBeInTheDocument();
});

test('al editar un pago vuelve al listado con el mensaje de éxito', async () => {
  const payment = { id: 5, cliente: { id: 3 }, importe: '1500.00', fecha_pago: '2026-11-16', tipo_pago: { id: 1 }, observaciones: '', cheque: null };
  const getOptions = axios.get.getMockImplementation();
  axios.get.mockImplementation((url) => (url === `${clientPaymentUrl}5/` ? Promise.resolve({ data: payment }) : getOptions(url)));
  axios.put.mockResolvedValue({ data: {} });
  renderForm('/client-payment/edit/5');

  await waitFor(() => expect(screen.getByPlaceholderText('0,00')).toHaveValue('1.500,00'));
  const confirm = await screen.findByRole('button', { name: /Guardar cambios/ });
  await waitFor(() => expect(confirm).toBeEnabled());
  fireEvent.click(confirm);

  await waitFor(() => expect(axios.put).toHaveBeenCalledWith(`${clientPaymentUrl}5/`, expect.objectContaining({ cliente: 3 })));
  expect(await screen.findByText('El pago se actualizó correctamente.')).toBeInTheDocument();
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

  fireEvent.click(screen.getByRole('checkbox', { name: 'Cheque diferido' }));
  await waitFor(() => expect(registerButton()).toBeDisabled());

  fireEvent.change(screen.getAllByTestId('date')[2], { target: { value: '2026-12-01' } });
  await waitFor(() => expect(registerButton()).toBeEnabled());
});
