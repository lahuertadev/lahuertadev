import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import BuyList from '.';
import { ToastProvider } from '../../../context/ToastContext';
import { buyUrl } from '../../../constants/urls';

jest.mock('axios', () => ({ get: jest.fn(), delete: jest.fn() }));
jest.mock('../../../components/DatePicker', () => ({ label }) => <span>{label}</span>);

beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn(), addListener: jest.fn(), removeListener: jest.fn() });
});
beforeEach(() => axios.get.mockResolvedValue({ data: [] }));
afterEach(() => jest.clearAllMocks());

test('el filtro Proveedor acepta el nombre o el puesto y lo manda al backend', async () => {
  render(<ToastProvider><MemoryRouter><BuyList /></MemoryRouter></ToastProvider>);
  await screen.findByText('Listado de Compras');

  const input = screen.getByLabelText('Proveedor (puesto o nombre)');
  expect(input).toHaveAttribute('type', 'text');
  fireEvent.change(input, { target: { value: 'Salvita' } });
  expect(input).toHaveValue('Salvita');
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar Filtros' }));

  await waitFor(() => expect(axios.get).toHaveBeenLastCalledWith(`${buyUrl}?supplier=Salvita`));
});

test('los importes del filtro se ven con separador de miles y van sin formato al backend', async () => {
  render(<ToastProvider><MemoryRouter><BuyList /></MemoryRouter></ToastProvider>);
  await screen.findByText('Listado de Compras');

  const minAmount = screen.getByLabelText('Importe mín.');
  fireEvent.change(minAmount, { target: { value: '1500000,5' } });
  expect(minAmount).toHaveValue('1.500.000,5');
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar Filtros' }));

  await waitFor(() => expect(axios.get).toHaveBeenLastCalledWith(`${buyUrl}?importe_min=1500000.5`));
});

test('eliminar desde el listado muestra el mensaje de la compra', async () => {
  axios.get.mockResolvedValue({ data: [{
    id: 62, fecha: '2026-11-01', importe: '300000.00', senia: '0.00', proveedor: { nombre: 'Migogus' },
    payment_status: 'PENDIENTE', outstanding_balance: '300000.00',
  }] });
  render(<ToastProvider><MemoryRouter><BuyList /></MemoryRouter></ToastProvider>);
  await screen.findByText('00000062');

  fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText('Migogus')).toBeInTheDocument();
  expect(within(dialog).getByText(/La deuda con el proveedor baja \$\s?300\.000/)).toBeInTheDocument();
  expect(within(dialog).getByRole('button', { name: 'Eliminar compra' })).toBeInTheDocument();
});

test('entra en Todas (sin filtro) y las solapas Por pagar y Abonadas filtran por estado de pago', async () => {
  render(<ToastProvider><MemoryRouter><BuyList /></MemoryRouter></ToastProvider>);
  await screen.findByText('Listado de Compras');

  expect(screen.getByRole('tab', { name: 'Todas' })).toHaveAttribute('aria-selected', 'true');
  expect(axios.get).toHaveBeenLastCalledWith(buyUrl);

  fireEvent.click(screen.getByRole('tab', { name: 'Por pagar' }));
  await waitFor(() => expect(axios.get).toHaveBeenLastCalledWith(`${buyUrl}?payment_status=por_pagar`));

  fireEvent.click(screen.getByRole('tab', { name: 'Abonadas' }));
  await waitFor(() => expect(axios.get).toHaveBeenLastCalledWith(`${buyUrl}?payment_status=abonadas`));
});
