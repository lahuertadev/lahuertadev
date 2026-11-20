import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import PurchasePaymentForm from './PurchasePaymentForm';
import { buyUrl, checkUrl, ownCheckUrl, paymentTypeUrl, purchasePaymentUrl, supplierUrl } from '../../../constants/urls';
import { TUTORIAL_EVENT_NAME, TUTORIAL_EVENTS } from '../../../constants/tutorials';
import { ToastProvider } from '../../../context/ToastContext';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
// El selector de fecha de MUI no aporta a estos tests: un input simple con el mismo contrato.
jest.mock('../../../components/DatePicker', () => ({ value, onChange }) => (
  <input value={value || ''} onChange={(e) => onChange(e.target.value || null)} />
));

const SUPPLIER = { id: 7, nombre: 'Ricardo', puesto: 27, cuenta_corriente: '250000.00' };
// Compras del proveedor: la del medio ya está pagada y no se ofrece.
const BUYS = [
  { id: 13, fecha: '2026-10-25', importe: '300000.00', outstanding_balance: '300000.00', payment_status: 'PENDIENTE' },
  { id: 11, fecha: '2026-10-22', importe: '100000.00', outstanding_balance: '0.00', payment_status: 'ABONADO' },
  { id: 12, fecha: '2026-10-20', importe: '670000.00', outstanding_balance: '200000.00', payment_status: 'PARCIAL' },
];

const OWN_CHECKS = [
  { id: 884, numero: 884, banco: { descripcion: 'Galicia' }, importe: '1000000.00' },
  { id: 885, numero: 885, banco: { descripcion: 'Galicia' }, importe: '500000.00' },
];
const CLIENT_CHECKS = [
  { id: 50, numero: 15915915, banco: { descripcion: 'Nación' }, importe: '200000.00' },
  { id: 51, numero: 15915916, banco: { descripcion: 'Nación' }, importe: '300000.00' },
];

// jsdom no implementa matchMedia (lo usa useSpotlight de SpotlightButton).
beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() });
});

beforeEach(() => {
  axios.get.mockImplementation((url) => {
    if (url === supplierUrl) return Promise.resolve({ data: [SUPPLIER] });
    if (url === paymentTypeUrl) {
      return Promise.resolve({ data: [
        { id: 1, descripcion: 'Efectivo' }, { id: 2, descripcion: 'Cheque' }, { id: 3, descripcion: 'Cheque Propio' },
      ] });
    }
    if (url.startsWith(ownCheckUrl)) return Promise.resolve({ data: OWN_CHECKS });
    if (url === `${buyUrl}?proveedor_id=7`) return Promise.resolve({ data: BUYS });
    if (url.startsWith(checkUrl)) return Promise.resolve({ data: CLIENT_CHECKS });
    return Promise.resolve({ data: [] });
  });
});

afterEach(() => jest.clearAllMocks());

const renderForm = () =>
  render(
    <ToastProvider><MemoryRouter initialEntries={['/purchase-payment/create']}>
      <Routes>
        <Route path="/purchase-payment/create" element={<PurchasePaymentForm />} />
        <Route path="/purchase-payment" element={<div>Listado</div>} />
      </Routes>
    </MemoryRouter></ToastProvider>
  );

const tour = (name) => document.querySelector(`[data-tour="${name}"]`);
const field = (name) => tour(name).querySelector('input, select');
const confirmButton = () => screen.getByRole('button', { name: 'Registrar pago' });
const buyCheckbox = (id) => screen.getByRole('checkbox', { name: `Compra N° ${String(id).padStart(8, '0')}` });
const allocationInput = (id) => document.querySelector(`input[name="allocation-${id}"]`);

const supplierSearch = () => screen.getByPlaceholderText('Buscar por nombre o puesto...');

// Espera a que carguen los proveedores (llegan junto con el resto de las opciones).
const suppliersLoaded = () => waitFor(() => expect(axios.get).toHaveBeenCalledWith(supplierUrl, expect.anything()));

