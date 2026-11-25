import React from 'react';
import { render, screen } from '@testing-library/react';
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
