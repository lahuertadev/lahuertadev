import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NewsPanel from '.';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const makeNews = (id, overrides = {}) => ({
  id,
  titulo: `Novedad ${id}`,
  descripcion: `Descripción ${id}`,
  fecha_publicacion: '2026-10-26',
  pantalla_nombre: 'Facturación',
  pantalla_url: '/bill/',
  ...overrides,
});

const renderPanel = (props) => render(
  <MemoryRouter>
    <NewsPanel historyUrl="/news" onDismiss={jest.fn().mockResolvedValue()} {...props} />
  </MemoryRouter>,
);

// jsdom no implementa matchMedia (lo usa useSpotlight de SpotlightButton).
beforeAll(() => {
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() });
});

beforeEach(() => {
  mockNavigate.mockClear();
  jest.useFakeTimers();
});

afterEach(() => jest.useRealTimers());

// Los textos entran palabra por palabra (un span por palabra): se busca el párrafo completo.
const paragraph = (text) => (_, element) => element.tagName === 'P' && element.textContent === text;

// Espera a que termine el desenfoque de salida antes de mostrar la siguiente novedad.
const finishTransition = async () => {
  await act(async () => { jest.runAllTimers(); });
};

test('no se muestra si no hay novedades', () => {
  const { container } = renderPanel({ news: [] });
  expect(container).toBeEmptyDOMElement();
});

test('muestra como máximo 3 novedades', () => {
  renderPanel({ news: [makeNews(1), makeNews(2), makeNews(3), makeNews(4)] });

  expect(screen.getByText('1 de 3')).toBeInTheDocument();
  expect(screen.queryByText(paragraph('Novedad 4'))).not.toBeInTheDocument();
});

test('con una sola novedad no muestra flechas ni contador', () => {
  renderPanel({ news: [makeNews(1)] });

  expect(screen.getByText(paragraph('Novedad 1'))).toBeInTheDocument();
  expect(screen.queryByLabelText('Novedad siguiente')).not.toBeInTheDocument();
  expect(screen.queryByText('1 de 1')).not.toBeInTheDocument();
});

test('las flechas cambian de novedad y vuelven a la primera al final', async () => {
  renderPanel({ news: [makeNews(1), makeNews(2)] });

  fireEvent.click(screen.getByLabelText('Novedad siguiente'));
  await finishTransition();
  expect(screen.getByText('2 de 2')).toBeInTheDocument();
  expect(screen.getByText(paragraph('Novedad 2'))).toBeInTheDocument();

  fireEvent.click(screen.getByLabelText('Novedad siguiente'));
  await finishTransition();
  expect(screen.getByText('1 de 2')).toBeInTheDocument();

  fireEvent.click(screen.getByLabelText('Novedad anterior'));
  await finishTransition();
  expect(screen.getByText('2 de 2')).toBeInTheDocument();
});

test('muestra una sola novedad a la vez', () => {
  renderPanel({ news: [makeNews(1), makeNews(2)] });

  expect(screen.getByText(paragraph('Novedad 1'))).toBeInTheDocument();
  expect(screen.queryByText(paragraph('Novedad 2'))).not.toBeInTheDocument();
});

test('al terminar la barra de progreso pasa sola a la siguiente', async () => {
  const { container } = renderPanel({ news: [makeNews(1), makeNews(2)] });

  fireEvent.animationEnd(container.querySelector('[aria-current="true"] span'));
  await finishTransition();

  expect(screen.getByText('2 de 2')).toBeInTheDocument();
});

test('"Entendido" llama a onDismiss con la novedad', async () => {
  const onDismiss = jest.fn().mockResolvedValue();
  const news = [makeNews(1), makeNews(2)];
  renderPanel({ news, onDismiss });

  fireEvent.click(screen.getByText('Entendido'));
  await finishTransition();

  expect(onDismiss).toHaveBeenCalledWith(news[0]);
});

test('"Ir a" navega a la pantalla de la novedad', () => {
  renderPanel({ news: [makeNews(1)] });

  fireEvent.click(screen.getByText('Ir a Facturación'));

  expect(mockNavigate).toHaveBeenCalledWith('/bill/');
});

test('sin pantalla no muestra "Ir a"', () => {
  renderPanel({ news: [makeNews(1, { pantalla_nombre: null, pantalla_url: null })] });

  expect(screen.queryByText(/^Ir a/)).not.toBeInTheDocument();
});

test('"Ver todas las novedades" lleva al historial', () => {
  renderPanel({ news: [makeNews(1)] });

  fireEvent.click(screen.getAllByText('Ver todas las novedades')[0]);

  expect(mockNavigate).toHaveBeenCalledWith('/news');
});

test('con tutorial disponible muestra "Ver tutorial" y lo empieza', () => {
  const onStartTutorial = jest.fn();
  renderPanel({
    news: [makeNews(1, { tutorial_clave: 'client-without-price-list' })],
    canStartTutorial: (key) => key === 'client-without-price-list',
    onStartTutorial,
  });

  fireEvent.click(screen.getByText('Ver tutorial'));

  expect(onStartTutorial).toHaveBeenCalledWith('client-without-price-list');
});

test('no ofrece el tutorial si ya lo completó o no es para su rol', () => {
  renderPanel({
    news: [makeNews(1, { tutorial_clave: 'client-without-price-list' })],
    canStartTutorial: () => false,
    onStartTutorial: jest.fn(),
  });

  expect(screen.queryByText('Ver tutorial')).not.toBeInTheDocument();
});

test('sin tutorial_clave no muestra "Ver tutorial"', () => {
  renderPanel({ news: [makeNews(1)], canStartTutorial: () => true, onStartTutorial: jest.fn() });

  expect(screen.queryByText('Ver tutorial')).not.toBeInTheDocument();
});
