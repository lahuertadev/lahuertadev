import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import FormActions from './index';

beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() });
});

test('sin onBack no muestra Volver', () => {
  render(<FormActions onCancel={jest.fn()} onConfirm={jest.fn()} />);

  expect(screen.queryByRole('button', { name: /Volver/ })).not.toBeInTheDocument();
});

test('con onBack agrega Volver a lo ancho, solo en mobile', () => {
  const onBack = jest.fn();
  render(<FormActions onCancel={jest.fn()} onConfirm={jest.fn()} onBack={onBack} />);

  const back = screen.getByRole('button', { name: /Volver/ });
  fireEvent.click(back);

  expect(onBack).toHaveBeenCalled();
  expect(back).toHaveClass('w-full');
  expect(back.parentElement).toHaveClass('sm:hidden');
});
