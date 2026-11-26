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
    if (url === clientUrl) return Promise.resolve({ data: [
      { id: 3, cuit: '20111111112', razon_social: 'Verdulería Ana', nombre_fantasia: 'La Esquina', cuenta_corriente: '5000.00' },
      { id: 4, cuit: '30222222223', razon_social: 'Frutería Beto', nombre_fantasia: '', cuenta_corriente: '800.00' },
    ] });
    if (url === paymentTypeUrl) return Promise.resolve({ data: [
      { id: 1, descripcion: 'Efectivo' }, { id: 2, descripcion: 'Cheque' }, { id: 3, descripcion: 'Transferencia' },
    ] });
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
const clientSearch = () => screen.getByPlaceholderText('Buscar por CUIT, razón social o nombre de fantasía...');
// El tipo de pago es el único <select> del formulario (el cliente es un buscador).
const typeSelect = () => screen.getAllByRole('combobox').find((element) => element.tagName === 'SELECT');
const optionsLoaded = () => screen.findByRole('option', { name: 'Efectivo' });

const chooseClient = (text, name) => {
  fireEvent.change(clientSearch(), { target: { value: text } });
  fireEvent.click(screen.getByRole('option', { name: new RegExp(name) }));
};

const fillPayment = async (paymentType) => {
  await optionsLoaded();
  chooseClient('Ana', 'Verdulería Ana');
  fireEvent.change(screen.getByPlaceholderText('0,00'), { target: { value: '1500' } });
  fireEvent.change(screen.getAllByTestId('date')[0], { target: { value: '2026-11-16' } });
  fireEvent.change(typeSelect(), { target: { value: paymentType } });
};

test('marca los campos obligatorios con asterisco y aria-required', async () => {
  renderForm();
  await optionsLoaded();

  ['Cliente', 'Importe', 'Fecha de pago', 'Tipo de pago'].forEach((label) => {
    expect(screen.getByText(label).querySelector('[aria-hidden="true"]')).toHaveTextContent('*');
  });
  expect(screen.getByText('Observaciones').querySelector('[aria-hidden="true"]')).toBeNull();
  screen.getAllByRole('combobox').forEach((select) => expect(select).toHaveAttribute('aria-required', 'true'));
  expect(screen.getByPlaceholderText('0,00')).toHaveAttribute('aria-required', 'true');
});

test('tiene Volver arriba (desktop) y abajo (mobile), que vuelven al listado', async () => {
  renderForm();

  const backButtons = await screen.findAllByRole('button', { name: /Volver/ });
  expect(backButtons).toHaveLength(2);
  fireEvent.click(backButtons[1]);

  expect(await screen.findByText('Listado')).toBeInTheDocument();
});

test('Registrar Pago se habilita recién con todos los obligatorios completos', async () => {
  renderForm();
  await optionsLoaded();
  expect(registerButton()).toBeDisabled();

  await fillPayment('1');

  await waitFor(() => expect(registerButton()).toBeEnabled());
  fireEvent.click(registerButton());
  await waitFor(() => expect(axios.post).toHaveBeenCalledWith(clientPaymentUrl, expect.objectContaining({ cliente: 3, importe: '1500' })));
  // Vuelve al listado con el mensaje de éxito.
  expect(await screen.findByText('El pago se registró correctamente.')).toBeInTheDocument();
  expect(screen.getByText('Listado')).toBeInTheDocument();
});

