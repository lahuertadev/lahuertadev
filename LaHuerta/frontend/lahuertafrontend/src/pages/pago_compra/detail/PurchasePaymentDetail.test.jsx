import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import PurchasePaymentDetail from './PurchasePaymentDetail';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
const mockShowToast = jest.fn();
jest.mock('../../../context/ToastContext', () => ({ useToast: () => ({ showToast: mockShowToast }) }));

const ON_ACCOUNT_PAYMENT = {
  id: 9,
  proveedor: { id: 7, nombre: 'Ricardo', puesto: 27 },
  compras: [],
  importe_abonado: '150000.00',
  importe_a_cuenta: '150000.00',
  fecha_pago: '2026-10-29',
  tipo_pago: { id: 1, descripcion: 'Efectivo' },
  cheques: [],
  cheques_propios: [],
};

beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() });
});

const renderDetail = () =>
  render(
    <MemoryRouter initialEntries={['/purchase-payment/detail/9']}>
      <Routes>
        <Route path="/purchase-payment/detail/:id" element={<PurchasePaymentDetail />} />
        <Route path="/purchase-payment/edit/:id" element={<div>Editar pago</div>} />
      </Routes>
    </MemoryRouter>
  );

test('un pago a cuenta muestra el proveedor y "A cuenta" en lugar de las compras', async () => {
  axios.get.mockResolvedValue({ data: ON_ACCOUNT_PAYMENT });
  renderDetail();

  expect(await screen.findByText('A cuenta')).toBeInTheDocument();
  expect(screen.getAllByText('Ricardo').length).toBeGreaterThan(0);
  expect(screen.getByText('27')).toBeInTheDocument();
});

test('al anular pide confirmación nombrando al proveedor y avisando que queda como registro', async () => {
  axios.get.mockResolvedValue({ data: ON_ACCOUNT_PAYMENT });
  renderDetail();
  await screen.findByText('A cuenta');

  fireEvent.click(screen.getByRole('button', { name: /Anular/ }));

  expect(await screen.findByText(/Vas a anular el pago de/)).toHaveTextContent(/a Ricardo\. No se borra: queda como registro/);
});

test('al confirmar la anulación muestra el pago anulado, sin editar ni anular, y el toast de éxito', async () => {
  axios.get.mockResolvedValue({ data: ON_ACCOUNT_PAYMENT });
  axios.post.mockResolvedValue({ data: { ...ON_ACCOUNT_PAYMENT, estado_pago: 'ANULADO', fecha_anulacion: '2026-11-13' } });
  renderDetail();
  await screen.findByText('A cuenta');

  fireEvent.click(screen.getByRole('button', { name: /Anular/ }));
  fireEvent.click(await screen.findByRole('button', { name: /^Anular$/, hidden: false }));

  expect(await screen.findByText(/Pago anulado el 13-11-2026/)).toBeInTheDocument();
  expect(axios.post).toHaveBeenCalledWith(expect.stringMatching(/\/cancel\/$/));
  expect(mockShowToast).toHaveBeenCalledWith('El pago se anuló correctamente.');
  await waitFor(() => expect(screen.queryByRole('button', { name: /Editar pago/ })).toBeNull());
});

test('si la anulación falla muestra el error del backend', async () => {
  axios.get.mockResolvedValue({ data: ON_ACCOUNT_PAYMENT });
  axios.post.mockRejectedValue({ response: { data: { detail: 'No se puede anular el pago: el cheque N° 885 ya se cobró.' } } });
  renderDetail();
  await screen.findByText('A cuenta');

  fireEvent.click(screen.getByRole('button', { name: /Anular/ }));
  fireEvent.click(await screen.findByRole('button', { name: /^Anular$/ }));

  await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith(
    'No se puede anular el pago: el cheque N° 885 ya se cobró.', { variant: 'error' },
  ));
});

test('un pago anulado no ofrece editar ni anular', async () => {
  axios.get.mockResolvedValue({ data: { ...ON_ACCOUNT_PAYMENT, estado_pago: 'ANULADO', fecha_anulacion: '2026-11-13' } });
  renderDetail();

  expect(await screen.findByText(/Pago anulado el 13-11-2026/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Editar pago/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /Anular/ })).toBeNull();
});

test('"Editar" lleva a la edición del pago', async () => {
  axios.get.mockResolvedValue({ data: ON_ACCOUNT_PAYMENT });
  renderDetail();
  await screen.findByText('A cuenta');

  fireEvent.click(screen.getByRole('button', { name: /Editar/ }));

  expect(screen.getByText('Editar pago')).toBeInTheDocument();
});


