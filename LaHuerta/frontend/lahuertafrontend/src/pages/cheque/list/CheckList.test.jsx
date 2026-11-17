import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import CheckList from '.';
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
