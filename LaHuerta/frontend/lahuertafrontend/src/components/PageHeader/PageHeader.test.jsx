import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PageHeader from './index';

beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() });
});

const renderHeader = (onBack = jest.fn()) => {
  render(
    <MemoryRouter initialEntries={['/client-payment/create']}>
      <Routes>
        <Route
          path="/client-payment/create"
          element={(
            <PageHeader
              breadcrumbs={[{ label: 'Inicio', path: '/' }, { label: 'Pagos de Clientes', path: '/client-payment' }, { label: 'Nuevo' }]}
              onBack={onBack}
            />
          )}
        />
        <Route path="/client-payment" element={<div>Listado</div>} />
      </Routes>
    </MemoryRouter>,
  );
  return onBack;
};

test('muestra los breadcrumbs y navega con los que tienen ruta', () => {
  renderHeader();

  expect(screen.getByText('Nuevo')).toHaveClass('font-semibold');
  fireEvent.click(screen.getByText('Pagos de Clientes'));

  expect(screen.getByText('Listado')).toBeInTheDocument();
});

test('Volver llama a onBack y en mobile queda oculto', () => {
  const onBack = renderHeader();

  const back = screen.getByRole('button', { name: /Volver/ });
  fireEvent.click(back);

  expect(onBack).toHaveBeenCalled();
  expect(back.closest('div')).toHaveClass('hidden', 'sm:block');
});

test('un breadcrumb del medio sin ruta (sección del menú) se muestra como texto, sin link', () => {
  render(
    <MemoryRouter>
      <PageHeader breadcrumbs={[{ label: 'Inicio', path: '/' }, { label: 'Finanzas' }, { label: 'Gastos', path: '/expense' }, { label: '10/11/2026' }]} onBack={jest.fn()} />
    </MemoryRouter>,
  );

  expect(screen.getByText('Finanzas')).not.toHaveClass('cursor-pointer');
  expect(screen.getByText('Gastos')).toHaveClass('cursor-pointer');
});
