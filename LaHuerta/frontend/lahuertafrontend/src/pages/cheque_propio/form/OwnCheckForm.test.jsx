import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import OwnCheckForm from './OwnCheckForm';
import { bankUrl, ownCheckUrl } from '../../../constants/urls';
import { TUTORIAL_EVENT_NAME, TUTORIAL_EVENTS } from '../../../constants/tutorials';
import { ToastProvider } from '../../../context/ToastContext';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
// El selector de fecha de MUI no aporta a estos tests: un input simple con el mismo contrato.
jest.mock('../../../components/DatePicker', () => ({ value, onChange }) => (
  <input value={value || ''} onChange={(e) => onChange(e.target.value || null)} />
));

// jsdom no implementa matchMedia (lo usa useSpotlight de SpotlightButton).
beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() });
});

beforeEach(() => {
  axios.get.mockImplementation((url) =>
    Promise.resolve({ data: url === bankUrl ? [{ id: 2, descripcion: 'Banco Nación' }] : [] })
  );
});

afterEach(() => jest.clearAllMocks());

const renderForm = () =>
  render(
    <ToastProvider><MemoryRouter initialEntries={['/own-check/create']}>
      <Routes>
        <Route path="/own-check/create" element={<OwnCheckForm />} />
        <Route path="/own-check" element={<div>Listado</div>} />
      </Routes>
    </MemoryRouter></ToastProvider>
  );

const tour = (name) => document.querySelector(`[data-tour="${name}"]`);
const field = (name) => tour(name).querySelector('input, select');
const confirmButton = () => screen.getByRole('button', { name: 'Registrar Cheque' });

const fillCheck = async () => {
  await screen.findByRole('option', { name: 'Banco Nación' });
  fireEvent.change(field('own-check-number'), { target: { name: 'numero', value: '1234' } });
  fireEvent.change(field('own-check-bank'), { target: { value: '2' } });
  fireEvent.change(field('own-check-amount'), { target: { value: '50000' } });
  fireEvent.change(field('own-check-issue-date'), { target: { value: '2026-10-31' } });
  fireEvent.change(field('own-check-due-date'), { target: { value: '2026-11-30' } });
};

test('marca los campos del formulario para el tutorial', async () => {
  renderForm();
  await screen.findByRole('option', { name: 'Banco Nación' });

  ['own-check-number', 'own-check-bank', 'own-check-amount', 'own-check-issue-date', 'own-check-deposit-date', 'own-check-due-date', 'form-confirm']
    .forEach((name) => expect(tour(name)).not.toBeNull());
});

test('"Registrar Cheque" se habilita recién con los campos obligatorios completos', async () => {
  renderForm();
  await screen.findByRole('option', { name: 'Banco Nación' });
  expect(confirmButton()).toBeDisabled();

  await fillCheck();

  await waitFor(() => expect(confirmButton()).not.toBeDisabled());
});

test('la fecha de depósito posterior al vencimiento no deja registrar', async () => {
  renderForm();
  await fillCheck();

  fireEvent.change(field('own-check-deposit-date'), { target: { value: '2026-12-15' } });
  // El vencimiento se completa solo con 30 días; se lo pone a mano antes del depósito.
  fireEvent.change(field('own-check-due-date'), { target: { value: '2026-12-01' } });

  await waitFor(() => expect(confirmButton()).toBeDisabled());
});

test('al registrar un cheque nuevo avisa al tutorial con su id', async () => {
  const listener = jest.fn();
  window.addEventListener(TUTORIAL_EVENT_NAME, listener);
  axios.post.mockResolvedValue({ data: { id: 9 } });
  renderForm();
  await fillCheck();
  await waitFor(() => expect(confirmButton()).not.toBeDisabled());

  fireEvent.click(confirmButton());

  await waitFor(() => expect(listener).toHaveBeenCalled());
  expect(axios.post).toHaveBeenCalledWith(ownCheckUrl, expect.objectContaining({ numero: 1234, banco: '2', fecha_deposito: null }));
  expect(listener.mock.calls[0][0].detail).toEqual({ name: TUTORIAL_EVENTS.ownCheckCreated, id: 9 });
  expect(await screen.findByText('El cheque se registró correctamente.')).toBeInTheDocument();
  window.removeEventListener(TUTORIAL_EVENT_NAME, listener);
});

test('al guardar la edición de un cheque vuelve al listado con el mensaje de éxito', async () => {
  axios.get.mockImplementation((url) => Promise.resolve({ data: url === bankUrl
    ? [{ id: 2, descripcion: 'Banco Nación' }]
    : {
      id: 4, numero: 1234, banco: { id: 2, descripcion: 'Banco Nación' }, importe: '50000.00', fecha_emision: '2026-10-31',
      fecha_deposito: null, fecha_vencimiento: '2026-11-30', observaciones: '', purchases: [], supplier_name: '',
    } }));
  axios.put.mockResolvedValue({ data: {} });
  render(
    <ToastProvider><MemoryRouter initialEntries={['/own-check/edit/4']}>
      <Routes>
        <Route path="/own-check/edit/:id" element={<OwnCheckForm />} />
        <Route path="/own-check" element={<div>Listado</div>} />
      </Routes>
    </MemoryRouter></ToastProvider>
  );
  await waitFor(() => expect(field('own-check-amount')).toHaveValue('50.000,00'));

  fireEvent.change(field('own-check-amount'), { target: { value: '45000' } });
  fireEvent.click(await screen.findByRole('button', { name: 'Guardar cambios' }));

  await waitFor(() => expect(axios.put).toHaveBeenCalledWith(`${ownCheckUrl}4/`, expect.objectContaining({ importe: '45000' })));
  expect(await screen.findByText('Listado')).toBeInTheDocument();
  expect(screen.getByText('El cheque se actualizó correctamente.')).toBeInTheDocument();
});

test('al cargar la fecha de depósito, el vencimiento se completa con 30 días corridos y se puede cambiar', async () => {
  renderForm();
  await screen.findByRole('option', { name: 'Banco Nación' });

  fireEvent.change(field('own-check-deposit-date'), { target: { value: '2026-01-30' } });
  expect(field('own-check-due-date')).toHaveValue('2026-03-01');

  fireEvent.change(field('own-check-due-date'), { target: { value: '2026-02-20' } });
  expect(field('own-check-due-date')).toHaveValue('2026-02-20');

  // Al cambiar otra vez la fecha de depósito, se vuelve a calcular.
  fireEvent.change(field('own-check-deposit-date'), { target: { value: '2026-02-15' } });
  expect(field('own-check-due-date')).toHaveValue('2026-03-17');

  // Si se borra la fecha de depósito, el vencimiento queda como estaba.
  fireEvent.change(field('own-check-deposit-date'), { target: { value: '' } });
  expect(field('own-check-due-date')).toHaveValue('2026-03-17');
});
