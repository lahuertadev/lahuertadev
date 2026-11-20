import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import PurchasePaymentEdit, { editableBuys } from './PurchasePaymentEdit';
import { buyUrl, purchasePaymentUrl } from '../../../constants/urls';
import { ToastProvider } from '../../../context/ToastContext';

jest.mock('axios', () => ({ get: jest.fn(), put: jest.fn() }));
jest.mock('../../../components/DatePicker', () => ({ value, onChange }) => (
  <input value={value || ''} onChange={(e) => onChange(e.target.value || null)} />
));

const PAYMENT = {
  id: 5,
  proveedor: { id: 7, nombre: 'Ricardo', puesto: 27 },
  compras: [{ id: 12, fecha: '2026-10-22', importe: '10000.00', importe_aplicado: '3000.00' }],
  importe_abonado: '3000.00',
  importe_a_cuenta: '0.00',
  fecha_pago: '2026-10-28',
  tipo_pago: { id: 1, descripcion: 'Efectivo' },
  cheques: [],
  cheques_propios: [],
};

// Compras del proveedor: la 12 tiene $3.000 de este pago; la 14 está pagada por otros pagos.
const SUPPLIER_BUYS = [
  { id: 12, fecha: '2026-10-22', importe: '10000.00', outstanding_balance: '7000.00' },
  { id: 13, fecha: '2026-10-25', importe: '2000.00', outstanding_balance: '2000.00' },
  { id: 14, fecha: '2026-10-26', importe: '500.00', outstanding_balance: '0.00' },
];

beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() });
});

const mockGet = (payment = PAYMENT) => axios.get.mockImplementation((url) =>
  Promise.resolve({ data: url === `${buyUrl}?proveedor_id=7` ? SUPPLIER_BUYS : payment })
);

beforeEach(() => mockGet());
afterEach(() => jest.clearAllMocks());

const renderEdit = () =>
  render(
    <ToastProvider><MemoryRouter initialEntries={['/purchase-payment/edit/5']}>
      <Routes>
        <Route path="/purchase-payment/edit/:id" element={<PurchasePaymentEdit />} />
        <Route path="/purchase-payment/detail/:id" element={<div>Detalle del pago</div>} />
      </Routes>
    </MemoryRouter></ToastProvider>
  );

const field = (name) => document.querySelector(`[data-tour="${name}"]`).querySelector('input');
const saveButton = () => screen.getByRole('button', { name: 'Guardar cambios' });
const buyCheckbox = (id) => screen.getByRole('checkbox', { name: `Compra N° ${String(id).padStart(8, '0')}` });
const allocationInput = (id) => document.querySelector(`input[name="allocation-${id}"]`);

describe('editableBuys', () => {
  test('ofrece las compras con saldo y las que el pago ya cubre, sumando lo que este pago les aplica', () => {
    expect(editableBuys(SUPPLIER_BUYS, PAYMENT)).toEqual([
      { id: 12, fecha: '2026-10-22', importe: '10000.00', available: '10000.00' },
      { id: 13, fecha: '2026-10-25', importe: '2000.00', available: '2000.00' },
    ]);
  });
});

test('muestra el pago sin dejar cambiar proveedor ni medio de pago, con las compras que cubre', async () => {
  renderEdit();

  expect(await screen.findByText('Ricardo — Puesto 27')).toBeInTheDocument();
  expect(screen.getByText('Efectivo')).toBeInTheDocument();
  expect(field('payment-date').value).toBe('2026-10-28');
  expect(buyCheckbox(12)).toBeChecked();
  expect(buyCheckbox(13)).not.toBeChecked();
  // Al abrir no se reparte de nuevo: se ve lo que el pago ya tenía aplicado.
  expect(allocationInput(12)).toHaveValue('3.000,00');
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

test('guarda la fecha, el importe y las compras, y vuelve al detalle', async () => {
  axios.put.mockResolvedValue({ data: PAYMENT });
  renderEdit();
  await screen.findByText('Ricardo — Puesto 27');

  fireEvent.change(field('payment-date'), { target: { value: '2026-10-30' } });
  fireEvent.change(field('payment-amount'), { target: { value: '2500' } });
  fireEvent.click(saveButton());
  // Baja lo aplicado a la compra 12 (de $3.000 a $2.500): pide confirmación antes de guardar.
  fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));

  await waitFor(() => expect(axios.put).toHaveBeenCalledWith(`${purchasePaymentUrl}5/`, {
    importe_abonado: '2500',
    fecha_pago: '2026-10-30',
    compras: [{ compra: 12, importe: '2500.00' }],
  }));
  expect(await screen.findByText('Detalle del pago')).toBeInTheDocument();
  expect(screen.getByText('El pago se actualizó correctamente.')).toBeInTheDocument();
});

test('al tildar otra compra reparte el importe del pago de la más vieja a la más nueva', async () => {
  axios.put.mockResolvedValue({ data: PAYMENT });
  renderEdit();
  await screen.findByText('Ricardo — Puesto 27');
  fireEvent.change(field('payment-amount'), { target: { value: '12000' } });

  fireEvent.click(buyCheckbox(13));
  fireEvent.click(saveButton());

  await waitFor(() => expect(axios.put).toHaveBeenCalled());
  expect(axios.put.mock.calls[0][1].compras).toEqual([
    { compra: 12, importe: '10000.00' },
    { compra: 13, importe: '2000.00' },
  ]);
});