const chooseSupplier = async () => {
  await suppliersLoaded();
  fireEvent.change(supplierSearch(), { target: { value: 'Ricardo' } });
  fireEvent.click(await screen.findByRole('option', { name: /Ricardo/ }));
  await waitFor(() => expect(tour('payment-type')).not.toBeNull());
};

const fillCashPayment = async (amount = '1000') => {
  await screen.findByRole('option', { name: 'Efectivo' });
  fireEvent.change(field('payment-type'), { target: { value: '1' } });
  await waitFor(() => expect(tour('payment-amount')).not.toBeNull());
  fireEvent.change(field('payment-amount'), { target: { value: amount } });
};

describe('proveedor', () => {
  test('arranca pidiendo solo el proveedor', async () => {
    renderForm();
    await suppliersLoaded();

    expect(tour('payment-supplier')).not.toBeNull();
    expect(tour('payment-type')).toBeNull();
    expect(tour('payment-buys')).toBeNull();
    expect(confirmButton()).toBeDisabled();
  });

  test('al elegir el proveedor muestra su saldo y sus compras pendientes, de la más vieja a la más nueva', async () => {
    renderForm();
    await chooseSupplier();

    expect(await screen.findByText('Saldo en cuenta corriente')).toBeInTheDocument();
    await waitFor(() => expect(buyCheckbox(12)).toBeInTheDocument());
    const rows = within(tour('payment-buys')).getAllByRole('checkbox').map((box) => box.getAttribute('aria-label'));
    expect(rows).toEqual(['Compra N° 00000012', 'Compra N° 00000013']);
    expect(screen.queryByRole('checkbox', { name: 'Compra N° 00000011' })).toBeNull();
  });

  test('si el proveedor no tiene compras pendientes, avisa que el pago queda a cuenta', async () => {
    const defaultGet = axios.get.getMockImplementation();
    axios.get.mockImplementation((url) => (url === `${buyUrl}?proveedor_id=7` ? Promise.resolve({ data: [] }) : defaultGet(url)));
    renderForm();
    await chooseSupplier();

    expect(await screen.findByText(/no tiene compras pendientes/)).toBeInTheDocument();
  });
});

describe('pago a cuenta', () => {
  test('sin compras tildadas registra el pago a cuenta y avisa al tutorial', async () => {
    const listener = jest.fn();
    window.addEventListener(TUTORIAL_EVENT_NAME, listener);
    axios.post.mockResolvedValue({ data: { id: 30 } });
    renderForm();
    await chooseSupplier();
    await fillCashPayment();

    fireEvent.click(confirmButton());

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const [url, payload] = axios.post.mock.calls[0];
    expect(url).toBe(purchasePaymentUrl);
    expect(payload).toEqual(expect.objectContaining({ proveedor: 7, tipo_pago: '1', importe_abonado: '1000', compras: [] }));
    await waitFor(() => expect(listener).toHaveBeenCalled());
    expect(listener.mock.calls[0][0].detail).toEqual({ name: TUTORIAL_EVENTS.purchasePaymentCreated, id: 30 });
    expect(await screen.findByText('El pago se registró correctamente.')).toBeInTheDocument();
    window.removeEventListener(TUTORIAL_EVENT_NAME, listener);
  });

  test('en efectivo, "Registrar pago" se habilita recién con el importe', async () => {
    renderForm();
    await chooseSupplier();
    await screen.findByRole('option', { name: 'Efectivo' });
    fireEvent.change(field('payment-type'), { target: { value: '1' } });
    expect(confirmButton()).toBeDisabled();

    fireEvent.change(field('payment-amount'), { target: { value: '1000' } });

    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
  });
});

