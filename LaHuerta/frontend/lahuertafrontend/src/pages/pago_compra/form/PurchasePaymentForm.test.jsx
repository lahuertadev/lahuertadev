import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import PurchasePaymentForm from './PurchasePaymentForm';
import { buyUrl, checkUrl, ownCheckUrl, paymentTypeUrl, purchasePaymentUrl, supplierUrl } from '../../../constants/urls';
import { PURCHASE_PAYMENT_KINDS } from '../../../constants/purchasePaymentTypes';
import { TUTORIAL_EVENT_NAME, TUTORIAL_EVENTS } from '../../../constants/tutorials';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
// El selector de fecha de MUI no aporta a estos tests: un input simple con el mismo contrato.
jest.mock('../../../components/DatePicker', () => ({ value, onChange }) => (
  <input value={value || ''} onChange={(e) => onChange(e.target.value || null)} />
));

const SUPPLIER = { id: 7, nombre: 'Ricardo', puesto: 27, cuenta_corriente: '250000.00' };
const BUY = {
  id: 12, fecha: '2026-10-22', importe: '670000.00', outstanding_balance: '670000.00',
  payment_status: 'PENDIENTE', proveedor: { id: 7, nombre: 'Ricardo' },
};

const OWN_CHECKS = [
  { id: 884, numero: 884, banco: { descripcion: 'Galicia' }, remaining_balance: '1000000.00' },
  { id: 885, numero: 885, banco: { descripcion: 'Galicia' }, remaining_balance: '500000.00' },
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
    if (url === buyUrl) return Promise.resolve({ data: [BUY] });
    if (url === `${buyUrl}${BUY.id}/`) return Promise.resolve({ data: BUY });
    if (url.startsWith(checkUrl)) return Promise.resolve({ data: CLIENT_CHECKS });
    return Promise.resolve({ data: [] });
  });
});

afterEach(() => jest.clearAllMocks());

const renderForm = (kind) =>
  render(
    <MemoryRouter initialEntries={['/purchase-payment/create/x']}>
      <Routes>
        <Route path="/purchase-payment/create/x" element={<PurchasePaymentForm kind={kind} />} />
        <Route path="/purchase-payment" element={<div>Listado</div>} />
      </Routes>
    </MemoryRouter>
  );

const tour = (name) => document.querySelector(`[data-tour="${name}"]`);
const field = (name) => tour(name).querySelector('input, select');
const confirmButton = () => screen.getByRole('button', { name: 'Registrar pago' });

const fillCashPayment = async () => {
  await waitFor(() => expect(tour('payment-type')).not.toBeNull());
  await screen.findByRole('option', { name: 'Efectivo' });
  fireEvent.change(field('payment-type'), { target: { value: '1' } });
  await waitFor(() => expect(tour('payment-amount')).not.toBeNull());
  fireEvent.change(field('payment-amount'), { target: { value: '1000' } });
};

describe('pago a cuenta', () => {
  test('pide el proveedor, no la compra', async () => {
    renderForm(PURCHASE_PAYMENT_KINDS.ON_ACCOUNT);
    await screen.findByRole('option', { name: 'Ricardo — Puesto 27' });

    expect(tour('payment-supplier')).not.toBeNull();
    expect(tour('payment-buy')).toBeNull();
    expect(confirmButton()).toBeDisabled();
  });

  test('al elegir el proveedor muestra su saldo en cuenta corriente', async () => {
    renderForm(PURCHASE_PAYMENT_KINDS.ON_ACCOUNT);
    await screen.findByRole('option', { name: 'Ricardo — Puesto 27' });

    fireEvent.change(field('payment-supplier'), { target: { value: '7' } });

    expect(await screen.findByText('Saldo en cuenta corriente')).toBeInTheDocument();
    expect(tour('payment-date')).not.toBeNull();
  });

  test('registra el pago con el proveedor y sin compra, y avisa al tutorial', async () => {
    const listener = jest.fn();
    window.addEventListener(TUTORIAL_EVENT_NAME, listener);
    axios.post.mockResolvedValue({ data: { id: 30 } });
    renderForm(PURCHASE_PAYMENT_KINDS.ON_ACCOUNT);
    await screen.findByRole('option', { name: 'Ricardo — Puesto 27' });
    fireEvent.change(field('payment-supplier'), { target: { value: '7' } });
    await fillCashPayment();

    fireEvent.click(confirmButton());

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const [url, payload] = axios.post.mock.calls[0];
    expect(url).toBe(purchasePaymentUrl);
    expect(payload).toEqual(expect.objectContaining({ proveedor: 7, tipo_pago: '1', importe_abonado: '1000' }));
    expect(payload).not.toHaveProperty('compra');
    await waitFor(() => expect(listener).toHaveBeenCalled());
    expect(listener.mock.calls[0][0].detail).toEqual({ name: TUTORIAL_EVENTS.purchasePaymentCreated, id: 30 });
    window.removeEventListener(TUTORIAL_EVENT_NAME, listener);
  });
});

