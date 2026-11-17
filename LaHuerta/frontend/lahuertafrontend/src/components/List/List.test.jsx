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
