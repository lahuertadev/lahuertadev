import React from 'react';
import { render, screen } from '@testing-library/react';
import Grid from '.';

beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn(), addListener: jest.fn(), removeListener: jest.fn() });
});

const rows = [{ id: 1, name: 'Fila' }];
const columns = [{ field: 'name', headerName: 'Nombre' }];
const props = { rows, columns, onDetail: jest.fn(), onEdit: jest.fn(), onDelete: jest.fn(), multiSelect: false };

test('por defecto cada acción tiene su columna', () => {
  render(<Grid {...props} />);

  ['Detalle', 'Editar', 'Eliminar'].forEach((header) => expect(screen.getByText(header)).toBeInTheDocument());
  expect(screen.queryByText('Acción')).toBeNull();
});

test('con groupActions las acciones van juntas en la columna "Acción", con sus data-tour', () => {
  render(<Grid {...props} groupActions showEdit={false} />);

  expect(screen.getByText('Acción')).toBeInTheDocument();
  expect(screen.queryByText('Detalle')).toBeNull();
  expect(screen.queryByText('Eliminar')).toBeNull();
  const cell = document.querySelector('[data-field="actions"][role="gridcell"]');
  expect(cell.querySelector('[data-tour="grid-detail"]')).not.toBeNull();
  expect(cell.querySelector('[data-tour="grid-delete"]')).not.toBeNull();
  expect(cell.querySelector('[data-tour="grid-edit"]')).toBeNull();
});