test('lista cada cheque propio del pago con su importe (se usa entero)', async () => {
  axios.get.mockResolvedValue({ data: {
    ...ON_ACCOUNT_PAYMENT,
    tipo_pago: { id: 3, descripcion: 'Cheque Propio' },
    cheques_propios: [
      { id: 884, numero: 884, banco: 'Galicia', importe: '1000000.00', estado: 'EMITIDO' },
      { id: 885, numero: 885, banco: 'Galicia', importe: '500000.00', estado: 'EMITIDO' },
    ],
  } });
  renderDetail();

  expect(await screen.findByText('Cheques propios (2)')).toBeInTheDocument();
  expect(screen.getByText('884')).toBeInTheDocument();
  expect(screen.getByText('885')).toBeInTheDocument();
  expect(screen.queryByText('Uso parcial')).toBeNull();
});


test('un pago con cheques de clientes se puede anular y el diálogo explica qué pasa con los cheques', async () => {
  axios.get.mockResolvedValue({ data: {
    ...ON_ACCOUNT_PAYMENT,
    tipo_pago: { id: 2, descripcion: 'Cheque' },
    cheques: [
      { id: 11, numero: 70000201, banco: 'Banco Galicia', importe: '150000.00', estado: 'RECHAZADO' },
      { id: 13, numero: 70000203, banco: 'Banco Superville', importe: '250000.00', estado: 'ENDOSADO' },
    ],
  } });
  renderDetail();
  await screen.findByText('Cheques (2)');

  fireEvent.click(screen.getByRole('button', { name: /Anular/ }));

  expect(await screen.findByText('Los cheques de clientes vuelven a estar en cartera.')).toBeInTheDocument();
  expect(screen.getByText(/Los cheques rechazados o anulados siguen así/)).toBeInTheDocument();
});



test('un pago de varias compras lista cada una con lo aplicado y lo que queda a cuenta', async () => {
  axios.get.mockResolvedValue({ data: {
    ...ON_ACCOUNT_PAYMENT,
    compras: [
      { id: 12, fecha: '2026-10-01', importe: '100000.00', importe_aplicado: '100000.00' },
      { id: 13, fecha: '2026-10-05', importe: '80000.00', importe_aplicado: '30000.00' },
    ],
    importe_a_cuenta: '20000.00',
  } });
  renderDetail();

  expect(await screen.findByText('Compras (2)')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'N° 00000012' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'N° 00000013' })).toBeInTheDocument();
  expect(screen.getAllByText('Aplicado en este pago')).toHaveLength(2);
  expect(screen.getByText('Lo que no se aplicó a ninguna compra')).toBeInTheDocument();
  expect(screen.getByText('$20.000,00')).toBeInTheDocument();
});

test('un pago con un cheque rechazado lo avisa', async () => {
  axios.get.mockResolvedValue({ data: {
    ...ON_ACCOUNT_PAYMENT,
    importe_abonado: '0.00',
    tipo_pago: { id: 3, descripcion: 'Cheque Propio' },
    cheques_propios: [
      { id: 884, numero: 884, banco: 'Galicia', importe: '150000.00', estado: 'RECHAZADO' },
    ],
  } });
  renderDetail();

  expect(await screen.findByText(/Un cheque de este pago fue rechazado/)).toBeInTheDocument();
});

test('un pago con un cheque emitido anulado lo avisa y muestra el cheque como registro', async () => {
  axios.get.mockResolvedValue({ data: {
    ...ON_ACCOUNT_PAYMENT,
    importe_abonado: '0.00',
    tipo_pago: { id: 3, descripcion: 'Cheque Propio' },
    cheques_propios: [
      { id: 885, numero: 885, banco: 'Galicia', importe: '150000.00', estado: 'ANULADO' },
    ],
  } });
  renderDetail();

  expect(await screen.findByText(/Un cheque de este pago fue anulado/)).toBeInTheDocument();
});

test('un pago anulado sigue mostrando sus cheques: los liberados como "Liberado" y los rechazados como tales', async () => {
  axios.get.mockResolvedValue({ data: {
    ...ON_ACCOUNT_PAYMENT,
    estado_pago: 'ANULADO',
    fecha_anulacion: '2026-11-13',
    tipo_pago: { id: 2, descripcion: 'Cheque' },
    cheques: [
      { id: 11, numero: 70000201, banco: 'Banco Galicia', importe: '150000.00', estado: 'RECHAZADO' },
      { id: 13, numero: 70000203, banco: 'Banco Superville', importe: '250000.00', estado: 'LIBERADO' },
    ],
  } });
  renderDetail();

  expect(await screen.findByText('Cheques (2)')).toBeInTheDocument();
  expect(screen.getByText('Liberado')).toBeInTheDocument();
  expect(screen.getByText('Rechazado')).toBeInTheDocument();
});
