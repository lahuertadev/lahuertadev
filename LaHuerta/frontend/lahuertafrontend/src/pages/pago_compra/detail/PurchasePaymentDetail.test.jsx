import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import PurchasePaymentDetail from './PurchasePaymentDetail';

jest.mock('axios', () => ({ get: jest.fn(), delete: jest.fn() }));

const ON_ACCOUNT_PAYMENT = {
  id: 9,
  proveedor: { id: 7, nombre: 'Ricardo', puesto: 27 },
  compra: null,
  importe_abonado: '150000.00',
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

test('un pago a cuenta muestra el proveedor y "A cuenta" en lugar de la compra', async () => {
  axios.get.mockResolvedValue({ data: ON_ACCOUNT_PAYMENT });
  renderDetail();

  expect(await screen.findByText('A cuenta')).toBeInTheDocument();
  expect(screen.getAllByText('Ricardo').length).toBeGreaterThan(0);
  expect(screen.getByText('27')).toBeInTheDocument();
});

test('al eliminar pide confirmación nombrando al proveedor', async () => {
  axios.get.mockResolvedValue({ data: ON_ACCOUNT_PAYMENT });
  renderDetail();
  await screen.findByText('A cuenta');

  fireEvent.click(screen.getByRole('button', { name: /Eliminar/ }));

  expect(await screen.findByText(/eliminar este pago de Ricardo/)).toBeInTheDocument();
});

test('"Editar" lleva a la edición del pago', async () => {
  axios.get.mockResolvedValue({ data: ON_ACCOUNT_PAYMENT });
  renderDetail();
  await screen.findByText('A cuenta');

  fireEvent.click(screen.getByRole('button', { name: /Editar/ }));

  expect(screen.getByText('Editar pago')).toBeInTheDocument();
});


test('lista cada cheque propio del pago con lo que se usó de él', async () => {
  axios.get.mockResolvedValue({ data: {
    ...ON_ACCOUNT_PAYMENT,
    tipo_pago: { id: 3, descripcion: 'Cheque Propio' },
    cheques_propios: [
      { id: 884, numero: 884, banco: 'Galicia', importe: '1000000.00', importe_usado: '700000.00', estado: 'EMITIDO' },
      { id: 885, numero: 885, banco: 'Galicia', importe: '500000.00', importe_usado: '500000.00', estado: 'EMITIDO' },
    ],
  } });
  renderDetail();

  expect(await screen.findByText('Cheques propios (2)')).toBeInTheDocument();
  expect(screen.getByText('884')).toBeInTheDocument();
  expect(screen.getByText('885')).toBeInTheDocument();
  expect(screen.getAllByText('Usado en este pago')).toHaveLength(2);
  // Del 884 se usaron $700.000 de $1.000.000; el 885 se usó entero.
  expect(screen.getAllByText('Uso parcial')).toHaveLength(1);
});


test('un pago con cheques de clientes se puede eliminar y el diálogo explica qué pasa con los cheques', async () => {
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

  fireEvent.click(screen.getByRole('button', { name: /Eliminar/ }));

  expect(await screen.findByText('Los cheques de clientes vuelven a estar en cartera.')).toBeInTheDocument();
  expect(screen.getByText(/Los cheques rechazados siguen rechazados/)).toBeInTheDocument();
});
