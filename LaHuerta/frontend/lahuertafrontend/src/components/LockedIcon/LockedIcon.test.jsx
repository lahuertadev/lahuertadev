import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LockedIcon from './index';

test('se anuncia con el motivo, es rojo y lo muestra al pasar el mouse', async () => {
  render(<LockedIcon title="Endosado a un proveedor: no se puede modificar ni quitar." />);

  const icon = screen.getByRole('img', { name: 'Endosado a un proveedor: no se puede modificar ni quitar.' });
  expect(icon).toHaveClass('text-required');

  await userEvent.hover(icon);
  expect(await screen.findByRole('tooltip')).toHaveTextContent('Endosado a un proveedor: no se puede modificar ni quitar.');
});
