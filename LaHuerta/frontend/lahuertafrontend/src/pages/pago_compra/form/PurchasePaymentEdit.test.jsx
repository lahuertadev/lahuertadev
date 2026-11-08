import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import PurchasePaymentEdit from './PurchasePaymentEdit';
import { purchasePaymentUrl } from '../../../constants/urls';

jest.mock('axios', () => ({ get: jest.fn(), put: jest.fn() }));
jest.mock('../../../components/DatePicker', () => ({ value, onChange }) => (
  <input value={value || ''} onChange={(e) => onChange(e.target.value || null)} />
));

const PAYMENT = {
  id: 5,
  proveedor: { id: 7, nombre: 'Ricardo', puesto: 27 },
  compra: { id: 12, fecha: '2026-10-22', proveedor: 'Ricardo' },
  importe_abonado: '3000.00',
  fecha_pago: '2026-10-28',
  tipo_pago: { id: 1, descripcion: 'Efectivo' },
  cheques: [],
  cheques_propios: [],
};

beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() });
});

beforeEach(() => axios.get.mockResolvedValue({ data: PAYMENT }));
afterEach(() => jest.clearAllMocks());

const renderEdit = () =>
  render(
    <MemoryRouter initialEntries={['/purchase-payment/edit/5']}>
      <Routes>
        <Route path="/purchase-payment/edit/:id" element={<PurchasePaymentEdit />} />
        <Route path="/purchase-payment/detail/:id" element={<div>Detalle del pago</div>} />
      </Routes>
    </MemoryRouter>
  );

const field = (name) => document.querySelector(`[data-tour="${name}"]`).querySelector('input');
const saveButton = () => screen.getByRole('button', { name: 'Guardar cambios' });

test('muestra el pago sin dejar cambiar proveedor, compra ni medio de pago', async () => {
  renderEdit();

  expect(await screen.findByText('Ricardo — Puesto 27')).toBeInTheDocument();
  expect(screen.getByText(/Compra N° 00000012/)).toBeInTheDocument();
  expect(screen.getByText('Efectivo')).toBeInTheDocument();
  expect(field('payment-date').value).toBe('2026-10-28');
});

test('el número del pago aparece en las migas de pan', async () => {
  renderEdit();

  expect(await screen.findByText('Pago N° 00000005')).toBeInTheDocument();
});

test('"Guardar cambios" está deshabilitado hasta que se cambia algo', async () => {
  renderEdit();
  await screen.findByText('Ricardo — Puesto 27');
  expect(saveButton()).toBeDisabled();

  fireEvent.change(field('payment-amount'), { target: { value: '2500' } });

  await waitFor(() => expect(saveButton()).not.toBeDisabled());
});

test('guarda la fecha y el importe y vuelve al detalle', async () => {
  axios.put.mockResolvedValue({ data: PAYMENT });
  renderEdit();
  await screen.findByText('Ricardo — Puesto 27');

  fireEvent.change(field('payment-date'), { target: { value: '2026-10-30' } });
  fireEvent.change(field('payment-amount'), { target: { value: '2500' } });
  fireEvent.click(saveButton());

  await waitFor(() => expect(axios.put).toHaveBeenCalledWith(
    `${purchasePaymentUrl}5/`, { importe_abonado: '2500', fecha_pago: '2026-10-30' }
  ));
  expect(await screen.findByText('Detalle del pago')).toBeInTheDocument();
});

test('si el importe supera el saldo, muestra el error en el campo', async () => {
  axios.put.mockRejectedValue({ response: { data: { detail: 'El importe abonado (99999.00) supera el saldo pendiente (10000.00).' } } });
  renderEdit();
  await screen.findByText('Ricardo — Puesto 27');

  fireEvent.change(field('payment-amount'), { target: { value: '99999' } });
  fireEvent.click(saveButton());

  expect(await screen.findByText(/supera el saldo pendiente/)).toBeInTheDocument();
});


test('un pago con cheques solo deja cambiar la fecha', async () => {
  axios.get.mockResolvedValue({ data: {
    ...PAYMENT,
    tipo_pago: { id: 3, descripcion: 'Cheque Propio' },
    cheques_propios: [
      { id: 884, numero: 884, banco: 'Galicia', importe: '1000000.00', importe_usado: '700000.00', estado: 'EMITIDO' },
      { id: 885, numero: 885, banco: 'Galicia', importe: '500000.00', importe_usado: '500000.00', estado: 'EMITIDO' },
    ],
  } });
  renderEdit();

  expect(await screen.findByText('Cheques (2)')).toBeInTheDocument();
  expect(field('payment-amount')).toBeDisabled();
  expect(screen.getByText(/El importe sale de los cheques del pago/)).toBeInTheDocument();
});
