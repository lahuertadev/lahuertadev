import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import EditButton from './index';

// SpotlightButton consulta matchMedia para el efecto de luz.
beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() });
});

test('muestra "Editar" por defecto y llama a onClick', () => {
  const onClick = jest.fn();
  render(<EditButton onClick={onClick} />);

  fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

  expect(onClick).toHaveBeenCalled();
});

test('acepta un texto propio', () => {
  render(<EditButton onClick={jest.fn()} label="Editar cliente" />);

  expect(screen.getByRole('button', { name: 'Editar cliente' })).toBeInTheDocument();
});
