import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import BlockIcon from '@mui/icons-material/Block';
import DeleteButton from './index';

// SpotlightButton consulta matchMedia para el efecto de luz.
beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() });
});

test('muestra "Eliminar" con el tacho por defecto y llama a onClick', () => {
  const onClick = jest.fn();
  render(<DeleteButton onClick={onClick} />);

  fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

  expect(onClick).toHaveBeenCalled();
  expect(screen.getByTestId('DeleteOutlineIcon')).toBeInTheDocument();
});

test('acepta un texto y un ícono propios (ej. Anular)', () => {
  render(<DeleteButton onClick={jest.fn()} label="Anular" icon={BlockIcon} />);

  expect(screen.getByRole('button', { name: 'Anular' })).toBeInTheDocument();
  expect(screen.getByTestId('BlockIcon')).toBeInTheDocument();
});
