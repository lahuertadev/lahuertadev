import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import OwnCheckList from '.';
import { ToastProvider } from '../../../context/ToastContext';
import { ownCheckUrl } from '../../../constants/urls';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock('../../../components/DatePicker', () => ({ label }) => <span>{label}</span>);

const PAYMENT = { id: 2, fecha_pago: '2026-10-28', importe_abonado: '1000.00' };
const check = (id, estado, extra = {}) => ({
  id, numero: 880 + id, importe: '1000.00', banco: { descripcion: 'Galicia' }, estado,
  fecha_emision: '2026-10-01', fecha_deposito: null, fecha_vencimiento: '2027-01-01', supplier_name: 'Ricardo',
  payments: [PAYMENT], ...extra,
});

beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn(), addListener: jest.fn(), removeListener: jest.fn() });
});

beforeEach(() => {
  axios.get.mockResolvedValue({ data: [
    check(1, 'EMITIDO'),
    check(2, 'EMITIDO', { payments: [] }),
    check(3, 'COBRADO'),
    check(4, 'ANULADO'),
  ] });
  axios.post.mockResolvedValue({ data: {} });
});
afterEach(() => jest.clearAllMocks());

const renderList = () => render(<ToastProvider><MemoryRouter><OwnCheckList /></MemoryRouter></ToastProvider>);
const actionsCell = (id) => document.querySelector(`[data-id="${id}"] [data-field="actions"]`);
const button = (id, name) => actionsCell(id).querySelector(`button[aria-label="${name}"]`);

test('todas las filas tienen los mismos íconos: Detalle, Cobrar, Rechazar, Anular y Editar', async () => {
  renderList();
  await screen.findByText('881');

  [1, 2, 3, 4].forEach((id) => expect(actionsCell(id).querySelectorAll('button')).toHaveLength(5));
});

test('cada acción se habilita según el estado y los pagos del cheque', async () => {
  renderList();
  await screen.findByText('881');

  // Emitido con pagos: Cobrar, Rechazar y Anular.
  ['Cobrar', 'Rechazado por el banco', 'Anular'].forEach((name) => expect(button(1, name)).not.toBeNull());
  // Emitido sin pagos: solo Anular.
  expect(button(2, 'Anular')).not.toBeNull();
  expect(button(2, 'Cobrar')).toBeNull();
  expect(button(2, 'Rechazado por el banco')).toBeNull();
  // Cobrado: solo Rechazar.
  expect(button(3, 'Rechazado por el banco')).not.toBeNull();
  expect(button(3, 'Anular')).toBeNull();
  // Anulado: ninguna (Detalle sigue habilitado).
  expect(actionsCell(4).querySelectorAll('button:disabled')).toHaveLength(4);
});

test('cobrar llama al backend sin pedir confirmación', async () => {
  renderList();
  await screen.findByText('881');

  fireEvent.click(button(1, 'Cobrar'));

  await waitFor(() => expect(axios.post).toHaveBeenCalledWith(`${ownCheckUrl}1/cash/`));
  expect(await screen.findByText('El cheque se marcó como cobrado.')).toBeInTheDocument();
});

test('anular pide confirmación explicando qué pasa con los pagos', async () => {
  renderList();
  await screen.findByText('881');

  fireEvent.click(button(1, 'Anular'));
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByText('Cada pago pierde lo que se pagó con este cheque.')).toBeInTheDocument();
  expect(axios.post).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button', { name: /^Anular$/ }));

  await waitFor(() => expect(axios.post).toHaveBeenCalledWith(`${ownCheckUrl}1/cancel/`));
  expect(await screen.findByText('El cheque se anuló correctamente.')).toBeInTheDocument();
});

describe('Cobrar se destaca cuando ya llegó la fecha de depósito', () => {
  const localDate = (offsetDays) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  test('emitido con pagos y fecha de hoy o vencida se destaca; con fecha de mañana, sin fecha o sin pagos no', async () => {
    axios.get.mockResolvedValue({ data: [
      check(1, 'EMITIDO', { fecha_deposito: localDate(0) }),
      check(2, 'EMITIDO', { fecha_deposito: '2020-01-01' }),
      check(3, 'EMITIDO', { fecha_deposito: localDate(1) }),
      check(4, 'EMITIDO'),
      check(5, 'EMITIDO', { fecha_deposito: '2020-01-01', payments: [] }),
    ] });
    renderList();
    await screen.findByText('881');

    const cash = (id) => actionsCell(id).querySelector('button[aria-label^="Cobrar"]');
    [1, 2].forEach((id) => {
      expect(cash(id)).toHaveClass('action-attention', 'action-attention-success');
      expect(cash(id)).toHaveAttribute('aria-label', 'Cobrar: la fecha de depósito ya llegó');
    });
    // Mañana: todavía no se puede cobrar (la fecha se compara en hora local, no en UTC).
    expect(cash(3)).toBeNull();
    expect(button(4, 'Cobrar')).not.toHaveClass('action-attention');
    expect(cash(5)).toBeNull();
  });
});
