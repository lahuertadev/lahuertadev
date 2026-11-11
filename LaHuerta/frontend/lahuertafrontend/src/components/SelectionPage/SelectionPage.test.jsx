import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SelectionPage from '.';

// jsdom no implementa matchMedia (lo usa useSpotlight de SpotlightButton).
beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() });
});

const renderPage = (onBack = jest.fn()) =>
  render(
    <SelectionPage section="Compras" title="Nueva compra" subtitle="¿Qué tipo de carga querés realizar?" onBack={onBack}>
      <div>Carga simple</div>
    </SelectionPage>
  );

test('muestra la sección, el título, la pregunta y las opciones', () => {
  renderPage();

  expect(screen.getByText('Compras')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Nueva compra' })).toBeInTheDocument();
  expect(screen.getByText('¿Qué tipo de carga querés realizar?')).toBeInTheDocument();
  expect(screen.getByText('Carga simple')).toBeInTheDocument();
});

test('tiene Volver arriba (desktop) y abajo de las opciones (mobile), y los dos vuelven', () => {
  const onBack = jest.fn();
  renderPage(onBack);

  const backButtons = screen.getAllByRole('button', { name: 'Volver' });
  expect(backButtons).toHaveLength(2);
  expect(backButtons[0].parentElement).toHaveClass('hidden', 'sm:block');
  expect(backButtons[1].parentElement).toHaveClass('sm:hidden');

  backButtons.forEach((button) => fireEvent.click(button));
  expect(onBack).toHaveBeenCalledTimes(2);
});
