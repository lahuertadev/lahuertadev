import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import GenericList from '.';
import { ToastProvider } from '../../context/ToastContext';

jest.mock('axios', () => ({ get: jest.fn(), delete: jest.fn() }));
jest.mock('../DatePicker', () => ({ label }) => <span>{label}</span>);

beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn(), addListener: jest.fn(), removeListener: jest.fn() });
});

beforeEach(() => axios.get.mockResolvedValue({ data: [] }));
afterEach(() => jest.clearAllMocks());

const BASE_URL = '/api/items/';

const buildData = (extra = {}) => ({
  title: 'Ítems',
  fetchUrl: { baseUrl: BASE_URL, createUrl: '/items/create', editUrl: '/items/edit' },
  columns: [{ field: 'name', headerName: 'Nombre' }],
  filtersConfig: [{ label: 'Nombre', name: 'name', type: 'text' }],
  newLabelText: 'Nuevo ítem',
  ...extra,
});

const renderList = (data) => render(
  <ToastProvider><MemoryRouter><GenericList data={data} /></MemoryRouter></ToastProvider>,
);

const TABS = {
  param: 'estado',
  options: [
    { label: 'Vigentes', value: 'VIGENTE' },
    { label: 'Anulados', value: 'ANULADO', tone: 'danger' },
  ],
};

test('sin solapas el listado no las muestra y pide la URL sin parámetros', async () => {
  renderList(buildData());

  await waitFor(() => expect(axios.get).toHaveBeenCalledWith(BASE_URL));
  expect(screen.queryByRole('tablist')).toBeNull();
});

test('con solapas muestra la primera activa y la manda como filtro', async () => {
  renderList(buildData({ tabs: TABS }));

  await waitFor(() => expect(axios.get).toHaveBeenCalledWith(`${BASE_URL}?estado=VIGENTE`));
  expect(screen.getByRole('tab', { name: 'Vigentes' })).toHaveAttribute('aria-selected', 'true');
});

test('cambiar de solapa vuelve a pedir el listado con su valor', async () => {
  renderList(buildData({ tabs: TABS }));
  await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

  fireEvent.click(screen.getByRole('tab', { name: 'Anulados' }));

  await waitFor(() => expect(axios.get).toHaveBeenLastCalledWith(`${BASE_URL}?estado=ANULADO`));
  expect(screen.getByRole('tab', { name: 'Anulados' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: 'Vigentes' })).toHaveAttribute('aria-selected', 'false');
});

test('volver a tocar la solapa activa no repite el pedido', async () => {
  renderList(buildData({ tabs: TABS }));
  await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

  fireEvent.click(screen.getByRole('tab', { name: 'Vigentes' }));

  expect(axios.get).toHaveBeenCalledTimes(1);
});

test('la solapa activa va junto con los filtros del panel', async () => {
  renderList(buildData({ tabs: TABS }));
  await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('tab', { name: 'Anulados' }));

  fireEvent.click(screen.getAllByRole('button', { name: /Filtros/ })[0]);
  fireEvent.change(document.querySelector('input[name="name"]'), { target: { name: 'name', value: 'abc' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar Filtros' }));

  await waitFor(() => expect(axios.get).toHaveBeenLastCalledWith(`${BASE_URL}?name=abc&estado=ANULADO`));
});

describe('motivo al borrar (deleteReason)', () => {
  const openDeleteDialog = async (data) => {
    axios.get.mockResolvedValue({ data: [{ id: 7, name: 'Ítem 7' }] });
    renderList(buildData({ mapData: (items) => items, groupActions: true, deleteLabel: 'Anular', ...data }));
    await screen.findByText('Ítem 7');
    fireEvent.click(document.querySelector('[data-id="7"] [data-tour="grid-delete"]'));
  };

  test('pide el motivo, habilita Confirmar al escribirlo y lo pasa a deleteRequest', async () => {
    const deleteRequest = jest.fn().mockResolvedValue({});
    await openDeleteDialog({ deleteRequest, deleteReason: { label: 'Motivo de la anulación' } });

    const confirm = await screen.findByRole('button', { name: 'Anular' });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Motivo de la anulación/), { target: { value: '   ' } });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Motivo de la anulación/), { target: { value: ' Se cargó mal ' } });
    fireEvent.click(confirm);

    await waitFor(() => expect(deleteRequest).toHaveBeenCalledWith(7, 'Se cargó mal'));
  });

  test('sin deleteReason el diálogo no pide motivo', async () => {
    await openDeleteDialog({ deleteRequest: jest.fn().mockResolvedValue({}) });

    expect(await screen.findByRole('button', { name: 'Anular' })).toBeEnabled();
    expect(screen.queryByLabelText(/Motivo/)).toBeNull();
  });
});

describe('mensajes al eliminar', () => {
  const deleteRow = async (data) => {
    axios.get.mockResolvedValue({ data: [{ id: 7, name: 'Ítem 7' }] });
    renderList(buildData({ mapData: (items) => items, groupActions: true, deleteLabel: 'Eliminar', ...data }));
    await screen.findByText('Ítem 7');
    fireEvent.click(document.querySelector('[data-id="7"] [data-tour="grid-delete"]'));
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));
  };

  test('al eliminar muestra el mensaje de éxito', async () => {
    axios.delete.mockResolvedValue({});
    await deleteRow({ deleteSuccessMessage: () => 'El ítem se eliminó correctamente.' });

    expect(await screen.findByText('El ítem se eliminó correctamente.')).toBeInTheDocument();
  });

  test('si el backend no deja eliminar, muestra su mensaje en el toast', async () => {
    axios.delete.mockRejectedValue({ response: { data: { detail: 'El cliente tiene facturas: no se puede eliminar.' } } });
    await deleteRow({});

    expect(await screen.findByText('El cliente tiene facturas: no se puede eliminar.')).toBeInTheDocument();
  });
});

test('las solapas manejadas por la pantalla no van al backend y avisan el cambio', async () => {
  const onChange = jest.fn();
  renderList(buildData({ tabs: { options: [{ label: 'Facturas', value: 0 }, { label: 'Remitos', value: 1 }], value: 0, onChange } }));
  await waitFor(() => expect(axios.get).toHaveBeenCalledWith(BASE_URL));

  fireEvent.click(screen.getByRole('tab', { name: 'Remitos' }));

  expect(onChange).toHaveBeenCalledWith(1);
  expect(axios.get).toHaveBeenCalledTimes(1);
});
