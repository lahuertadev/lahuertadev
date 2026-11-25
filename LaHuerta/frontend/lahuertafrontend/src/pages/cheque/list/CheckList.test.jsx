import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import CheckList, { isDepositDue } from '.';
import { getTodayDate } from '../../../utils/date';
import { ToastProvider } from '../../../context/ToastContext';
import { checkUrl } from '../../../constants/urls';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock('../../../components/DatePicker', () => ({ label }) => <span>{label}</span>);

const check = (id, state) => ({
  id, numero: 1000 + id, importe: '1000.00', fecha_emision: '2026-11-10', fecha_deposito: null,
  banco: { descripcion: 'Banco Galicia' }, cliente: { razon_social: 'Clöe' }, estado: { descripcion: state }, endosado: false,
});

beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn(), addListener: jest.fn(), removeListener: jest.fn() });
});

beforeEach(() => {
  axios.get.mockResolvedValue({ data: [check(1, 'EN_CARTERA'), check(2, 'DEPOSITADO'), check(3, 'ACREDITADO')] });
  axios.post.mockResolvedValue({ data: {} });
});
afterEach(() => jest.clearAllMocks());

const renderList = () => render(<ToastProvider><MemoryRouter><CheckList /></MemoryRouter></ToastProvider>);
const actionsCell = (id) => document.querySelector(`[data-id="${id}"] [data-field="actions"]`);
const button = (id, name) => actionsCell(id).querySelector(`button[aria-label="${name}"]`);

test('las acciones son íconos en la columna Acción, sin los botones con texto', async () => {
  renderList();
  await screen.findByText('1001');

  expect(screen.getByText('Acción')).toBeInTheDocument();
  expect(screen.queryByText('Depositar')).toBeNull();
  // Las tres filas tienen la misma cantidad de íconos: Detalle, Depositar, Acreditar y Rechazar.
  [1, 2, 3].forEach((id) => expect(actionsCell(id).querySelectorAll('button')).toHaveLength(4));
});

test('cada acción se habilita solo en el estado que corresponde', async () => {
  renderList();
  await screen.findByText('1001');

  // En cartera: solo Depositar.
  expect(button(1, 'Depositar')).toBeEnabled();
  expect(actionsCell(1).querySelectorAll('button:disabled')).toHaveLength(2);
  // Depositado: Acreditar y Rechazar.
  expect(button(2, 'Acreditar')).toBeEnabled();
  expect(button(2, 'Rechazar')).toBeEnabled();
  expect(actionsCell(2).querySelectorAll('button:disabled')).toHaveLength(1);
  // Acreditado: ninguna.
  expect(actionsCell(3).querySelectorAll('button:disabled')).toHaveLength(3);
});

test('depositar llama al endpoint del cheque', async () => {
  renderList();
  await screen.findByText('1001');

  fireEvent.click(button(1, 'Depositar'));

  await waitFor(() => expect(axios.post).toHaveBeenCalledWith(`${checkUrl}1/deposit/`));
});

test.each([
  [1, 'Depositar', 'El cheque se depositó correctamente.'],
  [2, 'Acreditar', 'El cheque se acreditó correctamente.'],
  [2, 'Rechazar', 'Se registró el rechazo del cheque.'],
])('%#: cada acción confirma con un mensaje (%s)', async (id, action, message) => {
  renderList();
  await screen.findByText('1001');

  fireEvent.click(button(id, action));

  expect(await screen.findByText(message)).toBeInTheDocument();
});

test('si la acción falla muestra el error del backend', async () => {
  axios.post.mockRejectedValue({ response: { data: { detail: 'El cheque ya fue rechazado.' } } });
  renderList();
  await screen.findByText('1001');

  fireEvent.click(button(2, 'Rechazar'));

  expect(await screen.findByText('El cheque ya fue rechazado.')).toBeInTheDocument();
});

describe('Depositar titila cuando ya llegó la fecha de depósito', () => {
  const withDeposit = (id, state, date) => ({ ...check(id, state), fecha_deposito: date });

  test('en cartera con la fecha de hoy o vencida titila y lo dice en el tooltip; con fecha futura no', async () => {
    axios.get.mockResolvedValue({ data: [
      withDeposit(1, 'EN_CARTERA', getTodayDate()),
      withDeposit(2, 'EN_CARTERA', '2020-01-01'),
      withDeposit(3, 'EN_CARTERA', '2999-01-01'),
    ] });
    renderList();
    await screen.findByText('1001');

    const deposit = (id) => actionsCell(id).querySelector('button[aria-label^="Depositar"]');
    [1, 2].forEach((id) => {
      expect(deposit(id)).toHaveClass('action-attention');
      expect(deposit(id)).not.toHaveClass('action-attention-success');
      expect(deposit(id)).toHaveAttribute('aria-label', 'Depositar: la fecha de depósito ya llegó');
    });
    expect(deposit(3)).not.toHaveClass('action-attention');
    expect(deposit(3)).toHaveAttribute('aria-label', 'Depositar');
  });

  test('solo cuenta para los cheques en cartera con fecha de depósito', () => {
    expect(isDepositDue({ stateRaw: 'EN_CARTERA', depositDateRaw: '2020-01-01' })).toBe(true);
    expect(isDepositDue({ stateRaw: 'DEPOSITADO', depositDateRaw: '2020-01-01' })).toBe(false);
    expect(isDepositDue({ stateRaw: 'EN_CARTERA', depositDateRaw: null })).toBe(false);
  });
});

describe('Solapas Todos, Pendientes y Rechazados', () => {
  test('entra en Todos y no manda la solapa', async () => {
    renderList();
    await screen.findByText('1001');

    expect(screen.getByRole('tab', { name: 'Todos' })).toHaveAttribute('aria-selected', 'true');
    expect(axios.get).toHaveBeenCalledWith(checkUrl);
  });

  test.each([
    ['Pendientes', 'pendientes'],
    ['Rechazados', 'rechazados'],
  ])('%s pide el listado con solapa=%s', async (label, value) => {
    renderList();
    await screen.findByText('1001');

    fireEvent.click(screen.getByRole('tab', { name: label }));

    await waitFor(() => expect(axios.get).toHaveBeenLastCalledWith(`${checkUrl}?solapa=${value}`));
    expect(screen.getByRole('tab', { name: label })).toHaveAttribute('aria-selected', 'true');
  });

  test('al depositar se recarga en la misma solapa', async () => {
    renderList();
    await screen.findByText('1001');
    fireEvent.click(screen.getByRole('tab', { name: 'Pendientes' }));
    await waitFor(() => expect(axios.get).toHaveBeenLastCalledWith(`${checkUrl}?solapa=pendientes`));
    await screen.findByText('1001');
    axios.get.mockClear();

    fireEvent.click(button(1, 'Depositar'));

    await waitFor(() => expect(axios.get).toHaveBeenCalledWith(`${checkUrl}?solapa=pendientes`));
    expect(screen.getByRole('tab', { name: 'Pendientes' })).toHaveAttribute('aria-selected', 'true');
  });
});
