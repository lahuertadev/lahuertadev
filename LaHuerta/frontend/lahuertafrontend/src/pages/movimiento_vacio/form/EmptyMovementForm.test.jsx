import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import EmptyMovementForm from './EmptyMovementForm';
import EmptyMovementTypeSelection from '../create/EmptyMovementTypeSelection';
import { containerTypeUrl, emptyMovementUrl, supplierUrl } from '../../../constants/urls';
import { EMPTY_MOVEMENT_TYPES } from '../../../constants/emptyMovementTypes';
import { TUTORIAL_EVENT_NAME, TUTORIAL_EVENTS } from '../../../constants/tutorials';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock('../../../context/ToastContext', () => ({ useToast: () => ({ showToast: jest.fn() }) }));
// El selector de fecha de MUI no aporta a estos tests: un input simple con el mismo contrato.
jest.mock('../../../components/DatePicker', () => ({ value, onChange }) => (
  <input aria-label="Fecha" value={value || ''} onChange={(e) => onChange(e.target.value)} />
));

// jsdom no implementa matchMedia (lo usan useMediaQuery y SpotlightButton).
beforeAll(() => {
  window.matchMedia = (query) => ({
    matches: false, media: query, addListener: jest.fn(), removeListener: jest.fn(), addEventListener: jest.fn(), removeEventListener: jest.fn(),
  });
});

beforeEach(() => {
  axios.get.mockImplementation((url) => {
    if (url === supplierUrl) return Promise.resolve({ data: [{ id: 1, nombre: 'Puesto 14' }] });
    if (url === containerTypeUrl) {
      return Promise.resolve({ data: [{ id: 3, descripcion: 'Cajón', requiere_vacio: true }, { id: 4, descripcion: 'Bolsa', requiere_vacio: false }] });
    }
    return Promise.resolve({ data: [] });
  });
});

afterEach(() => jest.clearAllMocks());

const renderForm = () =>
  render(
    <MemoryRouter initialEntries={['/empty-movement/create/load']}>
      <Routes>
        <Route path="/empty-movement/create/load" element={<EmptyMovementForm defaultType={EMPTY_MOVEMENT_TYPES.LOAD} />} />
        <Route path="/empty-movement" element={<div>Listado</div>} />
      </Routes>
    </MemoryRouter>
  );

const tour = (name) => document.querySelector(`[data-tour="${name}"]`);

const fillMovement = async () => {
  await screen.findByRole('option', { name: 'Puesto 14' });
  fireEvent.change(tour('empty-supplier').querySelector('select'), { target: { value: '1' } });
  fireEvent.change(tour('empty-lines').querySelector('select'), { target: { value: '3' } });
  fireEvent.change(tour('empty-lines').querySelector('input[type="number"]'), { target: { value: '10' } });
  fireEvent.change(tour('empty-lines').querySelector('input[name="precio_unitario_0"]'), { target: { value: '4000' } });
};

test('la elección de tipo marca las dos tarjetas para el tutorial', () => {
  render(<MemoryRouter><EmptyMovementTypeSelection /></MemoryRouter>);

  expect(tour('empty-type-load')).toHaveTextContent('Carga de vacíos');
  expect(tour('empty-type-return')).toHaveTextContent('Devolución de vacíos');
});

test('el formulario marca sus campos para el tutorial', async () => {
  renderForm();
  await screen.findByRole('option', { name: 'Puesto 14' });

  ['empty-supplier', 'empty-date', 'empty-type', 'empty-receipt', 'empty-lines', 'form-confirm'].forEach((name) => {
    expect(tour(name)).not.toBeNull();
  });
});

test('proveedor y renglones quedan completos para el tutorial recién cuando están cargados', async () => {
  renderForm();
  await screen.findByRole('option', { name: 'Puesto 14' });
  expect(tour('empty-supplier')).toHaveAttribute('data-tour-complete', 'false');
  expect(tour('empty-lines')).toHaveAttribute('data-tour-complete', 'false');

  await fillMovement();

  expect(tour('empty-supplier')).toHaveAttribute('data-tour-complete', 'true');
  expect(tour('empty-lines')).toHaveAttribute('data-tour-complete', 'true');
});

test('un renglón con tipo pero sin cantidad no está completo', async () => {
  renderForm();
  await fillMovement();

  fireEvent.change(tour('empty-lines').querySelector('input[type="number"]'), { target: { value: '' } });

  expect(tour('empty-lines')).toHaveAttribute('data-tour-complete', 'false');
});

test('al guardar un movimiento nuevo avisa al tutorial con su id', async () => {
  const listener = jest.fn();
  window.addEventListener(TUTORIAL_EVENT_NAME, listener);
  axios.post.mockResolvedValue({ data: { id: 42 } });
  renderForm();
  await fillMovement();

  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

  await waitFor(() => expect(listener).toHaveBeenCalled());
  expect(axios.post).toHaveBeenCalledWith(emptyMovementUrl, expect.objectContaining({ proveedor: 1, tipo: EMPTY_MOVEMENT_TYPES.LOAD }));
  expect(listener.mock.calls[0][0].detail).toEqual({ name: TUTORIAL_EVENTS.emptyMovementCreated, id: 42 });
  window.removeEventListener(TUTORIAL_EVENT_NAME, listener);
});
