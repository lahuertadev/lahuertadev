import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import CompraDetail from './CompraDetail';
import { ToastProvider } from '../../../context/ToastContext';

jest.mock('axios', () => ({ get: jest.fn(), delete: jest.fn() }));

const BUY = {
  id: 12,
  fecha: '2026-10-22',
  importe: '1000.00',
  senia: '0.00',
  outstanding_balance: '300.00',
  payment_status: 'PARCIAL',
  proveedor: { id: 7, nombre: 'Ricardo' },
  items: [],
  payments: [
    { id: 5, fecha_pago: '2026-10-25', tipo_pago: 'Efectivo', importe_abonado: '200.00', importe_aplicado: '200.00' },
    { id: 6, fecha_pago: '2026-10-28', tipo_pago: 'Cheque', importe_abonado: '3000.00', importe_aplicado: '500.00' },
  ],
};

beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() });
});

const renderDetail = (buy) => {
  axios.get.mockResolvedValue({ data: buy });
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/buy/detail/12']}>
        <Routes>
          <Route path="/buy/detail/:id" element={<CompraDetail />} />
          <Route path="/purchase-payment/detail/:id" element={<div>Detalle del pago</div>} />
          <Route path="/buy" element={<div>Listado de compras</div>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );
};

test('lista los pagos de la compra con lo que cada uno le aplicó', async () => {
  renderDetail(BUY);

  expect(await screen.findByText('Pago N° 00000005')).toBeInTheDocument();
  expect(screen.getByText('Pago N° 00000006')).toBeInTheDocument();
  // El pago 6 cubre varias compras: a esta le aplicó una parte.
  expect(screen.getByText('de un pago de $3.000,00')).toBeInTheDocument();
});

test('un pago lleva a su detalle', async () => {
  renderDetail(BUY);

  fireEvent.click(await screen.findByText('Pago N° 00000005'));

  expect(screen.getByText('Detalle del pago')).toBeInTheDocument();
});

test('sin pagos lo avisa', async () => {
  renderDetail({ ...BUY, payments: [] });

  expect(await screen.findByText('Todavía no tiene pagos.')).toBeInTheDocument();
});

test('un pago anulado se lista como registro con la etiqueta "Pago anulado"', async () => {
  renderDetail({ ...BUY, payments: [{ ...BUY.payments[0], estado_pago: 'ANULADO' }] });

  expect(await screen.findByText('Pago N° 00000005')).toBeInTheDocument();
  expect(screen.getByText('Pago anulado')).toBeInTheDocument();
});

test('un pago con un cheque rechazado lleva la etiqueta "Cheque rechazado", cubra o no toda la compra', async () => {
  renderDetail({
    ...BUY,
    payments: [
      { ...BUY.payments[0], importe_abonado: '0.00', importe_aplicado: '0.00', fallen_check: 'RECHAZADO' },
      { ...BUY.payments[1], fallen_check: 'RECHAZADO' },
    ],
  });

  expect(await screen.findAllByText('Cheque rechazado')).toHaveLength(2);
});

test('un pago con un cheque propio anulado lleva la etiqueta "Cheque anulado"', async () => {
  renderDetail({ ...BUY, payments: [{ ...BUY.payments[1], fallen_check: 'ANULADO' }] });

  expect(await screen.findByText('Cheque anulado')).toBeInTheDocument();
});

test('un pago anulado no muestra la etiqueta del cheque', async () => {
  renderDetail({ ...BUY, payments: [{ ...BUY.payments[1], estado_pago: 'ANULADO', fallen_check: 'RECHAZADO' }] });

  expect(await screen.findByText('Pago anulado')).toBeInTheDocument();
  expect(screen.queryByText('Cheque rechazado')).not.toBeInTheDocument();
});

describe('Eliminar la compra (en el celular)', () => {
  const desktopMatchMedia = window.matchMedia;
  beforeEach(() => {
    window.matchMedia = (query) => ({ matches: query.includes('max-width'), media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() });
  });
  afterEach(() => { window.matchMedia = desktopMatchMedia; jest.clearAllMocks(); });

  const openDialog = async () => {
    renderDetail({ ...BUY, senia: '200.00', payments: [] });
    fireEvent.click(await screen.findByRole('button', { name: /Eliminar/ }));
    return screen.getByRole('dialog');
  };

  test('el diálogo explica qué se elimina y cuánto baja la deuda (importe menos seña)', async () => {
    const dialog = await openDialog();

    expect(within(dialog).getByText('00000012')).toBeInTheDocument();
    expect(within(dialog).getByText('Ricardo')).toBeInTheDocument();
    expect(within(dialog).getByText(/La deuda con el proveedor baja \$\s?800/)).toBeInTheDocument();
    expect(within(dialog).getByText(/aunque esté anulado, no se va a poder eliminar/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Eliminar compra' })).toBeInTheDocument();
  });

  test('al eliminar vuelve al listado', async () => {
    axios.delete.mockResolvedValue({});
    const dialog = await openDialog();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar compra' }));

    expect(await screen.findByText('Listado de compras')).toBeInTheDocument();
    expect(screen.getByText('La compra se eliminó correctamente.')).toBeInTheDocument();
  });

  test('si un pago la cubre, muestra el motivo del backend y se queda en el detalle', async () => {
    const detail = 'No se puede eliminar la compra porque la cubre el pago N° 00000005. Editá el pago y destildá la compra para poder eliminarla.';
    axios.delete.mockRejectedValue({ response: { data: { detail } } });
    const dialog = await openDialog();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar compra' }));

    expect(await screen.findByText(detail)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByText('Listado de compras')).toBeNull();
  });
});
