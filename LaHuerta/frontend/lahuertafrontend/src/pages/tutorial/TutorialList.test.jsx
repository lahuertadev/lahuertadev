import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TutorialList from './TutorialList';
import { useTutorial } from '../../context/TutorialContext';

jest.mock('../../context/TutorialContext', () => ({ useTutorial: jest.fn() }));

// En el orden en que vienen del backend (campo orden).
const tutorials = [
  { key: 'clients', title: 'Clientes', description: 'Alta de clientes', section: 'Clientes', steps: [] },
  { key: 'purchases', title: 'Compras', description: 'Cargar compras', section: 'Proveedores', steps: [] },
  { key: 'bills', title: 'Facturación', description: 'Facturar', section: 'Clientes', steps: [] },
];

// jsdom no implementa matchMedia (lo usa useSpotlight de SpotlightButton).
beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() });
});

const renderList = ({ startTutorial = jest.fn(), progress = {} } = {}) => {
  useTutorial.mockReturnValue({ tutorials, progress, startTutorial });
  render(<MemoryRouter><TutorialList /></MemoryRouter>);
  return { startTutorial };
};

test('agrupa los tutoriales por sección, en el orden en que vienen', () => {
  renderList();

  const headings = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
  expect(headings).toEqual(['Clientes', 'Proveedores']);
  const titles = screen.getAllByRole('listitem').map((item) => within(item).getAllByText(/./)[0].textContent);
  expect(titles).toEqual(['Clientes', 'Facturación', 'Compras']);
});

test('"Empezar" arranca el tutorial elegido', () => {
  const { startTutorial } = renderList({ progress: { clients: 'completado' } });

  // Clientes ya está completado ("Repetir"): el primer "Empezar" es el de Facturación.
  fireEvent.click(screen.getAllByText('Empezar')[0]);

  expect(startTutorial).toHaveBeenCalledWith('bills');
  expect(screen.getByText('Repetir')).toBeInTheDocument();
});
