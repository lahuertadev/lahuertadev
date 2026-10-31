import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import ClientDetail from './ClientDetail';

jest.mock('axios', () => ({ get: jest.fn(), delete: jest.fn() }));
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useNavigate: () => mockNavigate }));
jest.mock('../../../context/ToastContext', () => ({ useToast: () => ({ showToast: jest.fn() }) }));

// jsdom no implementa matchMedia (lo usan useMediaQuery y SpotlightButton).
beforeAll(() => {
  window.matchMedia = (query) => ({
    matches: false, media: query, addListener: jest.fn(), removeListener: jest.fn(), addEventListener: jest.fn(), removeEventListener: jest.fn(),
  });
});

const client = (overrides = {}) => ({
  id: 7,
  cuit: '20123456789',
  razon_social: 'Cliente Test S.A.',
  localidad: { id: '0642701009', nombre: 'CABA', municipio: { id: '064270', nombre: 'CABA', provincia: { id: '06', nombre: 'Buenos Aires' } } },
  domicilio: 'Mitre 100',
  condicion_IVA: { id: 1, descripcion: 'RI' },
  lista_precios: null,
  telefono: '1122334455',
  fecha_inicio_ventas: '2024-01-01',
  estado: true,
  cuenta_corriente: '0.00',
  localidad_entrega: null,
  domicilio_entrega: null,
  ...overrides,
});

const renderDetail = (data) => {
  axios.get.mockResolvedValue({ data });
  render(
    <MemoryRouter initialEntries={['/client/detail/7']}>
      <Routes>
        <Route path="/client/detail/:id" element={<ClientDetail />} />
      </Routes>
    </MemoryRouter>
  );
};

test('sin dirección de entrega muestra "Igual a la de facturación"', async () => {
  renderDetail(client());

  expect(await screen.findByRole('heading', { level: 3, name: 'Facturación' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: 'Dirección' })).toBeInTheDocument();
  expect(screen.getByText('Igual a la de facturación')).toBeInTheDocument();
});

test('con dirección de entrega muestra su localidad y dirección', async () => {
  renderDetail(client({
    localidad_entrega: { id: '0642701010', nombre: 'Palermo', municipio: { id: '064271', nombre: 'Palermo Municipio', provincia: { id: '06', nombre: 'Buenos Aires' } } },
    domicilio_entrega: 'Thames 500',
  }));

  expect(await screen.findByText('Thames 500')).toBeInTheDocument();
  expect(screen.getByText('Palermo')).toBeInTheDocument();
  expect(screen.getByText('Palermo Municipio')).toBeInTheDocument();
  expect(screen.queryByText('Igual a la de facturación')).toBeNull();
});

test('"Editar cliente" lleva al formulario de edición', async () => {
  renderDetail(client());

  fireEvent.click(await screen.findByRole('button', { name: /Editar cliente/ }));

  expect(mockNavigate).toHaveBeenCalledWith('/client/edit/7');
});

test('en desktop no muestra Eliminar ni Cancelar: se elimina desde el listado y se sale con Volver', async () => {
  renderDetail(client());

  await screen.findByRole('button', { name: /Editar cliente/ });
  expect(screen.queryByRole('button', { name: /Eliminar/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /Cancelar/ })).toBeNull();
});
