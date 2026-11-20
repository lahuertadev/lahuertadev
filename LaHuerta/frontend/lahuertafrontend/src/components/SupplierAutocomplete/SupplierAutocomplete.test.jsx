import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SupplierAutocomplete, { filterSuppliers } from '.';

const SUPPLIERS = [
  { id: 1, nombre: 'Salvita', puesto: 30, mercado: { descripcion: 'Central' } },
  { id: 2, nombre: 'Migogus', puesto: 12 },
  { id: 3, nombre: 'Frutas Ñandú', puesto: 120 },
];

const names = (inputValue) => filterSuppliers(SUPPLIERS, { inputValue }).map((supplier) => supplier.nombre);

describe('filterSuppliers', () => {
  test('sin texto devuelve todos', () => {
    expect(names('')).toEqual(['Salvita', 'Migogus', 'Frutas Ñandú']);
  });

  test('busca por parte del nombre sin distinguir mayúsculas ni acentos', () => {
    expect(names('SALV')).toEqual(['Salvita']);
    expect(names('nandu')).toEqual(['Frutas Ñandú']);
  });

  test('un número busca los puestos que empiezan con él', () => {
    expect(names('12')).toEqual(['Migogus', 'Frutas Ñandú']);
    expect(names('30')).toEqual(['Salvita']);
  });

  test('sin coincidencias devuelve vacío', () => {
    expect(names('Kona')).toEqual([]);
  });
});

test('muestra nombre, puesto y mercado, y devuelve el proveedor elegido', async () => {
  const onChange = jest.fn();
  render(<SupplierAutocomplete suppliers={SUPPLIERS} value={null} onChange={onChange} required />);

  const input = screen.getByPlaceholderText('Buscar por nombre o puesto...');
  expect(input).toHaveAttribute('aria-required', 'true');
  fireEvent.change(input, { target: { value: 'Salv' } });

  expect(await screen.findByText('Puesto 30 · Central')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('option', { name: /Salvita/ }));
  expect(onChange).toHaveBeenCalledWith(SUPPLIERS[0]);
});

test('el proveedor elegido se ve con su puesto', () => {
  render(<SupplierAutocomplete suppliers={SUPPLIERS} value={SUPPLIERS[1]} onChange={jest.fn()} />);

  expect(screen.getByPlaceholderText('Buscar por nombre o puesto...')).toHaveValue('Migogus — Puesto 12');
});
