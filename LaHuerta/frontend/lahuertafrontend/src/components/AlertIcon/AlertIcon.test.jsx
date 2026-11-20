import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AlertIcon from './index';

test('se anuncia con el detalle del aviso y lo muestra al pasar el mouse', async () => {
  render(<AlertIcon title="El cheque de este pago fue rechazado." />);

  const icon = screen.getByRole('img', { name: 'El cheque de este pago fue rechazado.' });
  expect(icon).toHaveClass('text-red-500');

  await userEvent.hover(icon);
  expect(await screen.findByRole('tooltip')).toHaveTextContent('El cheque de este pago fue rechazado.');
});
