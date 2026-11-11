import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

describe('acciones no permitidas en la fila', () => {
  const twoRows = [{ id: 1, name: 'Editable' }, { id: 2, name: 'Bloqueada' }];
  const actionsCell = (id) => document.querySelector(`[data-id="${id}"] [data-field="actions"]`);

  test('el botón queda en su lugar, grisado, sin acción y sin data-tour', () => {
    const onEdit = jest.fn();
    render(<Grid {...props} rows={twoRows} onEdit={onEdit} groupActions canEdit={(row) => row.id === 1} />);

    // Misma cantidad de botones en las dos filas: los íconos quedan alineados.
    expect(actionsCell(1).querySelectorAll('button')).toHaveLength(3);
    expect(actionsCell(2).querySelectorAll('button')).toHaveLength(3);

    expect(actionsCell(1).querySelector('[data-tour="grid-edit"]')).not.toBeNull();
    expect(actionsCell(2).querySelector('[data-tour="grid-edit"]')).toBeNull();

    const disabledButton = actionsCell(2).querySelector('button:disabled');
    expect(disabledButton).not.toBeNull();
    fireEvent.click(disabledButton);
    expect(onEdit).not.toHaveBeenCalled();
  });

  test('el tooltip del botón grisado muestra el motivo', async () => {
    render(
      <Grid
        {...props}
        rows={twoRows}
        groupActions
        canDelete={(row) => row.id === 1}
        deleteDisabledReason={(row) => `No se puede eliminar ${row.name}`}
      />
    );

    fireEvent.mouseOver(actionsCell(2).querySelector('button:disabled').parentElement);
    expect(await screen.findByText('No se puede eliminar Bloqueada')).toBeInTheDocument();
  });

  test('sin motivo indicado usa el texto por defecto', async () => {
    render(<Grid {...props} rows={twoRows} canEdit={(row) => row.id === 1} />);

    fireEvent.mouseOver(document.querySelector('[data-id="2"] [data-field="edit"] button:disabled').parentElement);
    expect(await screen.findByText('No se puede editar')).toBeInTheDocument();
  });
});
