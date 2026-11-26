import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import BillList from '.';
import { ToastProvider } from '../../../context/ToastContext';
import { billTypeUrl } from '../../../constants/urls';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn(), delete: jest.fn() }));
jest.mock('../../../components/DatePicker', () => ({ label }) => <span>{label}</span>);

const BILL = {
  id: 5, fecha: '2026-11-23', total: '1000000.00', numero_comprobante: 3, cae: null,
  cliente: { razon_social: 'Kona' }, tipo_factura: { descripcion: 'Factura A', abreviatura: 'A', codigo_afip: 1 },
};
const DELIVERY_NOTE = {
  id: 6, fecha: '2026-11-23', total: '544000.00', numero_comprobante: 4, cae: null,
  cliente: { razon_social: 'Clöe' }, tipo_factura: { descripcion: 'Remito', abreviatura: 'R', codigo_afip: null },
};

const renderList = async () => {
  render(<ToastProvider><MemoryRouter><BillList /></MemoryRouter></ToastProvider>);
  await screen.findByText('Kona');
};

beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn(), addListener: jest.fn(), removeListener: jest.fn() });
});

beforeEach(() => axios.get.mockImplementation((url) => Promise.resolve({ data: url === billTypeUrl ? [] : [BILL, DELIVERY_NOTE] })));
afterEach(() => jest.clearAllMocks());

test('entra en la solapa Facturas y muestra solo las facturas', async () => {
  await renderList();

  expect(screen.getByRole('tab', { name: 'Facturas' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.queryByText('Clöe')).not.toBeInTheDocument();
});

test('la solapa Remitos muestra solo los remitos, con su título y su botón', async () => {
  await renderList();

  fireEvent.click(screen.getByRole('tab', { name: 'Remitos' }));

  await screen.findByText('Clöe');
  expect(screen.queryByText('Kona')).not.toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Remitos' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByText('Listado de Remitos')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Nuevo Remito/ })).toBeInTheDocument();
});

test('las solapas mantienen el data-tour del tutorial de Facturación', async () => {
  await renderList();

  expect(document.querySelector('[data-tour="bill-tabs"]')).toHaveAttribute('role', 'tablist');
});

test('Detalle, Editar y Eliminar van juntos en la columna "Acción"', async () => {
  await renderList();

  expect(screen.getByText('Acción')).toBeInTheDocument();
  const cell = document.querySelector('[data-id="5"] [data-field="actions"]');
  ['grid-detail', 'grid-edit', 'grid-delete'].forEach((tour) => expect(cell.querySelector(`[data-tour="${tour}"]`)).not.toBeNull());
});

test('el botón Nueva Factura lleva el + a la izquierda del texto', async () => {
  await renderList();

  // El contenido del botón va en el último span (el primero es el efecto de luz): el ícono primero.
  const content = screen.getByRole('button', { name: /Nueva Factura/ }).lastElementChild;
  expect(content.firstChild.tagName.toLowerCase()).toBe('svg');
  expect(content.lastChild.textContent).toBe('Nueva Factura');
});
