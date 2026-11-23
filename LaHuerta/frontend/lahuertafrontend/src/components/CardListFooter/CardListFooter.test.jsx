import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CardListFooter from './index';

// CountUp consulta matchMedia (movimiento reducido) y jsdom no lo implementa.
beforeAll(() => {
  window.matchMedia = (query) => ({ matches: true, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() });
});

test('muestra Agregar con su data-tour y el total', () => {
  const onAdd = jest.fn();
  render(<CardListFooter addLabel="Agregar cheque" onAdd={onAdd} addDataTour="payment-add-check" totalLabel="TOTAL DEL PAGO" total={0} />);

  const add = screen.getByRole('button', { name: /Agregar cheque/ });
  expect(add).toHaveAttribute('data-tour', 'payment-add-check');
  fireEvent.click(add);
  expect(onAdd).toHaveBeenCalled();
  expect(screen.getByText('TOTAL DEL PAGO')).toBeInTheDocument();
});

test('sin onAdd no hay botón de agregar', () => {
  render(<CardListFooter addLabel="Agregar cheque" totalLabel="TOTAL DEL PAGO" total={0} />);

  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
