import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import OwnCheckDetail from './OwnCheckDetail';
import { ownCheckUrl } from '../../../constants/urls';
import { ToastProvider } from '../../../context/ToastContext';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));

const CHECK = {
  id: 1,
  numero: 884,
  importe: '1000.00',
  banco: { descripcion: 'Galicia' },
  estado: 'EMITIDO',
  fecha_emision: '2026-10-01',
  fecha_deposito: null,
  fecha_vencimiento: '2027-01-01',
  supplier: { id: 7, nombre: 'Ricardo', puesto: 27 },
  payments: [{ id: 2, fecha_pago: '2026-10-28', tipo: 'COMPRA', compras: [{ id: 12, fecha: '2026-10-22' }], importe_abonado: '1000.00' }],
};

// isMobile: useMediaQuery('(max-width:600px)') lee matchMedia.
const setViewport = (mobile) => {
  window.matchMedia = (query) => ({ matches: mobile, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() });
};

beforeEach(() => setViewport(false));
afterEach(() => jest.clearAllMocks());

const renderDetail = (check) => {
  axios.get.mockResolvedValue({ data: check });
  render(
    <ToastProvider><MemoryRouter initialEntries={['/own-check/detail/1']}>
      <Routes>
        <Route path="/own-check/detail/:id" element={<OwnCheckDetail />} />
      </Routes>
    </MemoryRouter></ToastProvider>
  );
};

const actionButton = (name) => screen.queryByRole('button', { name: new RegExp(`^${name}$`) });

describe('desktop', () => {
  test('solo muestra Editar abajo y Volver arriba: Cobrar, Rechazar y Anular están en el listado', async () => {
    renderDetail(CHECK);
    await screen.findByText('Datos del Cheque');

    expect(actionButton('Editar')).toBeInTheDocument();
    ['Cobrar', 'Rechazado por el banco', 'Anular'].forEach((name) => expect(actionButton(name)).toBeNull());
    // Volver: arriba (PageHeader) y el de mobile, que en desktop queda oculto por CSS.
    expect(screen.getAllByRole('button', { name: /Volver/ })).toHaveLength(2);
  });

  test('un cheque que no está emitido no se edita', async () => {
    renderDetail({ ...CHECK, estado: 'COBRADO' });
    await screen.findByText('Datos del Cheque');

    expect(actionButton('Editar')).toBeNull();
  });
});

describe('mobile', () => {
  beforeEach(() => setViewport(true));

  test.each(['EMITIDO', 'COBRADO'])('un cheque %s con pagos se puede registrar como rechazado', async (estado) => {
    renderDetail({ ...CHECK, estado });
    await screen.findByText('Datos del Cheque');

    expect(actionButton('Rechazado por el banco')).toBeEnabled();
  });

  test.each(['ANULADO', 'RECHAZADO'])('un cheque %s no ofrece el rechazo', async (estado) => {
    renderDetail({ ...CHECK, estado });
    await screen.findByText('Datos del Cheque');

    expect(actionButton('Rechazado por el banco')).toBeDisabled();
  });

  test('un cheque sin pagos no ofrece el rechazo ni el cobro', async () => {
    renderDetail({ ...CHECK, supplier: null, payments: [] });
    await screen.findByText('Datos del Cheque');

    expect(actionButton('Rechazado por el banco')).toBeDisabled();
    expect(actionButton('Cobrar')).toBeDisabled();
  });

  test('el rechazo pide confirmación, explica el efecto y llama al backend', async () => {
    axios.post.mockResolvedValue({ data: {} });
    renderDetail(CHECK);
    await screen.findByText('Datos del Cheque');

    fireEvent.click(actionButton('Rechazado por el banco'));
    expect(await screen.findByText('Cada pago pierde lo que se pagó con este cheque.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar rechazo' }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(`${ownCheckUrl}1/reject/`));
    expect(await screen.findByText('Se registró el rechazo del cheque.')).toBeInTheDocument();
  });
});

test('un cheque rechazado muestra su estado', async () => {
  renderDetail({ ...CHECK, estado: 'RECHAZADO' });

  expect(await screen.findByText('Rechazado')).toBeInTheDocument();
});
