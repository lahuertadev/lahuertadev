import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusBadge from './index';

test('muestra el texto con el color del tono', () => {
  render(<StatusBadge tone="success" label="Abonado" />);

  expect(screen.getByText('Abonado')).toHaveClass('text-green-700');
});

test('por defecto usa el rojo', () => {
  render(<StatusBadge label="Pago anulado" />);

  expect(screen.getByText('Pago anulado')).toHaveClass('text-red-600');
});

test('muestra el ícono o emoji antes del texto, oculto para lectores de pantalla', () => {
  render(<StatusBadge tone="warning" label="Parcial" icon="⏳" />);

  const badge = screen.getByText('Parcial');
  expect(badge).toHaveClass('text-amber-700');
  expect(badge.firstChild).toHaveTextContent('⏳');
  expect(badge.firstChild).toHaveAttribute('aria-hidden', 'true');
});