test('destildar todas las compras deja el pago a cuenta', async () => {
  axios.put.mockResolvedValue({ data: PAYMENT });
  renderEdit();
  await screen.findByText('Ricardo — Puesto 27');

  fireEvent.click(buyCheckbox(12));
  fireEvent.click(saveButton());
  fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));

  await waitFor(() => expect(axios.put).toHaveBeenCalled());
  expect(axios.put.mock.calls[0][1].compras).toEqual([]);
});

test('antes de guardar avisa qué compras vuelven a deber y cuánto queda a cuenta', async () => {
  renderEdit();
  await screen.findByText('Ricardo — Puesto 27');

  fireEvent.click(buyCheckbox(12));
  fireEvent.click(buyCheckbox(13));
  fireEvent.click(saveButton());

  expect(await screen.findByText('Confirmar cambios')).toBeInTheDocument();
  expect(screen.getByText(/Compra N° 00000012: vuelve a deber \$\s?3\.000,00/)).toBeInTheDocument();
  expect(screen.getByText(/Quedan \$\s?1\.000,00 del pago a cuenta del proveedor/)).toBeInTheDocument();
  expect(axios.put).not.toHaveBeenCalled();
});

test('si se cancela el aviso no guarda y se queda en la edición', async () => {
  renderEdit();
  await screen.findByText('Ricardo — Puesto 27');

  fireEvent.click(buyCheckbox(12));
  fireEvent.click(saveButton());
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

  await waitFor(() => expect(screen.queryByText('Confirmar cambios')).toBeNull());
  expect(axios.put).not.toHaveBeenCalled();
  expect(screen.queryByText('Detalle del pago')).toBeNull();
});

test('si no deja compras sin cubrir guarda sin pedir confirmación', async () => {
  axios.put.mockResolvedValue({ data: PAYMENT });
  renderEdit();
  await screen.findByText('Ricardo — Puesto 27');

  fireEvent.change(field('payment-date'), { target: { value: '2026-10-30' } });
  fireEvent.click(saveButton());

  await waitFor(() => expect(axios.put).toHaveBeenCalled());
  expect(screen.queryByText('Confirmar cambios')).toBeNull();
});

test('si lo aplicado supera el importe del pago, el error del backend va al campo de importe', async () => {
  axios.put.mockRejectedValue({ response: { data: { detail: 'Lo aplicado a las compras (3000.00) supera el importe del pago (2000.00).' } } });
  renderEdit();
  await screen.findByText('Ricardo — Puesto 27');

  fireEvent.change(field('payment-date'), { target: { value: '2026-10-30' } });
  fireEvent.click(saveButton());

  expect(await screen.findByText(/supera el importe del pago \(\$2\.000,00\)/)).toBeInTheDocument();
});

test('un pago con cheques no deja cambiar el importe y no lo manda', async () => {
  axios.put.mockResolvedValue({ data: PAYMENT });
  mockGet({
    ...PAYMENT,
    tipo_pago: { id: 3, descripcion: 'Cheque Propio' },
    cheques_propios: [
      { id: 884, numero: 884, banco: 'Galicia', importe: '1000000.00', estado: 'EMITIDO' },
      { id: 885, numero: 885, banco: 'Galicia', importe: '500000.00', estado: 'EMITIDO' },
    ],
  });
  renderEdit();

  expect(await screen.findByText('Cheques (2)')).toBeInTheDocument();
  expect(field('payment-amount')).toBeDisabled();
  expect(screen.getByText(/El importe sale de los cheques del pago/)).toBeInTheDocument();

  fireEvent.change(field('payment-date'), { target: { value: '2026-10-30' } });
  fireEvent.click(saveButton());

  await waitFor(() => expect(axios.put).toHaveBeenCalled());
  expect(axios.put.mock.calls[0][1]).not.toHaveProperty('importe_abonado');
});

test('un pago con cheques que quedó en cero por un rechazo se puede editar igual', async () => {
  axios.put.mockResolvedValue({ data: PAYMENT });
  mockGet({
    ...PAYMENT,
    importe_abonado: '0.00',
    compras: [{ id: 12, fecha: '2026-10-22', importe: '10000.00', importe_aplicado: '0.00' }],
    tipo_pago: { id: 2, descripcion: 'Cheque' },
    cheques: [{ id: 50, numero: 1, banco: 'Nación', importe: '3000.00', estado: 'RECHAZADO' }],
  });
  renderEdit();
  await screen.findByText('Ricardo — Puesto 27');

  fireEvent.change(field('payment-date'), { target: { value: '2026-10-30' } });
  fireEvent.click(saveButton());

  await waitFor(() => expect(axios.put).toHaveBeenCalledWith(`${purchasePaymentUrl}5/`, { fecha_pago: '2026-10-30', compras: [] }));
});
