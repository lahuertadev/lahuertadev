import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import ClientForm from './ClientForm';
import { clientUrl } from '../../../constants/urls';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock('../../../context/ToastContext', () => ({ useToast: () => ({ showToast: jest.fn() }) }));
// El selector de fecha de MUI no aporta a estos tests: un input simple con el mismo contrato.
jest.mock('../../../components/DatePicker', () => ({ value, onChange, required }) => (
  <input aria-label="Fecha de inicio" aria-required={required || undefined} value={value || ''} onChange={(e) => onChange(e.target.value)} />
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
  contactos: [{ id: 1, numero: '1122334455', descripcion: null, email: null }],
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

// ── Contactos ────────────────────────────────────────────────────────────────

const phoneInputs = () => screen.getAllByLabelText(/^Teléfono del contacto/);
const removeButtons = () => screen.getAllByRole('button', { name: /^Eliminar contacto/ });

test('con un solo contacto no se puede eliminar; con dos, sí', async () => {
  mockGet(client());
  renderForm('/client/edit/7');
  await waitFor(() => expect(phoneInputs()[0]).toHaveValue('11-2233-4455'));

  removeButtons().forEach((button) => expect(button).toBeDisabled());

  fireEvent.click(screen.getByRole('button', { name: /Agregar contacto/ }));
  expect(phoneInputs()).toHaveLength(2);
  removeButtons().forEach((button) => expect(button).not.toBeDisabled());
});

test('sin teléfono en un contacto no deja guardar', async () => {
  mockGet(client());
  renderForm('/client/edit/7');
  await waitFor(() => expect(phoneInputs()[0]).toHaveValue('11-2233-4455'));

  fireEvent.click(screen.getByRole('button', { name: /Agregar contacto/ }));

  await waitFor(() => expect(saveButton()).toBeDisabled());
  fireEvent.change(phoneInputs()[1], { target: { value: '11-6666-7777' } });
  await waitFor(() => expect(saveButton()).not.toBeDisabled());
});

test('al guardar manda los contactos: el existente con id, el nuevo sin id y los vacíos en null', async () => {
  mockGet(client({
    contactos: [
      { id: 1, numero: '1122334455', descripcion: null, email: null },
      { id: 2, numero: '1100000000', descripcion: 'Viejo', email: null },
    ],
  }));
  axios.put.mockResolvedValue({ data: { id: 7 } });
  renderForm('/client/edit/7');
  await waitFor(() => expect(phoneInputs()).toHaveLength(2));

  fireEvent.change(screen.getByLabelText('Descripción del contacto 1'), { target: { value: 'Compras' } });
  fireEvent.click(removeButtons()[2]); // los dos primeros son los de mobile y desktop del contacto 1
  fireEvent.click(screen.getByRole('button', { name: /Agregar contacto/ }));
  fireEvent.change(phoneInputs()[1], { target: { value: '1177778888' } });
  fireEvent.change(screen.getByLabelText('Email del contacto 2'), { target: { value: 'pagos@cliente.com' } });

  await waitFor(() => expect(saveButton()).not.toBeDisabled());
  fireEvent.click(saveButton());

  await waitFor(() => expect(axios.put).toHaveBeenCalled());
  expect(axios.put.mock.calls[0][1].contactos).toEqual([
    { id: 1, numero: '1122334455', descripcion: 'Compras', email: null },
    { numero: '1177778888', descripcion: null, email: 'pagos@cliente.com' },
  ]);
});

test('los campos obligatorios llevan aria-required y los opcionales no', async () => {
  mockGet(client());
  renderForm();
  await screen.findByRole('heading', { level: 3, name: 'Facturación' });

  ['client-cuit', 'client-business-name', 'client-province', 'client-iva-condition', 'client-price-list-select', 'client-sales-start'].forEach((name) => {
    expect(tour(name).querySelector('input, select')).toHaveAttribute('aria-required', 'true');
  });
  expect(phoneInputs()[0]).toHaveAttribute('aria-required', 'true');
  expect(tour('client-address').querySelector('input')).not.toHaveAttribute('aria-required');
  expect(screen.getByPlaceholderText('Nombre comercial')).not.toHaveAttribute('aria-required');
});

test('el primer teléfono mantiene el data-tour del tutorial', async () => {
  mockGet(client());
  renderForm();
  await screen.findByRole('heading', { level: 3, name: 'Facturación' });

  expect(tour('client-phone').querySelector('input')).toBe(phoneInputs()[0]);
  expect(tour('client-contact-add')).not.toBeNull();
});
