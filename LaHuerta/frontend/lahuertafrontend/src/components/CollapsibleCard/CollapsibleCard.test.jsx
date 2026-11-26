import React from 'react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import CollapsibleCard, { useCollapsedKeys } from './index';

const renderCard = (props = {}) => render(
  <CollapsibleCard position={2} title="Cheque N° 111" subtitle="Banco Galicia" amount="$ 1.000,00" itemLabel="cheque" {...props}>
    <p>Contenido</p>
  </CollapsibleCard>
);

test('muestra la posición, el título, el subtítulo y el importe', () => {
  renderCard();

  expect(screen.getByText('2')).toBeInTheDocument();
  expect(screen.getByText('Cheque N° 111')).toBeInTheDocument();
  expect(screen.getByText('Banco Galicia')).toBeInTheDocument();
  expect(screen.getByText('$ 1.000,00')).toBeInTheDocument();
});

test('sin título muestra el placeholder', () => {
  renderCard({ title: undefined, placeholder: 'Elegí un cheque' });

  expect(screen.getByText('Elegí un cheque')).toBeInTheDocument();
});

test('los botones de expandir y quitar usan el nombre del ítem y llaman a sus acciones', () => {
  const onToggle = jest.fn();
  const onRemove = jest.fn();
  renderCard({ collapsed: true, onToggle, onRemove });

  fireEvent.click(screen.getByRole('button', { name: 'Expandir cheque' }));
  fireEvent.click(screen.getByRole('button', { name: 'Quitar cheque' }));

  expect(onToggle).toHaveBeenCalled();
  expect(onRemove).toHaveBeenCalled();
});

test('sin onToggle ni onRemove no hay botones', () => {
  renderCard();

  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

test('useCollapsedKeys compacta, expande y alterna por key', () => {
  const { result } = renderHook(() => useCollapsedKeys());

  act(() => result.current.collapseOnly([1, 2]));
  expect(result.current.isCollapsed(1)).toBe(true);
  expect(result.current.isCollapsed(3)).toBe(false);

  act(() => result.current.toggle(1));
  expect(result.current.isCollapsed(1)).toBe(false);

  act(() => result.current.expand([2]));
  expect(result.current.isCollapsed(2)).toBe(false);
});
