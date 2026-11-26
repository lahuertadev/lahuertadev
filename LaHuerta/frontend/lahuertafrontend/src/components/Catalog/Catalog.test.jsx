import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Catalog, { descriptionField } from '.';
import { MEASUREMENT_TYPE_OPTIONS } from '../../constants/unitTypes';
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
        <Catalog url={URL} title="Mercados" itemLabel="mercado" newLabel="Nuevo mercado" fields={[descriptionField({ maxLength: 50 })]} />
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

test('el error del backend al guardar va en un toast y la tarjeta queda abierta', async () => {
  axios.post.mockRejectedValue({ response: { data: { descripcion: ['Ya existe un mercado con esa descripción.'] } } });
  await renderCatalog();

  fireEvent.click(screen.getByRole('button', { name: /Nuevo mercado/ }));
  fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Central' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

  expect(await screen.findByText('Ya existe un mercado con esa descripción.')).toBeInTheDocument();
  expect(screen.getByLabelText('Descripción')).toHaveValue('Central');
});

test('el error del backend al eliminar va en un toast', async () => {
  axios.delete.mockRejectedValue({ response: { data: { error: 'El tipo de unidad seleccionado tiene productos asociados' } } });
  await renderCatalog();

  fireEvent.click(screen.getByRole('button', { name: 'Eliminar Avellaneda' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Eliminar mercado' }));

  expect(await screen.findByText('El tipo de unidad seleccionado tiene productos asociados')).toBeInTheDocument();
});

test('elimina después de confirmar', async () => {
  axios.delete.mockResolvedValue({});
  await renderCatalog();

  fireEvent.click(screen.getByRole('button', { name: 'Eliminar Avellaneda' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Eliminar mercado' }));

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

test('no guarda una descripción más larga que el máximo', async () => {
  await renderCatalog();

  fireEvent.click(screen.getByRole('button', { name: /Nuevo mercado/ }));
  fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'x'.repeat(51) } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

  expect(await screen.findByText('Máximo 50 caracteres.')).toBeInTheDocument();
  expect(axios.post).not.toHaveBeenCalled();
});

// ---------- Catálogo con varios campos (Tipos de unidad) ----------
const UNIT_TYPE_URL = '/api/unit_type/';
const UNIT_TYPES = [
  { id: 1, descripcion: 'Kilogramo', abreviacion: 'kg', tipo_medicion: 'PESO', is_system: true },
  { id: 2, descripcion: 'Cajón', abreviacion: 'caj', tipo_medicion: 'CANTIDAD', is_system: false },
];
const UNIT_TYPE_FIELDS = [
  descriptionField({ maxLength: 20 }),
  { name: 'abreviacion', label: 'Abreviatura', maxLength: 5, requiredMessage: 'Escribí la abreviatura.' },
  { name: 'tipo_medicion', label: 'Medición', type: 'select', options: MEASUREMENT_TYPE_OPTIONS },
];

const renderUnitTypes = async () => {
  axios.get.mockResolvedValue({ data: UNIT_TYPES });
  render(
    <ToastProvider>
      <MemoryRouter>
        <Catalog
          url={UNIT_TYPE_URL}
          title="Tipos de unidad"
          itemLabel="tipo de unidad"
          newLabel="Nuevo tipo de unidad"
          fields={UNIT_TYPE_FIELDS}
          deleteEffects={['Deja de aparecer para elegir en el formulario de productos.']}
          deleteNote="No se puede eliminar si algún producto tiene el tipo de unidad."
        />
      </MemoryRouter>
    </ToastProvider>,
  );
  await screen.findByText('Cajón');
};

test('la tarjeta muestra la abreviatura y la medición, y el registro del sistema tiene el candado', async () => {
  await renderUnitTypes();

  const [box, kilo] = screen.getAllByRole('article');
  expect(box).toHaveTextContent('Abreviatura: caj');
  expect(box).toHaveTextContent('Cantidad');
  expect(kilo).toHaveTextContent('Peso');
  expect(screen.getByRole('img', { name: /Registro del sistema/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Editar Kilogramo' })).toBeNull();
});

test('agrega con todos los campos; la medición arranca en la primera opción', async () => {
  axios.post.mockResolvedValue({ data: { id: 3 } });
  await renderUnitTypes();

  fireEvent.click(screen.getByRole('button', { name: /Nuevo tipo de unidad/ }));
  fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: ' Bolsa ' } });
  fireEvent.change(screen.getByLabelText('Abreviatura'), { target: { value: 'bol' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

  await waitFor(() => expect(axios.post).toHaveBeenCalledWith(UNIT_TYPE_URL, { descripcion: 'Bolsa', abreviacion: 'bol', tipo_medicion: 'CANTIDAD' }));
  expect(await screen.findByText('"Bolsa" se agregó correctamente.')).toBeInTheDocument();
});

test('valida cada campo obligatorio por separado', async () => {
  await renderUnitTypes();

  fireEvent.click(screen.getByRole('button', { name: /Nuevo tipo de unidad/ }));
  fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Bolsa' } });
  fireEvent.change(screen.getByLabelText('Abreviatura'), { target: { value: 'bolsas' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

  expect(await screen.findByText('Máximo 5 caracteres.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Abreviatura'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  expect(await screen.findByText('Escribí la abreviatura.')).toBeInTheDocument();
  expect(axios.post).not.toHaveBeenCalled();
});

test('edita en la tarjeta con los valores cargados y manda todos los campos', async () => {
  axios.put.mockResolvedValue({ data: {} });
  await renderUnitTypes();

  fireEvent.click(screen.getByRole('button', { name: 'Editar Cajón' }));
  expect(screen.getByLabelText('Abreviatura')).toHaveValue('caj');
  fireEvent.change(screen.getByLabelText('Medición'), { target: { value: 'PESO' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

  await waitFor(() => expect(axios.put).toHaveBeenCalledWith(`${UNIT_TYPE_URL}2/`, { descripcion: 'Cajón', abreviacion: 'caj', tipo_medicion: 'PESO' }));
});

test('el error del backend al editar va en un toast', async () => {
  axios.put.mockRejectedValue({ response: { data: { error: 'No se puede cambiar el tipo de medición: el tipo de unidad tiene productos asociados.' } } });
  await renderUnitTypes();

  fireEvent.click(screen.getByRole('button', { name: 'Editar Cajón' }));
  fireEvent.change(screen.getByLabelText('Medición'), { target: { value: 'PESO' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

  expect(await screen.findByText(/tiene productos asociados/)).toBeInTheDocument();
});

test('el buscador también busca por abreviatura', async () => {
  await renderUnitTypes();

  fireEvent.change(screen.getByLabelText('Buscar tipos de unidad'), { target: { value: 'kg' } });

  expect(screen.getAllByRole('article')).toHaveLength(1);
  expect(screen.getByRole('article')).toHaveTextContent('Kilogramo');
});

test('el diálogo de eliminar dice qué pasa y cuándo no se puede', async () => {
  await renderUnitTypes();

  fireEvent.click(screen.getByRole('button', { name: 'Eliminar Cajón' }));

  const dialog = await screen.findByRole('dialog');
  expect(dialog).toHaveTextContent('Se elimina Cajón. No se puede deshacer.');
  expect(dialog).toHaveTextContent('Deja de aparecer para elegir en el formulario de productos.');
  expect(dialog).toHaveTextContent('No se puede eliminar si algún producto tiene el tipo de unidad.');
  expect(screen.getByRole('button', { name: 'Eliminar tipo de unidad' })).toBeInTheDocument();
});
