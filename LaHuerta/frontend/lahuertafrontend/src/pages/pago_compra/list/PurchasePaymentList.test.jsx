import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import PurchasePaymentList from '.';
import { ToastProvider } from '../../../context/ToastContext';
import { paymentTypeUrl, purchasePaymentUrl } from '../../../constants/urls';

jest.mock('axios', () => ({ get: jest.fn(), delete: jest.fn() }));
jest.mock('../../../components/DatePicker', () => ({ label }) => <span>{label}</span>);

beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn(), addListener: jest.fn(), removeListener: jest.fn() });
});

beforeEach(() => {
  axios.get.mockImplementation((url) =>
    Promise.resolve({ data: url === paymentTypeUrl ? [{ id: 1, descripcion: 'Efectivo' }] : [] })
  );
});

afterEach(() => jest.clearAllMocks());

const openFilters = async () => {
  render(<ToastProvider><MemoryRouter><PurchasePaymentList /></MemoryRouter></ToastProvider>);
  await waitFor(() => expect(axios.get).toHaveBeenCalledWith(purchasePaymentUrl));
  fireEvent.click(screen.getAllByRole('button', { name: /Filtros/ })[0]);
};

test('ofrece los filtros de proveedor, concepto, tipo de pago, importe y fecha', async () => {
  await openFilters();

  ['Proveedor (puesto o nombre)', 'Concepto', 'Tipo de pago', 'Importe mín.', 'Importe máx.', 'Fecha desde', 'Fecha hasta']
    .forEach((label) => expect(screen.getAllByText(label).length).toBeGreaterThan(0));
});

test('busca por puesto mandando el filtro al backend', async () => {
  await openFilters();

  fireEvent.change(document.querySelector('input[name="supplier"]'), { target: { name: 'supplier', value: '21' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar Filtros' }));

  await waitFor(() => expect(axios.get).toHaveBeenCalledWith(`${purchasePaymentUrl}?supplier=21`));
});

test('el tacho de un pago con cheques explica qué pasa con ellos', async () => {
  axios.get.mockImplementation((url) => Promise.resolve({ data: url === paymentTypeUrl ? [] : [{
    id: 9,
    proveedor: { id: 3, nombre: 'Migogus', puesto: 20 },
    compra: null,
    importe_abonado: '600000.00',
    tipo_pago: { id: 2, descripcion: 'Cheque' },
    fecha_pago: '2026-11-07',
    cheques: [{ id: 13, numero: 70000203, banco: 'Banco Superville', importe: '250000.00', estado: 'ENDOSADO' }],
    cheques_propios: [],
  }] }));
  render(<ToastProvider><MemoryRouter><PurchasePaymentList /></MemoryRouter></ToastProvider>);

  await waitFor(() => expect(document.querySelector('[data-tour="grid-delete"]')).not.toBeNull());
  fireEvent.click(document.querySelector('[data-tour="grid-delete"]'));

  expect(await screen.findByText(/eliminar este pago de Migogus/)).toBeInTheDocument();
  expect(screen.getByText('Los cheques de clientes vuelven a estar en cartera.')).toBeInTheDocument();
});
