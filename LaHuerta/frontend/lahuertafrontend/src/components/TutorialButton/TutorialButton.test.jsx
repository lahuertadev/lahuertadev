import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TutorialButton from '.';
import { useTutorial } from '../../context/TutorialContext';

jest.mock('../../context/TutorialContext', () => ({ useTutorial: jest.fn() }));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const tutorials = [
  { key: 'bills', title: 'Facturación', description: 'Facturar', steps: [{ path: '/bill' }, { path: '/bill/create' }] },
  { key: 'clients', title: 'Clientes', description: 'Alta', steps: [{ path: '/client' }, { path: '/client/create' }] },
];

const renderButton = ({ pathname = '/client', progress = {}, session = null, startTutorial = jest.fn() } = {}) => {
  useTutorial.mockReturnValue({ tutorials, progress, session, startTutorial });
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <TutorialButton />
    </MemoryRouter>,
  );
  return { startTutorial };
};

// jsdom no implementa matchMedia (lo usa useSpotlight de SpotlightButton).
beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() });
});

beforeEach(() => mockNavigate.mockClear());

test('muestra solo el tutorial de la pantalla actual', () => {
  renderButton({ pathname: '/client/create' });

  fireEvent.click(screen.getByLabelText('Tutoriales'));

  expect(screen.getByText('Clientes')).toBeInTheDocument();
  expect(screen.queryByText('Facturación')).not.toBeInTheDocument();
});

test('no aparece en una pantalla sin tutorial', () => {
  renderButton({ pathname: '/' });

  expect(screen.queryByLabelText('Tutoriales')).not.toBeInTheDocument();
});

test('muestra el estado y "Repetir" si ya lo completó', () => {
  renderButton({ progress: { clients: 'completado' } });

  fireEvent.click(screen.getByLabelText('Tutoriales'));

  expect(screen.getByText('Completado')).toBeInTheDocument();
  expect(screen.getByText('Repetir')).toBeInTheDocument();
});

test('"Empezar" inicia el tutorial y cierra el panel', () => {
  const { startTutorial } = renderButton({ pathname: '/bill' });

  fireEvent.click(screen.getByLabelText('Tutoriales'));
  fireEvent.click(screen.getByText('Empezar'));

  expect(startTutorial).toHaveBeenCalledWith('bills');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('"Ver todos los tutoriales" lleva a la sección Tutoriales', () => {
  renderButton();

  fireEvent.click(screen.getByLabelText('Tutoriales'));
  fireEvent.click(screen.getByText('Ver todos los tutoriales'));

  expect(mockNavigate).toHaveBeenCalledWith('/tutorials');
});

test('no se muestra mientras hay un tutorial en curso', () => {
  renderButton({ session: { key: 'clients', stepIndex: 0, isMobile: false } });

  expect(screen.queryByLabelText('Tutoriales')).not.toBeInTheDocument();
});

test('un tutorial que nunca empezó figura como "Pendiente"', () => {
  renderButton();

  fireEvent.click(screen.getByLabelText('Tutoriales'));

  expect(screen.getByText('Pendiente')).toBeInTheDocument();
});
