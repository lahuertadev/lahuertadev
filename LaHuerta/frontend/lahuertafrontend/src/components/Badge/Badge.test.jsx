import React from 'react';
import { render, screen } from '@testing-library/react';
import Badge from './index';
import { BADGE_COLORS } from '../../constants/badgeColors';

test('usa el color de la paleta', () => {
  render(<Badge color="violet" label="Cheque Propio" />);

  expect(screen.getByText('Cheque Propio')).toHaveStyle({ backgroundColor: BADGE_COLORS.violet.bg, color: BADGE_COLORS.violet.color });
});

test('con un color que no existe usa el gris', () => {
  render(<Badge color="fucsia" label="Otro" />);

  expect(screen.getByText('Otro')).toHaveStyle({ color: BADGE_COLORS.gray.color });
});

test('muestra lo que se le pase después del texto', () => {
  render(<Badge color="blue" label="Cheque"><span>!</span></Badge>);

  expect(screen.getByText('Cheque')).toHaveTextContent('Cheque!');
});
