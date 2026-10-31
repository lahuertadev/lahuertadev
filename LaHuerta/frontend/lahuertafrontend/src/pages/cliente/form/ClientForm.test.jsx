import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import ClientForm from './ClientForm';
import { clientUrl } from '../../../constants/urls';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock('../../../context/ToastContext', () => ({ useToast: () => ({ showToast: jest.fn() }) }));
// El selector de fecha de MUI no aporta a estos tests: un input simple con el mismo contrato.
jest.mock('../../../components/DatePicker', () => ({ value, onChange }) => (
  <input aria-label="Fecha de inicio" value={value || ''} onChange={(e) => onChange(e.target.value)} />
));

// jsdom no implementa matchMedia (lo usa useSpotlight de SpotlightButton).
beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() });
});

const district = (id, nombre, cityId, cityName) => ({
  id,
  nombre,
  municipio: { id: cityId, nombre: cityName, provincia: { id: '06', nombre: 'Buenos Aires' } },
});

const client = (overrides = {}) => ({
  id: 7,
  cuit: '20123456789',
  razon_social: 'Cliente Test S.A.',
  nombre_fantasia: null,
  localidad: district('0642701009', 'CABA', '064270', 'CABA'),
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

const mockGet = (clientData) => {
  axios.get.mockImplementation((url) => {
    if (url === `${clientUrl}7/`) return Promise.resolve({ data: clientData });
    if (url.includes('georef/api/provincias')) return Promise.resolve({ data: { provincias: [{ id: '06', nombre: 'Buenos Aires' }] } });
    if (url.includes('georef/api/municipios')) {
      return Promise.resolve({ data: { municipios: [{ id: '064270', nombre: 'CABA' }, { id: '064271', nombre: 'Palermo Municipio' }] } });
    }
    if (url.includes('georef/api/localidades')) {
      return Promise.resolve({ data: { localidades: [{ id: '0642701009', nombre: 'CABA' }, { id: '0642701010', nombre: 'Palermo' }] } });
    }
    return Promise.resolve({ data: [] });
  });
};

const renderForm = (path = '/client/create') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/client/create" element={<ClientForm />} />
        <Route path="/client/edit/:id" element={<ClientForm />} />
        <Route path="/client" element={<div>Listado</div>} />
      </Routes>
    </MemoryRouter>
  );

const tour = (name) => document.querySelector(`[data-tour="${name}"]`);
const deliverySwitch = () => screen.getByLabelText('¿Se entrega en otra dirección?');
const saveButton = () => screen.getByRole('button', { name: 'Guardar cambios' });

afterEach(() => jest.clearAllMocks());

test('la sección Dirección agrupa la de facturación y la de entrega arranca en No, sin campos', async () => {
  mockGet(client());
  renderForm();

  expect(await screen.findByRole('heading', { level: 3, name: 'Facturación' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: 'Dirección' })).toBeInTheDocument();
  expect(deliverySwitch()).not.toBeChecked();
  expect(tour('client-delivery-province')).toBeNull();
  expect(tour('client-delivery-address')).toBeNull();
});

test('con Sí aparecen Provincia, Municipio, Localidad y Dirección de entrega; con No se ocultan', async () => {
  mockGet(client());
  renderForm();
  await screen.findByRole('heading', { level: 3, name: 'Facturación' });

  fireEvent.click(deliverySwitch());
  ['province', 'city', 'district', 'address'].forEach((field) => {
    expect(tour(`client-delivery-${field}`)).not.toBeNull();
  });

  fireEvent.click(deliverySwitch());
  expect(tour('client-delivery-province')).toBeNull();
});

test('al editar, el interruptor refleja la dirección de entrega cargada', async () => {
  mockGet(client({
    localidad_entrega: district('0642701010', 'Palermo', '064271', 'Palermo Municipio'),
    domicilio_entrega: 'Thames 500',
  }));
  renderForm('/client/edit/7');

  await waitFor(() => expect(deliverySwitch()).toBeChecked());
  expect(tour('client-delivery-address').querySelector('input')).toHaveValue('Thames 500');
  await waitFor(() => expect(tour('client-delivery-district').querySelector('select')).toHaveValue('0642701010'));
  // La cascada de entrega es independiente de la de facturación.
  expect(tour('client-district').querySelector('select')).toHaveValue('0642701009');
});

test('al pasar el interruptor a No y guardar, manda la dirección de entrega en null', async () => {
  mockGet(client({
    localidad_entrega: district('0642701010', 'Palermo', '064271', 'Palermo Municipio'),
    domicilio_entrega: 'Thames 500',
  }));
  axios.put.mockResolvedValue({ data: { id: 7 } });
  renderForm('/client/edit/7');
  await waitFor(() => expect(deliverySwitch()).toBeChecked());

  fireEvent.click(deliverySwitch());
  fireEvent.click(saveButton());

  await waitFor(() => expect(axios.put).toHaveBeenCalled());
  const payload = axios.put.mock.calls[0][1];
  expect(payload.localidad_entrega).toBeNull();
  expect(payload.domicilio_entrega).toBeNull();
  expect(payload.localidad.id).toBe('0642701009');
});

test('con Sí, guarda la localidad de entrega completa (con municipio y provincia) y su dirección', async () => {
  mockGet(client());
  axios.put.mockResolvedValue({ data: { id: 7 } });
  renderForm('/client/edit/7');
  await waitFor(() => expect(tour('client-district').querySelector('select')).toHaveValue('0642701009'));

  fireEvent.click(deliverySwitch());
  expect(saveButton()).toBeDisabled();

  fireEvent.change(tour('client-delivery-province').querySelector('select'), { target: { value: '06' } });
  await waitFor(() => expect(tour('client-delivery-city').querySelector('select')).not.toBeDisabled());
  fireEvent.change(tour('client-delivery-city').querySelector('select'), { target: { value: '064271' } });
  await waitFor(() => expect(tour('client-delivery-district').querySelector('select')).not.toBeDisabled());
  fireEvent.change(tour('client-delivery-district').querySelector('select'), { target: { value: '0642701010' } });
  fireEvent.change(tour('client-delivery-address').querySelector('input'), { target: { value: 'Thames 500' } });

  await waitFor(() => expect(saveButton()).not.toBeDisabled());
  fireEvent.click(saveButton());

  await waitFor(() => expect(axios.put).toHaveBeenCalled());
  const payload = axios.put.mock.calls[0][1];
  expect(payload.localidad_entrega).toEqual(district('0642701010', 'Palermo', '064271', 'Palermo Municipio'));
  expect(payload.domicilio_entrega).toBe('Thames 500');
});
