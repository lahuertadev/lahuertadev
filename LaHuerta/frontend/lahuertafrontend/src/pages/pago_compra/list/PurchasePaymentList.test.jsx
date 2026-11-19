import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import PurchasePaymentList from '.';
import { ToastProvider } from '../../../context/ToastContext';
import { paymentTypeUrl, purchasePaymentUrl } from '../../../constants/urls';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn(), delete: jest.fn() }));
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
  await waitFor(() => expect(axios.get).toHaveBeenCalledWith(`${purchasePaymentUrl}?estado=VIGENTE`));
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

  // La solapa activa (Vigentes) va junto con el filtro.
  await waitFor(() => expect(axios.get).toHaveBeenCalledWith(`${purchasePaymentUrl}?supplier=21&estado=VIGENTE`));
});

test('anular un pago con cheques explica qué pasa con ellos', async () => {
  axios.get.mockImplementation((url) => Promise.resolve({ data: url === paymentTypeUrl ? [] : [{
    id: 9,
    proveedor: { id: 3, nombre: 'Migogus', puesto: 20 },
    compras: [],
    importe_abonado: '600000.00',
    tipo_pago: { id: 2, descripcion: 'Cheque' },
    fecha_pago: '2026-11-07',
    cheques: [{ id: 13, numero: 70000203, banco: 'Banco Superville', importe: '250000.00', estado: 'ENDOSADO' }],
    cheques_propios: [],
  }] }));
  render(<ToastProvider><MemoryRouter><PurchasePaymentList /></MemoryRouter></ToastProvider>);

  await waitFor(() => expect(document.querySelector('[data-tour="grid-delete"]')).not.toBeNull());
  fireEvent.click(document.querySelector('[data-tour="grid-delete"]'));

  expect(await screen.findByText(/Vas a anular el pago de/)).toHaveTextContent(/a Migogus\./);
  expect(screen.getByText('Los cheques de clientes vuelven a estar en cartera.')).toBeInTheDocument();
});


test('confirmar la anulación manda POST a cancel/ y no un DELETE', async () => {
  axios.get.mockImplementation((url) => Promise.resolve({ data: url === paymentTypeUrl ? [] : [{
    id: 9,
    proveedor: { id: 3, nombre: 'Migogus', puesto: 20 },
    compras: [],
    importe_abonado: '600000.00',
    tipo_pago: { id: 1, descripcion: 'Efectivo' },
    fecha_pago: '2026-11-07',
    cheques: [],
    cheques_propios: [],
  }] }));
  axios.post.mockResolvedValue({ data: {} });
  render(<ToastProvider><MemoryRouter><PurchasePaymentList /></MemoryRouter></ToastProvider>);

  await waitFor(() => expect(document.querySelector('[data-tour="grid-delete"]')).not.toBeNull());
  fireEvent.click(document.querySelector('[data-tour="grid-delete"]'));
  // El botón de confirmar del diálogo dice "Anular", como la acción de la grilla.
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /^Anular$/ }));

  await waitFor(() => expect(axios.post).toHaveBeenCalledWith(`${purchasePaymentUrl}9/cancel/`));
  expect(axios.delete).not.toHaveBeenCalled();
});

const listWith = (payments) => {
  axios.get.mockImplementation((url) => Promise.resolve({ data: url === paymentTypeUrl ? [] : payments }));
  render(<ToastProvider><MemoryRouter><PurchasePaymentList /></MemoryRouter></ToastProvider>);
};

const payment = (id, compras) => ({
  id,
  proveedor: { id: 3, nombre: 'Migogus', puesto: 20 },
  compras,
  importe_abonado: '1000.00',
  tipo_pago: { id: 1, descripcion: 'Efectivo' },
  fecha_pago: '2026-11-07',
  cheques: [],
  cheques_propios: [],
});

test('la columna Concepto muestra cuántas compras cubre el pago o "A cuenta", sin los números', async () => {
  listWith([
    payment(1, [{ id: 12, fecha: '2026-10-01', importe: '1000.00', importe_aplicado: '1000.00' }]),
    payment(2, [
      { id: 13, fecha: '2026-10-02', importe: '500.00', importe_aplicado: '500.00' },
      { id: 14, fecha: '2026-10-03', importe: '500.00', importe_aplicado: '500.00' },
    ]),
    payment(3, []),
  ]);

  expect(await screen.findByText('1 compra')).toBeInTheDocument();
  expect(screen.getByText('2 compras')).toBeInTheDocument();
  expect(screen.queryByText(/N° 00000012/)).toBeNull();
  expect(screen.getAllByText('A cuenta').length).toBeGreaterThan(0);
});

test('anular un pago de compras avisa que las compras vuelven a su estado anterior', async () => {
  listWith([payment(1, [{ id: 12, fecha: '2026-10-01', importe: '1000.00', importe_aplicado: '1000.00' }])]);

  await waitFor(() => expect(document.querySelector('[data-tour="grid-delete"]')).not.toBeNull());
  fireEvent.click(document.querySelector('[data-tour="grid-delete"]'));

  expect(await screen.findByText('Las compras que cubre el pago dejan de contarlo y vuelven a su estado anterior.')).toBeInTheDocument();
});

test('un pago anulado se ve con el importe tachado, sin etiqueta (lo dice la solapa), y no deja editar ni anular', async () => {
  listWith([{ ...payment(1, []), estado_pago: 'ANULADO' }]);

  expect(await screen.findByText('$1.000,00')).toHaveClass('line-through');
  expect(screen.queryByText('Pago anulado')).toBeNull();
  expect(document.querySelector('[data-tour="grid-delete"]')).toBeNull();
  expect(document.querySelector('[data-tour="grid-edit"]')).toBeNull();
});

test('entra en la solapa Vigentes y pide solo los pagos vigentes', async () => {
  listWith([]);

  expect(await screen.findByRole('tab', { name: 'Vigentes' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: 'Anulados' })).toHaveAttribute('aria-selected', 'false');
  await waitFor(() => expect(axios.get).toHaveBeenCalledWith(`${purchasePaymentUrl}?estado=VIGENTE`));
});

test('la solapa Anulados pide los pagos anulados', async () => {
  listWith([]);
  fireEvent.click(await screen.findByRole('tab', { name: 'Anulados' }));

  await waitFor(() => expect(axios.get).toHaveBeenCalledWith(`${purchasePaymentUrl}?estado=ANULADO`));
  expect(screen.getByRole('tab', { name: 'Anulados' })).toHaveAttribute('aria-selected', 'true');
});

test('el estado ya no está entre los filtros del panel', async () => {
  await openFilters();

  expect(screen.queryByText('Estado')).toBeNull();
});
