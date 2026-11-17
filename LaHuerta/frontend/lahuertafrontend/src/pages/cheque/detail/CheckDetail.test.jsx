import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import CheckDetail from './CheckDetail';
import { BADGE_COLORS } from '../../../constants/badgeColors';

jest.mock('axios', () => ({ get: jest.fn() }));

const CHECK = {
  id: 31,
  numero: 171717,
  importe: '2000000.00',
  banco: { descripcion: 'Banco Galicia' },
  estado: { descripcion: 'RECHAZADO' },
  fecha_emision: '2026-11-10',
  fecha_deposito: null,
  endosado: false,
  cliente: null,
  pago_compra: null,
};

beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() });
});

const renderDetail = () => {
  axios.get.mockResolvedValue({ data: CHECK });
  render(
    <MemoryRouter initialEntries={['/check/detail/31']}>
      <Routes>
        <Route path="/check/detail/:id" element={<CheckDetail />} />
        <Route path="/check" element={<div>Listado</div>} />
      </Routes>
    </MemoryRouter>,
  );
};

test('muestra el estado con la etiqueta de la paleta', async () => {
  renderDetail();

  expect(await screen.findByText('Rechazado')).toHaveStyle({ color: BADGE_COLORS.red.color });
});

test('tiene Volver arriba (desktop) y abajo (mobile), que vuelven al listado', async () => {
  renderDetail();

  const backButtons = await screen.findAllByRole('button', { name: /Volver/ });
  expect(backButtons).toHaveLength(2);
  fireEvent.click(backButtons[1]);

  expect(await screen.findByText('Listado')).toBeInTheDocument();
});
