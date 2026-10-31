import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import OwnCheckForm from './OwnCheckForm';
import { bankUrl, ownCheckUrl } from '../../../constants/urls';
import { TUTORIAL_EVENT_NAME, TUTORIAL_EVENTS } from '../../../constants/tutorials';

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
    <MemoryRouter initialEntries={['/own-check/create']}>
      <Routes>
        <Route path="/own-check/create" element={<OwnCheckForm />} />
        <Route path="/own-check" element={<div>Listado</div>} />
      </Routes>
    </MemoryRouter>
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
  window.removeEventListener(TUTORIAL_EVENT_NAME, listener);
});
