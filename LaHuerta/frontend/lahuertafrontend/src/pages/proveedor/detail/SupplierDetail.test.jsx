import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import SupplierDetail from './SupplierDetail';

jest.mock('axios', () => ({ get: jest.fn(), delete: jest.fn() }));
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useNavigate: () => mockNavigate }));
const mockShowToast = jest.fn();
jest.mock('../../../context/ToastContext', () => ({ useToast: () => ({ showToast: mockShowToast }) }));

// jsdom no implementa matchMedia. En mobile (max-width:600px) el detalle muestra el botón Eliminar.
beforeAll(() => {
  window.matchMedia = (query) => ({
    matches: query.includes('max-width'), media: query, addListener: jest.fn(), removeListener: jest.fn(), addEventListener: jest.fn(), removeEventListener: jest.fn(),
  });
});

beforeEach(() => {
  jest.clearAllMocks();
});

const supplier = {
  id: 7,
  nombre: 'Frutas Delta',
  nombre_fantasia: null,
  mercado: { id: 1, descripcion: 'Mercado Central' },
  puesto: 45,
  nave: null,
  contactos: [],
  cuenta_corriente: '0.00',
};

const renderDetail = () => {
  axios.get.mockResolvedValue({ data: supplier });
  render(
    <MemoryRouter initialEntries={['/supplier/detail/7']}>
      <Routes>
        <Route path="/supplier/detail/:id" element={<SupplierDetail />} />
      </Routes>
    </MemoryRouter>
  );
};

const openDeleteDialog = async () => {
  fireEvent.click(await screen.findByRole('button', { name: /Eliminar/ }));
};

test('el diálogo de eliminar nombra al proveedor y dice qué se borra con él', async () => {
  renderDetail();
  await openDeleteDialog();

  expect(screen.getByText(/Vas a eliminar al proveedor/)).toHaveTextContent('Vas a eliminar al proveedor Frutas Delta (Puesto 45). No se puede deshacer.');
  expect(screen.getByText('Se eliminan sus compras y los pagos que le hiciste.')).toBeInTheDocument();
});

test('al eliminar muestra el toast de éxito y vuelve al listado', async () => {
  axios.delete.mockResolvedValue({});
  renderDetail();
  await openDeleteDialog();

  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/supplier'));
  expect(axios.delete).toHaveBeenCalledWith(expect.stringMatching(/7\/$/));
  expect(mockShowToast).toHaveBeenCalledWith('El proveedor se eliminó correctamente.');
});

test('si falla la eliminación muestra el error del backend y se queda en el detalle', async () => {
  axios.delete.mockRejectedValue({ response: { data: { detail: 'Error al eliminar el proveedor.' } } });
  renderDetail();
  await openDeleteDialog();

  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

  await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Error al eliminar el proveedor.', { variant: 'error' }));
  expect(mockNavigate).not.toHaveBeenCalledWith('/supplier');
});