test('en efectivo, "Registrar pago" se habilita recién con el importe', async () => {
  renderForm(PURCHASE_PAYMENT_KINDS.ON_ACCOUNT);
  await screen.findByRole('option', { name: 'Ricardo — Puesto 27' });
  fireEvent.change(field('payment-supplier'), { target: { value: '7' } });
  await waitFor(() => expect(tour('payment-type')).not.toBeNull());
  await screen.findByRole('option', { name: 'Efectivo' });
  fireEvent.change(field('payment-type'), { target: { value: '1' } });
  expect(confirmButton()).toBeDisabled();

  fireEvent.change(field('payment-amount'), { target: { value: '1000' } });

  await waitFor(() => expect(confirmButton()).not.toBeDisabled());
});

describe('pago de compras', () => {
  test('pide la compra, no el proveedor', async () => {
    renderForm(PURCHASE_PAYMENT_KINDS.PURCHASE);
    await waitFor(() => expect(tour('payment-buy')).not.toBeNull());

    expect(tour('payment-supplier')).toBeNull();
  });

  test('registra el pago con la compra y su proveedor', async () => {
    axios.post.mockResolvedValue({ data: { id: 31 } });
    renderForm(PURCHASE_PAYMENT_KINDS.PURCHASE);
    await screen.findByRole('option', { name: /^00000012/ });
    fireEvent.change(field('payment-buy'), { target: { value: '12' } });
    await fillCashPayment();

    fireEvent.click(confirmButton());

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(axios.post.mock.calls[0][1]).toEqual(expect.objectContaining({ proveedor: 7, compra: '12' }));
  });
});