describe('pago de compras', () => {
  test('al tildar compras reparte el importe de la más vieja a la más nueva y muestra lo que queda a cuenta', async () => {
    renderForm();
    await chooseSupplier();
    await fillCashPayment('600000');
    await waitFor(() => expect(buyCheckbox(13)).toBeInTheDocument());

    fireEvent.click(buyCheckbox(13));
    fireEvent.click(buyCheckbox(12));

    await waitFor(() => expect(allocationInput(12)).toHaveValue('200.000,00'));
    expect(allocationInput(13)).toHaveValue('300.000,00');
    expect(within(tour('payment-buys')).getByText('Queda a cuenta').nextSibling).toHaveTextContent('$100.000,00');
  });

  test('si el importe no alcanza, la compra más nueva recibe lo que queda', async () => {
    renderForm();
    await chooseSupplier();
    await fillCashPayment('250000');
    await waitFor(() => expect(buyCheckbox(12)).toBeInTheDocument());

    fireEvent.click(buyCheckbox(12));
    fireEvent.click(buyCheckbox(13));

    await waitFor(() => expect(allocationInput(13)).toHaveValue('50.000,00'));
    expect(allocationInput(12)).toHaveValue('200.000,00');
  });

  test('al cambiar el importe se vuelve a repartir', async () => {
    renderForm();
    await chooseSupplier();
    await fillCashPayment('100000');
    await waitFor(() => expect(buyCheckbox(12)).toBeInTheDocument());
    fireEvent.click(buyCheckbox(12));
    await waitFor(() => expect(allocationInput(12)).toHaveValue('100.000,00'));

    fireEvent.change(field('payment-amount'), { target: { value: '150000' } });

    await waitFor(() => expect(allocationInput(12)).toHaveValue('150.000,00'));
  });

  test('registra el pago con lo aplicado a cada compra, corregido a mano', async () => {
    axios.post.mockResolvedValue({ data: { id: 31 } });
    renderForm();
    await chooseSupplier();
    await fillCashPayment('500000');
    await waitFor(() => expect(buyCheckbox(12)).toBeInTheDocument());
    fireEvent.click(buyCheckbox(12));
    fireEvent.click(buyCheckbox(13));
    await waitFor(() => expect(allocationInput(13)).toHaveValue('300.000,00'));

    fireEvent.change(allocationInput(13), { target: { value: '100000' } });
    fireEvent.click(confirmButton());

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(axios.post.mock.calls[0][1].compras).toEqual([
      { compra: 12, importe: '200000.00' },
      { compra: 13, importe: '100000.00' },
    ]);
  });

  test('una compra que no recibe nada no se manda', async () => {
    axios.post.mockResolvedValue({ data: { id: 32 } });
    renderForm();
    await chooseSupplier();
    await fillCashPayment('100000');
    await waitFor(() => expect(buyCheckbox(12)).toBeInTheDocument());
    fireEvent.click(buyCheckbox(12));
    fireEvent.click(buyCheckbox(13));

    // El aviso va en el ícono junto al importe (tooltip), no como texto debajo del campo.
    expect(await screen.findByLabelText('El importe del pago no alcanza para esta compra.')).toBeInTheDocument();
    fireEvent.click(confirmButton());

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(axios.post.mock.calls[0][1].compras).toEqual([{ compra: 12, importe: '100000.00' }]);
  });

  test('no deja aplicarle a una compra más que su saldo', async () => {
    renderForm();
    await chooseSupplier();
    await fillCashPayment('500000');
    await waitFor(() => expect(buyCheckbox(12)).toBeInTheDocument());
    fireEvent.click(buyCheckbox(12));

    fireEvent.change(allocationInput(12), { target: { value: '250000' } });
    fireEvent.click(confirmButton());

    expect(await screen.findByText('Supera el saldo de la compra.')).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('no deja aplicar a las compras más que el importe del pago', async () => {
    renderForm();
    await chooseSupplier();
    await fillCashPayment('100000');
    await waitFor(() => expect(buyCheckbox(13)).toBeInTheDocument());
    fireEvent.click(buyCheckbox(13));

    fireEvent.change(allocationInput(13), { target: { value: '150000' } });
    fireEvent.click(confirmButton());

    expect(await screen.findByText('Lo aplicado a las compras supera el importe del pago.')).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('un error del backend se muestra en un toast con los importes formateados', async () => {
    axios.post.mockRejectedValue({ response: { data: { detail: 'Lo aplicado a la compra N° 00000012 (200000.00) supera su saldo pendiente (150000.00).' } } });
    renderForm();
    await chooseSupplier();
    await fillCashPayment('200000');
    await waitFor(() => expect(buyCheckbox(12)).toBeInTheDocument());
    fireEvent.click(buyCheckbox(12));

    fireEvent.click(confirmButton());

    expect(await screen.findByText(/supera su saldo pendiente \(\$150\.000,00\)/)).toBeInTheDocument();
  });
});

describe('pago con varios cheques', () => {
  const choosePaymentType = async (name) => {
    await screen.findByRole('option', { name });
    fireEvent.change(field('payment-type'), { target: { value: String({ Efectivo: 1, Cheque: 2, 'Cheque Propio': 3 }[name]) } });
    await waitFor(() => expect(tour('payment-check')).not.toBeNull());
  };
  const checkSelects = () => tour('payment-check').querySelectorAll('select');

  test('cheques propios: como los de clientes, se mandan sus ids, se usan enteros y el pago es la suma', async () => {
    axios.post.mockResolvedValue({ data: { id: 40 } });
    renderForm();
    await chooseSupplier();
    await choosePaymentType('Cheque Propio');
    await screen.findByRole('option', { name: /Nro. 884/ });

    fireEvent.change(checkSelects()[0], { target: { value: '884' } });
    fireEvent.click(screen.getByRole('button', { name: /Agregar cheque/ }));
    await waitFor(() => expect(checkSelects()).toHaveLength(2));
    // El cheque ya elegido no se ofrece en la segunda tarjeta.
    expect([...checkSelects()[1].options].map((option) => option.value)).toEqual(['', '885']);
    fireEvent.change(checkSelects()[1], { target: { value: '885' } });
    // No hay importe a escribir: cada cheque se usa entero.
    expect(document.querySelector('input[name^="check-amount-"]')).toBeNull();

    fireEvent.click(confirmButton());

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const payload = axios.post.mock.calls[0][1];
    expect(payload.own_check_ids).toEqual(['884', '885']);
    expect(payload).not.toHaveProperty('importe_abonado');
    expect(payload).not.toHaveProperty('cheque_ids');
  });

  test('cheques de clientes: se mandan sus ids, no se escribe el importe y su suma se reparte entre las compras', async () => {
    axios.post.mockResolvedValue({ data: { id: 41 } });
    renderForm();
    await chooseSupplier();
    await choosePaymentType('Cheque');

    expect(tour('payment-amount')).toBeNull();
    expect(document.querySelector('input[name^="check-amount-"]')).toBeNull();
    fireEvent.change(checkSelects()[0], { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: /Agregar cheque/ }));
    await waitFor(() => expect(checkSelects()).toHaveLength(2));
    fireEvent.change(checkSelects()[1], { target: { value: '51' } });
    // Un cheque de $500.000 en total que cubre las dos compras.
    fireEvent.click(buyCheckbox(12));
    fireEvent.click(buyCheckbox(13));

    fireEvent.click(confirmButton());

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const payload = axios.post.mock.calls[0][1];
    expect(payload.cheque_ids).toEqual(['50', '51']);
    expect(payload.compras).toEqual([
      { compra: 12, importe: '200000.00' },
      { compra: 13, importe: '300000.00' },
    ]);
  });

  test('"Registrar pago" se habilita recién con los cheques elegidos', async () => {
    renderForm();
    await chooseSupplier();
    await choosePaymentType('Cheque Propio');
    await screen.findByRole('option', { name: /Nro. 884/ });
    expect(confirmButton()).toBeDisabled();

    fireEvent.change(checkSelects()[0], { target: { value: '884' } });
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());

    fireEvent.click(screen.getByRole('button', { name: /Agregar cheque/ }));
    await waitFor(() => expect(confirmButton()).toBeDisabled());
  });
});