test('al editar un pago vuelve al listado con el mensaje de éxito', async () => {
  const payment = { id: 5, cliente: { id: 3 }, importe: '1500.00', fecha_pago: '2026-11-16', tipo_pago: { id: 1 }, observaciones: '', cheques: [] };
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

// Los <select> del formulario: el tipo de pago y el banco de cada cheque.
const selects = () => screen.getAllByRole('combobox').filter((element) => element.tagName === 'SELECT');

// Completa el cheque en la posición index. dateIndex: su fecha de emisión entre los datepickers.
const fillCheck = (index, numero, amount, dateIndex) => {
  fireEvent.change(screen.getAllByPlaceholderText('Nº de cheque')[index], { target: { value: numero } });
  fireEvent.change(selects()[index + 1], { target: { value: '9' } });
  fireEvent.change(screen.getAllByPlaceholderText('0,00')[index], { target: { value: amount } });
  fireEvent.change(screen.getAllByTestId('date')[dateIndex], { target: { value: '2026-11-10' } });
};

describe('pago con cheques', () => {
  test('cada cheque pide número, banco, importe y fecha de emisión, y la de depósito si es diferido', async () => {
    renderForm();
    await fillPayment('2');

    expect((await screen.findByText('Número')).querySelector('[aria-hidden="true"]')).toHaveTextContent('*');
    expect(registerButton()).toBeDisabled();

    fillCheck(0, '1234', '1000', 1);
    await waitFor(() => expect(registerButton()).toBeEnabled());

    fireEvent.click(screen.getByRole('checkbox', { name: 'Cheque diferido' }));
    await waitFor(() => expect(registerButton()).toBeDisabled());

    fireEvent.change(screen.getAllByTestId('date')[2], { target: { value: '2026-12-01' } });
    await waitFor(() => expect(registerButton()).toBeEnabled());
  });

  test('con varios cheques el importe es la suma y se mandan todos', async () => {
    renderForm();
    await fillPayment('2');
    fillCheck(0, '111', '1000', 1);

    fireEvent.click(await screen.findByRole('button', { name: /Agregar cheque/ }));
    await waitFor(() => expect(registerButton()).toBeDisabled());
    fillCheck(1, '222', '2500', 2);

    await waitFor(() => expect(registerButton()).toBeEnabled());
    // El primer "Importe" es el del pago, de solo lectura; después vienen los de cada cheque.
    expect(screen.getAllByText('Importe')[0].parentElement.parentElement).toHaveTextContent(/3\.500,00/);
    expect(screen.getByText('Saldo después del pago').parentElement.parentElement).toHaveTextContent(/1\.500,00/);

    fireEvent.click(registerButton());
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const payload = axios.post.mock.calls[0][1];
    expect(payload.importe).toBeUndefined();
    expect(payload.cheques).toEqual([
      { numero: '111', banco: '9', importe: '1000', fecha_emision: '2026-11-10', fecha_deposito: null },
      { numero: '222', banco: '9', importe: '2500', fecha_emision: '2026-11-10', fecha_deposito: null },
    ]);
  });

  test('el mismo cheque dos veces no deja registrar y lo avisa', async () => {
    renderForm();
    await fillPayment('2');
    fillCheck(0, '111', '1000', 1);
    fireEvent.click(await screen.findByRole('button', { name: /Agregar cheque/ }));
    fillCheck(1, '111', '500', 2);

    expect(await screen.findByText('Este cheque ya está en el pago')).toBeInTheDocument();
    expect(registerButton()).toBeDisabled();
  });

  test('al editar, el cliente y el tipo quedan fijos, un cheque endosado no se toca y uno en cartera se puede quitar', async () => {
    const check = (id, numero, importe, estado) => ({
      id, numero, banco: 9, importe, fecha_emision: '2026-11-10', fecha_deposito: null, estado, endosado: estado === 'ENDOSADO',
    });
    const payment = {
      id: 5, cliente: { id: 3 }, importe: '1500.00', fecha_pago: '2026-11-16', tipo_pago: { id: 2 }, observaciones: '',
      cheques: [check(31, 111, '1000.00', 'ENDOSADO'), check(32, 222, '500.00', 'EN_CARTERA')],
    };
    const getOptions = axios.get.getMockImplementation();
    axios.get.mockImplementation((url) => (url === `${clientPaymentUrl}5/` ? Promise.resolve({ data: payment }) : getOptions(url)));
    axios.put.mockResolvedValue({ data: {} });
    renderForm('/client-payment/edit/5');

    expect(await screen.findByText(/para cambiar el cliente o el tipo de pago, anulá el pago/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByPlaceholderText('Nº de cheque')[0]).toHaveValue(111));
    expect(typeSelect()).toBeDisabled();
    expect(screen.getAllByPlaceholderText('Nº de cheque')[0]).toBeDisabled();
    expect(screen.getAllByPlaceholderText('Nº de cheque')[1]).toBeEnabled();
    expect(screen.getAllByRole('button', { name: 'Quitar cheque' })).toHaveLength(1);
    // El endosado queda compacto y sin el botón de expandir; el que está en cartera sí lo tiene.
    expect(screen.getAllByRole('button', { name: /Expandir cheque|Compactar cheque/ })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Quitar cheque' }));
    const confirm = screen.getByRole('button', { name: /Guardar cambios/ });
    await waitFor(() => expect(confirm).toBeEnabled());
    fireEvent.click(confirm);

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(axios.put.mock.calls[0][1].cheques).toEqual([
      { id: 31, numero: 111, banco: 9, importe: '1000.00', fecha_emision: '2026-11-10', fecha_deposito: null },
    ]);
  });

  test('al editar, un cheque depositado queda compacto, con el candado y sin expandir ni quitar', async () => {
    const payment = {
      id: 6, cliente: { id: 3 }, importe: '700.00', fecha_pago: '2026-11-16', tipo_pago: { id: 2 }, observaciones: '',
      cheques: [
        { id: 41, numero: 333, banco: 9, importe: '700.00', fecha_emision: '2026-11-10', fecha_deposito: null, estado: 'DEPOSITADO', endosado: false },
      ],
    };
    const getOptions = axios.get.getMockImplementation();
    axios.get.mockImplementation((url) => (url === `${clientPaymentUrl}6/` ? Promise.resolve({ data: payment }) : getOptions(url)));
    renderForm('/client-payment/edit/6');

    expect(await screen.findByText('Cheque N° 333')).toBeInTheDocument();
    expect(screen.getByLabelText('Ya no está en cartera: no se puede modificar ni quitar.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Expandir cheque|Compactar cheque/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quitar cheque' })).not.toBeInTheDocument();
  });
});

test('los tipos de pago están en orden alfabético', async () => {
  renderForm();
  await optionsLoaded();

  const names = Array.from(typeSelect().options).map((option) => option.textContent).slice(1);
  expect(names).toEqual(['Cheque', 'Efectivo', 'Transferencia']);
});

describe('buscador de cliente', () => {
  test('marca el paso del tutorial como completo recién con un cliente elegido', async () => {
    renderForm();
    await optionsLoaded();
    const step = clientSearch().closest('[data-tour="payment-client"]');
    expect(step).toHaveAttribute('data-tour-complete', 'false');

    fireEvent.change(clientSearch(), { target: { value: 'Ana' } });
    expect(step).toHaveAttribute('data-tour-complete', 'false');
    fireEvent.click(screen.getByRole('option', { name: /Verdulería Ana/ }));

    expect(step).toHaveAttribute('data-tour-complete', 'true');
  });
});

describe('saldo del cliente', () => {
  // El campo de solo lectura: el label y su valor.
  const balanceField = (label) => screen.getByText(label).parentElement.parentElement;

  test('muestra el saldo de hoy y cómo queda con el importe del pago', async () => {
    renderForm();
    await optionsLoaded();

    chooseClient('Ana', 'Verdulería Ana');
    expect(balanceField('Saldo en cuenta corriente')).toHaveTextContent(/5\.000,00/);
    fireEvent.change(screen.getByPlaceholderText('0,00'), { target: { value: '1500' } });

    expect(balanceField('Saldo en cuenta corriente')).toHaveTextContent(/5\.000,00/);
    expect(balanceField('Saldo después del pago')).toHaveTextContent(/3\.500,00/);
  });

  test('al editar, el saldo de hoy ya tiene descontado el pago: se suma lo guardado y se resta lo nuevo', async () => {
    // Ana debía 6.500 y pagó 1.500: hoy debe 5.000. Si el pago pasa a 1.000, queda en 5.500.
    const payment = { id: 5, cliente: { id: 3 }, importe: '1500.00', fecha_pago: '2026-11-16', tipo_pago: { id: 1 }, observaciones: '', cheques: [] };
    const getOptions = axios.get.getMockImplementation();
    axios.get.mockImplementation((url) => (url === `${clientPaymentUrl}5/` ? Promise.resolve({ data: payment }) : getOptions(url)));
    renderForm('/client-payment/edit/5');
    await waitFor(() => expect(screen.getByPlaceholderText('0,00')).toHaveValue('1.500,00'));

    expect(balanceField('Saldo al guardar los cambios')).toHaveTextContent(/5\.000,00/);
    fireEvent.change(screen.getByPlaceholderText('0,00'), { target: { value: '1000' } });

    expect(balanceField('Saldo al guardar los cambios')).toHaveTextContent(/5\.500,00/);
  });
});
