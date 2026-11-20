import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusBadge from './index';
import { BADGE_COLORS } from '../../constants/badgeColors';

test('cada tono usa su color base de la paleta', () => {
  render(
    <>
      <StatusBadge tone="danger" label="Rechazado" />
      <StatusBadge tone="warning" label="Parcial" />
      <StatusBadge tone="success" label="Abonado" />
    </>,
  );

  expect(screen.getByText('Rechazado')).toHaveStyle({ color: BADGE_COLORS.red.color, backgroundColor: BADGE_COLORS.red.bg });
  expect(screen.getByText('Parcial')).toHaveStyle({ color: BADGE_COLORS.yellow.color });
  expect(screen.getByText('Abonado')).toHaveStyle({ color: BADGE_COLORS.green.color });
});

test('por defecto usa el rojo', () => {
  render(<StatusBadge label="Pago anulado" />);

  expect(screen.getByText('Pago anulado')).toHaveStyle({ color: BADGE_COLORS.red.color });
});

test('muestra el ícono o emoji antes del texto, oculto para lectores de pantalla', () => {
  render(<StatusBadge tone="warning" label="Parcial" icon="⏳" />);

  const badge = screen.getByText('Parcial');
  expect(badge.firstChild).toHaveTextContent('⏳');
  expect(badge.firstChild).toHaveAttribute('aria-hidden', 'true');
});