describe('pago con varios cheques', () => {
  const choosePaymentType = async (name) => {
    await screen.findByRole('option', { name });
    fireEvent.change(field('payment-type'), { target: { value: String({ Efectivo: 1, Cheque: 2, 'Cheque Propio': 3 }[name]) } });
    await waitFor(() => expect(tour('payment-check')).not.toBeNull());
  };
  const checkSelects = () => tour('payment-check').querySelectorAll('select');

  test('cheques propios: cada uno con su importe, que arranca en el saldo, y el pago es la suma', async () => {
    axios.post.mockResolvedValue({ data: { id: 40 } });
    renderForm(PURCHASE_PAYMENT_KINDS.ON_ACCOUNT);
    await screen.findByRole('option', { name: 'Ricardo — Puesto 27' });
    fireEvent.change(field('payment-supplier'), { target: { value: '7' } });
    await choosePaymentType('Cheque Propio');
    await screen.findByRole('option', { name: /Nro. 884/ });

    fireEvent.change(checkSelects()[0], { target: { value: '884' } });
    fireEvent.click(screen.getByRole('button', { name: /Agregar cheque/ }));
    await waitFor(() => expect(checkSelects()).toHaveLength(2));
    // El cheque ya elegido no se ofrece en la segunda tarjeta.
    expect([...checkSelects()[1].options].map((option) => option.value)).toEqual(['', '885']);
    fireEvent.change(checkSelects()[1], { target: { value: '885' } });
    fireEvent.change(document.querySelector('input[name^="check-amount-"]:not([disabled])'), { target: { value: '700000' } });

    fireEvent.click(confirmButton());

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const payload = axios.post.mock.calls[0][1];
    expect(payload.own_checks).toEqual([
      { id: '884', importe: '700000' },
      { id: '885', importe: '500000.00' },
    ]);
    expect(payload).not.toHaveProperty('importe_abonado');
    expect(payload).not.toHaveProperty('cheque_ids');
  });

  test('cheques de clientes: se mandan sus ids y no se escribe el importe', async () => {
    axios.post.mockResolvedValue({ data: { id: 41 } });
    renderForm(PURCHASE_PAYMENT_KINDS.ON_ACCOUNT);
    await screen.findByRole('option', { name: 'Ricardo — Puesto 27' });
    fireEvent.change(field('payment-supplier'), { target: { value: '7' } });
    await choosePaymentType('Cheque');

    expect(tour('payment-amount')).toBeNull();
    expect(document.querySelector('input[name^="check-amount-"]')).toBeNull();
    fireEvent.change(checkSelects()[0], { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: /Agregar cheque/ }));
    await waitFor(() => expect(checkSelects()).toHaveLength(2));
    fireEvent.change(checkSelects()[1], { target: { value: '51' } });

    fireEvent.click(confirmButton());

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(axios.post.mock.calls[0][1].cheque_ids).toEqual(['50', '51']);
  });

  test('si la suma de los cheques supera el saldo de la compra, lo avisa en un toast', async () => {
    axios.post.mockRejectedValue({ response: { data: { detail: 'El importe abonado (700000.00) supera el saldo pendiente (670000.00).' } } });
    renderForm(PURCHASE_PAYMENT_KINDS.PURCHASE);
    await screen.findByRole('option', { name: /^00000012/ });
    fireEvent.change(field('payment-buy'), { target: { value: '12' } });
    await choosePaymentType('Cheque Propio');
    await screen.findByRole('option', { name: /Nro. 884/ });
    fireEvent.change(checkSelects()[0], { target: { value: '884' } });
    fireEvent.change(document.querySelector('input[name^="check-amount-"]'), { target: { value: '700000' } });

    fireEvent.click(confirmButton());

    expect(await screen.findByText(/La suma de los cheques .* supera el saldo pendiente/)).toBeInTheDocument();
  });

  test('"Registrar pago" se habilita recién con los cheques elegidos', async () => {
    renderForm(PURCHASE_PAYMENT_KINDS.ON_ACCOUNT);
    await screen.findByRole('option', { name: 'Ricardo — Puesto 27' });
    fireEvent.change(field('payment-supplier'), { target: { value: '7' } });
    await choosePaymentType('Cheque Propio');
    await screen.findByRole('option', { name: /Nro. 884/ });
    expect(confirmButton()).toBeDisabled();

    fireEvent.change(checkSelects()[0], { target: { value: '884' } });
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());

    fireEvent.click(screen.getByRole('button', { name: /Agregar cheque/ }));
    await waitFor(() => expect(confirmButton()).toBeDisabled());
  });

  test('un cheque propio por encima de su saldo no deja registrar', async () => {
    renderForm(PURCHASE_PAYMENT_KINDS.ON_ACCOUNT);
    await screen.findByRole('option', { name: 'Ricardo — Puesto 27' });
    fireEvent.change(field('payment-supplier'), { target: { value: '7' } });
    await choosePaymentType('Cheque Propio');
    await screen.findByRole('option', { name: /Nro. 885/ });
    fireEvent.change(checkSelects()[0], { target: { value: '885' } });
    fireEvent.change(document.querySelector('input[name^="check-amount-"]'), { target: { value: '600000' } });

    fireEvent.click(confirmButton());

    expect(await screen.findByText(/Supera el saldo disponible del cheque/)).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });
});
