import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import EmptyMovementDetail from './EmptyMovementDetail';
import { emptyMovementUrl } from '../../../constants/urls';

jest.mock('axios', () => ({ get: jest.fn(), delete: jest.fn() }));
jest.mock('../../../context/ToastContext', () => ({ useToast: () => ({ showToast: jest.fn() }) }));

const MOVEMENT = {
  id: 3,
  fecha: '2026-11-10',
  tipo: 'CARGA',
  nro_comprobante: 'A-12',
  importe: '5000.00',
  proveedor: { id: 7, nombre: 'Ricardo' },
  contenedores: [{ id: 1, tipo_contenedor: { descripcion: 'Cajón' }, cantidad: 10, precio_unitario: '500.00', subtotal: '5000.00' }],
};

// isMobile: useMediaQuery('(max-width:600px)') lee matchMedia.
const setViewport = (mobile) => {
  window.matchMedia = (query) => ({ matches: mobile, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() });
};

beforeEach(() => setViewport(false));
afterEach(() => jest.clearAllMocks());

const renderDetail = () => {
  axios.get.mockResolvedValue({ data: MOVEMENT });
  render(
    <MemoryRouter initialEntries={['/empty-movement/detail/3']}>
      <Routes>
        <Route path="/empty-movement/detail/:id" element={<EmptyMovementDetail />} />
        <Route path="/empty-movement" element={<p>Listado</p>} />
      </Routes>
    </MemoryRouter>
  );
};

const actionButton = (name) => screen.queryByRole('button', { name: new RegExp(`^${name}$`) });

test('en desktop solo muestra Editar abajo y Volver arriba: Eliminar está en el listado', async () => {
  renderDetail();
  await screen.findByText('Datos del movimiento');

  expect(actionButton('Editar')).toBeInTheDocument();
  expect(actionButton('Eliminar')).toBeNull();
  // Volver: arriba (PageHeader) y el de mobile, que en desktop queda oculto por CSS.
  expect(screen.getAllByRole('button', { name: /Volver/ })).toHaveLength(2);
});

test('en mobile se puede eliminar desde el detalle, con confirmación', async () => {
  setViewport(true);
  axios.delete.mockResolvedValue({});
  renderDetail();
  await screen.findByText('Datos del movimiento');

  fireEvent.click(actionButton('Eliminar'));
  expect(screen.getByText(/Se revierte su efecto en la cuenta corriente/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Eliminar movimiento/ }));

  await waitFor(() => expect(axios.delete).toHaveBeenCalledWith(`${emptyMovementUrl}3/`));
  expect(await screen.findByText('Listado')).toBeInTheDocument();
});
