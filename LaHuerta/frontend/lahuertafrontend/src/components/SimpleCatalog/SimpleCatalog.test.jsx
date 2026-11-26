import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import SimpleCatalog from '.';
import { ToastProvider } from '../../context/ToastContext';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }));

const URL = '/api/market/';
const MARKETS = [
  { id: 1, descripcion: 'Central', is_system: true },
  { id: 2, descripcion: '3 de Febrero', is_system: false },
  { id: 3, descripcion: 'Avellaneda', is_system: false },
];

const renderCatalog = async () => {
  render(
    <ToastProvider>
      <MemoryRouter>
        <SimpleCatalog url={URL} title="Mercados" itemLabel="mercado" newLabel="Nuevo mercado" maxLength={50} />
      </MemoryRouter>
    </ToastProvider>,
  );
  await screen.findByText('Avellaneda');
};

beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn(), addListener: jest.fn(), removeListener: jest.fn() });
});
beforeEach(() => axios.get.mockResolvedValue({ data: MARKETS }));
afterEach(() => jest.clearAllMocks());

test('muestra cada registro como tarjeta, ordenados, con la cantidad en el título', async () => {
  await renderCatalog();

  expect(screen.getByRole('heading', { name: /Mercados/ })).toHaveTextContent('3');
  const names = screen.getAllByRole('article').map((tile) => tile.textContent);
  expect(names[0]).toContain('3 de Febrero');
  expect(names[2]).toContain('Central');
});

test('un registro del sistema tiene el candado y no se puede editar ni eliminar', async () => {
  await renderCatalog();

  expect(screen.getByRole('img', { name: /Registro del sistema/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Editar Central' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Eliminar Central' })).toBeNull();
});

test('agrega desde la tarjeta "Nuevo mercado" y muestra el toast', async () => {
  axios.post.mockResolvedValue({ data: { id: 4 } });
  await renderCatalog();

  fireEvent.click(screen.getByRole('button', { name: /Nuevo mercado/ }));
  fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: '  Mercado Norte ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

  await waitFor(() => expect(axios.post).toHaveBeenCalledWith(URL, { descripcion: 'Mercado Norte' }));
  expect(await screen.findByText('"Mercado Norte" se agregó correctamente.')).toBeInTheDocument();
});

test('no guarda una descripción vacía', async () => {
  await renderCatalog();

  fireEvent.click(screen.getByRole('button', { name: /Nuevo mercado/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

  expect(await screen.findByText('Escribí la descripción.')).toBeInTheDocument();
  expect(axios.post).not.toHaveBeenCalled();
});

test('renombra en la misma tarjeta', async () => {
  axios.put.mockResolvedValue({ data: {} });
  await renderCatalog();

  fireEvent.click(screen.getByRole('button', { name: 'Editar Avellaneda' }));
  fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Avellaneda Sur' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

  await waitFor(() => expect(axios.put).toHaveBeenCalledWith(`${URL}3/`, { descripcion: 'Avellaneda Sur' }));
  expect(await screen.findByText('"Avellaneda Sur" se actualizó correctamente.')).toBeInTheDocument();
});

test('el error del backend al guardar queda en la tarjeta', async () => {
  axios.post.mockRejectedValue({ response: { data: { descripcion: ['Ya existe un mercado con esa descripción.'] } } });
  await renderCatalog();

  fireEvent.click(screen.getByRole('button', { name: /Nuevo mercado/ }));
  fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Central' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

  expect(await screen.findByText('Ya existe un mercado con esa descripción.')).toBeInTheDocument();
});

test('elimina después de confirmar', async () => {
  axios.delete.mockResolvedValue({});
  await renderCatalog();

  fireEvent.click(screen.getByRole('button', { name: 'Eliminar Avellaneda' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));

  await waitFor(() => expect(axios.delete).toHaveBeenCalledWith(`${URL}3/`));
  expect(await screen.findByText('"Avellaneda" se eliminó correctamente.')).toBeInTheDocument();
});

test('el buscador filtra sin distinguir acentos ni mayúsculas', async () => {
  await renderCatalog();

  fireEvent.change(screen.getByLabelText('Buscar mercados'), { target: { value: 'AVELL' } });

  expect(screen.getAllByRole('article')).toHaveLength(1);
  fireEvent.change(screen.getByLabelText('Buscar mercados'), { target: { value: 'xyz' } });
  expect(screen.getByText('No hay mercados que coincidan con "xyz".')).toBeInTheDocument();
});
