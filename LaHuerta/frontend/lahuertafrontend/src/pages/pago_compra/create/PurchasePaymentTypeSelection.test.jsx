import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PurchasePaymentTypeSelection from './PurchasePaymentTypeSelection';

beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() });
});

test('ofrece el pago de compras y el pago a cuenta, marcados para el tutorial', () => {
  render(<MemoryRouter><PurchasePaymentTypeSelection /></MemoryRouter>);

  expect(screen.getByText('Pago de compras')).toBeInTheDocument();
  expect(screen.getByText('Pago a cuenta')).toBeInTheDocument();
  expect(document.querySelector('[data-tour="payment-kind-purchase"]')).not.toBeNull();
  expect(document.querySelector('[data-tour="payment-kind-on-account"]')).not.toBeNull();
});
