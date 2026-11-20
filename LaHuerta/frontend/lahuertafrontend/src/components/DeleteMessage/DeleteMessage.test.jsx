import React from 'react';
import { render, screen } from '@testing-library/react';
import DeleteMessage from './index';

test('muestra la frase, las consecuencias en el recuadro y la nota aparte', () => {
  render(<DeleteMessage summary="Vas a eliminar el pago." effects={['Sube la deuda.', { icon: <span>!</span>, text: 'Se elimina el cheque.' }]} note="Nota" />);

  expect(screen.getByText('Vas a eliminar el pago.')).toBeInTheDocument();
  const items = screen.getAllByRole('listitem');
  expect(items).toHaveLength(2);
  expect(items[1]).toHaveTextContent('Se elimina el cheque.');
  expect(screen.getByText('Nota')).toBeInTheDocument();
});

test('sin consecuencias no muestra el recuadro', () => {
  render(<DeleteMessage summary="Vas a eliminar el ítem." />);

  expect(screen.queryByRole('list')).toBeNull();
});
