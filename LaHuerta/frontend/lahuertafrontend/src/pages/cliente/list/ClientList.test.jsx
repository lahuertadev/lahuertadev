import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import ClientsList from '.';
import { ToastProvider } from '../../../context/ToastContext';

jest.mock('axios', () => ({ get: jest.fn(), delete: jest.fn() }));

const CLIENT = {
  id: 3, cuit: '27331162908', razon_social: 'Kona', cuenta_corriente: '1065000.00', domicilio: 'Calle 1',
  localidad: { nombre: 'Ciudadela', municipio: { nombre: 'Tres de Febrero' } }, condicion_IVA: { descripcion: 'Monotributo' },
  contactos: [], fecha_inicio_ventas: '2026-01-01', nombre_fantasia: '', estado: true,
};

beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn(), addListener: jest.fn(), removeListener: jest.fn() });
});

beforeEach(() => axios.get.mockResolvedValue({ data: [CLIENT] }));

test('Detalle, Editar y Eliminar van juntos en la columna "Acción"', async () => {
  render(<ToastProvider><MemoryRouter><ClientsList /></MemoryRouter></ToastProvider>);
  await screen.findByText('Kona');

  expect(screen.getByText('Acción')).toBeInTheDocument();
  const cell = document.querySelector('[data-id="3"] [data-field="actions"]');
  ['grid-detail', 'grid-edit', 'grid-delete'].forEach((tour) => expect(cell.querySelector(`[data-tour="${tour}"]`)).not.toBeNull());
});

test('muestra el nombre de fantasía en lugar de la razón social, y la razón social si no tiene', async () => {
  axios.get.mockResolvedValue({ data: [
    { ...CLIENT, razon_social: 'Kona S.R.L.', nombre_fantasia: 'Kona' },
    { ...CLIENT, id: 4, razon_social: 'Clöe S.A.', nombre_fantasia: '' },
  ] });
  render(<ToastProvider><MemoryRouter><ClientsList /></MemoryRouter></ToastProvider>);

  expect(await screen.findByText('Nombre de fantasía')).toBeInTheDocument();
  expect(screen.getByText('Kona')).toBeInTheDocument();
  expect(screen.queryByText('Kona S.R.L.')).not.toBeInTheDocument();
  expect(screen.getByText('Clöe S.A.')).toBeInTheDocument();
});

test('un nombre de más de 28 caracteres se corta con "…"', async () => {
  axios.get.mockResolvedValue({ data: [{ ...CLIENT, nombre_fantasia: 'Distribuidora de Frutas y Verduras del Oeste' }] });
  render(<ToastProvider><MemoryRouter><ClientsList /></MemoryRouter></ToastProvider>);

  expect(await screen.findByText('Distribuidora de Frutas y Ve…')).toBeInTheDocument();
});

test('entra en la solapa Activos y la de Inactivos pide los inactivos', async () => {
  render(<ToastProvider><MemoryRouter><ClientsList /></MemoryRouter></ToastProvider>);
  await screen.findByText('Kona');

  expect(screen.getByRole('tab', { name: 'Activos' })).toHaveAttribute('aria-selected', 'true');
  expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('state=ACTIVO'));

  fireEvent.click(screen.getByRole('tab', { name: 'Inactivos' }));
  await waitFor(() => expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('state=INACTIVO')));
});
