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
