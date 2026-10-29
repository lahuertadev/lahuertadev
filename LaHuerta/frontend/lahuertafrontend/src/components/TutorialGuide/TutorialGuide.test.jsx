/* eslint-disable testing-library/no-node-access -- el guía lee y resalta el DOM real: los tests lo arman y modifican directamente. */
import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { driver } from 'driver.js';
import TutorialGuide from '.';
import { useTutorial } from '../../context/TutorialContext';
import { emitTutorialEvent } from '../../utils/tutorial';

jest.mock('driver.js', () => ({ driver: jest.fn() }));
jest.mock('../../context/TutorialContext', () => ({ useTutorial: jest.fn() }));

const steps = [
  { path: '/client', target: 'list-add', title: 'Nuevo', description: '', advance: { route: '/client/create' } },
  { path: '/client/create', target: 'name', title: 'Nombre', description: '', advance: { check: 'filled', confirm: true } },
  { path: '/client/create', target: 'province', title: 'Provincia', description: '', advance: { check: 'filled' } },
  { path: '/client/create', target: 'price-list', title: 'Lista', description: '', optional: true, advance: { check: 'filled' } },
  { path: '/client/create', target: 'save', title: 'Guardar', description: '', advance: { event: 'client-created' } },
  { path: '/client', target: 'grid-delete', title: 'Eliminar', description: '', readOnly: true, advance: { next: true } },
];

let highlight;
let actions;
let navigateTo;

// Expone navigate para simular la navegación que hace la pantalla después de guardar.
const NavigateProbe = () => {
  navigateTo = useNavigate();
  return null;
};

const renderGuide = (pathname, stepIndex, markup = '', { revisiting = false, tutorialSteps = steps } = {}) => {
  document.body.innerHTML = markup;
  actions = {
    goToStep: jest.fn(),
    finishTutorial: jest.fn(),
    exitTutorial: jest.fn(),
  };
  useTutorial.mockReturnValue({
    session: { key: 'demo', stepIndex, isMobile: false, revisiting },
    activeTutorial: { key: 'demo', title: 'Clientes', steps: tutorialSteps },
    activeSteps: tutorialSteps,
    ...actions,
  });
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <TutorialGuide />
      <NavigateProbe />
    </MemoryRouter>,
    { container },
  );
};

const lastCall = () => highlight.mock.calls[highlight.mock.calls.length - 1][0];
const lastPopover = () => lastCall().popover;

// jsdom no implementa scrollIntoView (el guía centra cada elemento antes de resaltarlo).
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.useFakeTimers();
  highlight = jest.fn();
  driver.mockReturnValue({ highlight, destroy: jest.fn(), refresh: jest.fn() });
});

afterEach(() => {
  cleanup();
  jest.useRealTimers();
});

test('avanza cuando el usuario llega a la ruta que pide el paso', () => {
  renderGuide('/client/create', 0);

  expect(actions.goToStep).toHaveBeenCalledWith(1);
});

test('resalta el elemento del paso con su texto', () => {
  renderGuide('/client', 0, '<button data-tour="list-add">Nuevo</button>');

  expect(lastCall().element).toBe(document.querySelector('[data-tour="list-add"]'));
  expect(lastPopover().title).toBe('Nuevo');
});

test('con confirm, "Continuar" solo avanza si el campo está completo', () => {
  renderGuide('/client/create', 1, '<div data-tour="name"><input value="" /></div>');

  lastPopover().onNextClick();
  expect(actions.goToStep).not.toHaveBeenCalled();

  document.querySelector('input').value = 'La Huerta';
  lastPopover().onNextClick();
  expect(actions.goToStep).toHaveBeenCalledWith(2);
});

test('sin confirm, avanza solo al elegir una opción', () => {
  renderGuide('/client/create', 2, '<div data-tour="province"><select><option value="">-</option><option value="1">BA</option></select></div>');
  expect(actions.goToStep).not.toHaveBeenCalled();

  document.querySelector('select').value = '1';
  act(() => { jest.advanceTimersByTime(400); });

  expect(actions.goToStep).toHaveBeenCalledWith(3);
});

test('un paso opcional sin elemento se saltea', () => {
  renderGuide('/client/create', 3);

  act(() => { jest.advanceTimersByTime(700); });

  expect(actions.goToStep).toHaveBeenCalledWith(4);
  expect(highlight).not.toHaveBeenCalled();
});

test('avanza con el evento de guardado exitoso y no con otro', () => {
  renderGuide('/client/create', 4, '<button data-tour="save">Guardar</button>');

  act(() => emitTutorialEvent('otro-evento'));
  expect(actions.goToStep).not.toHaveBeenCalled();

  act(() => emitTutorialEvent('client-created'));
  expect(actions.goToStep).toHaveBeenCalledWith(5);
});

test('después de guardar espera la navegación de la pantalla en vez de volver atrás', () => {
  renderGuide('/client/create', 4, '<button data-tour="save">Guardar</button>');
  useTutorial.mockReturnValue({ ...useTutorial(), session: { key: 'demo', stepIndex: 5, isMobile: false } });

  // El paso 5 es del listado, pero la pantalla todavía no navegó.
  act(() => emitTutorialEvent('client-created'));
  act(() => navigateTo('/client/create'));
  expect(actions.goToStep).not.toHaveBeenCalledWith(1);

  document.body.insertAdjacentHTML('afterbegin', '<button data-tour="grid-delete">Eliminar</button>');
  act(() => navigateTo('/client'));

  expect(actions.goToStep).not.toHaveBeenCalledWith(0);
  expect(lastPopover().title).toBe('Eliminar');
});

test('después de crear, resalta la fila del registro creado', () => {
  renderGuide('/client/create', 4, '<button data-tour="save">Guardar</button>');
  useTutorial.mockReturnValue({ ...useTutorial(), session: { key: 'demo', stepIndex: 5, isMobile: false } });

  act(() => emitTutorialEvent('client-created', { id: 42 }));
  document.body.insertAdjacentHTML(
    'afterbegin',
    '<button data-tour="grid-delete" data-tour-row="1">Otro</button><button data-tour="grid-delete" data-tour-row="42">Creado</button>',
  );
  act(() => navigateTo('/client'));

  expect(lastCall().element.textContent).toBe('Creado');
});

test('un paso de recorrido se sigue con "Terminar" en el último y no deja tocar el elemento', () => {
  renderGuide('/client', 5, '<button data-tour="grid-delete">Eliminar</button>');

  expect(lastCall().disableActiveInteraction).toBe(true);
  expect(lastPopover().nextBtnText).toBe('Terminar');

  lastPopover().onNextClick();
  expect(actions.finishTutorial).toHaveBeenCalled();
});

test('si vuelve a una pantalla anterior del tutorial, retoma desde su primer paso', () => {
  renderGuide('/client/create', 2, '<div data-tour="province"><select><option value="">-</option></select></div>');

  act(() => navigateTo('/client'));

  expect(actions.goToStep).toHaveBeenCalledWith(0);
});

test('en una pantalla ajena al tutorial queda en pausa con la opción de salir', () => {
  renderGuide('/client/create', 2, '<div data-tour="province"><select><option value="">-</option></select></div>');

  act(() => navigateTo('/bill'));

  expect(lastPopover().title).toBe('Tutorial en pausa');
  lastPopover().onPrevClick();
  expect(actions.exitTutorial).toHaveBeenCalled();
});

test('si el elemento no aparece, muestra el paso en un globo centrado', () => {
  renderGuide('/client/create', 1);
  expect(highlight).not.toHaveBeenCalled();

  act(() => { jest.advanceTimersByTime(2000); });

  expect(lastCall().element).toBeUndefined();
  expect(lastPopover().title).toBe('Nombre');
});

// Arma el globo como lo haría driver.js y devuelve el botón "<" (o null).
const renderedBackButton = () => {
  const footerButtons = document.createElement('div');
  const nextButton = document.createElement('button');
  footerButtons.appendChild(nextButton);
  const popover = { progress: document.createElement('span'), footerButtons, nextButton };
  lastPopover().onPopoverRender(popover);
  return footerButtons.querySelector('.driver-popover-back-btn');
};

test('"<" vuelve al paso anterior de la misma pantalla y lo marca como revisitado', () => {
  renderGuide('/client/create', 2, '<div data-tour="name"><input value="La Huerta" /></div><div data-tour="province"><select><option value="">-</option></select></div>');

  const back = renderedBackButton();
  expect(back.getAttribute('aria-label')).toBe('Paso anterior');
  back.click();

  expect(actions.goToStep).toHaveBeenCalledWith(1, { revisiting: true });
});

test('sin "<" en el primer paso de la pantalla (volver a otra perdería lo cargado)', () => {
  renderGuide('/client/create', 1, '<div data-tour="name"><input value="" /></div>');

  expect(renderedBackButton()).toBeNull();
});

test('"<" saltea los pasos opcionales cuyo elemento no está', () => {
  renderGuide('/client/create', 4, '<div data-tour="province"><select><option value="1">BA</option></select></div><button data-tour="save">Guardar</button>');

  renderedBackButton().click();

  expect(actions.goToStep).toHaveBeenCalledWith(2, { revisiting: true });
});

test('al revisitar un paso que avanza solo, espera ">" aunque ya esté completo', () => {
  renderGuide('/client/create', 2, '<div data-tour="province"><select><option value="1">BA</option></select></div>', { revisiting: true });

  act(() => { jest.advanceTimersByTime(400); });
  expect(actions.goToStep).not.toHaveBeenCalled();
  expect(lastPopover().nextBtnText).toContain('<svg');

  lastPopover().onNextClick();
  expect(actions.goToStep).toHaveBeenCalledWith(3);
});

test('un paso opcional que espera las filas del listado no se saltea mientras cargan', () => {
  const listSteps = [
    { path: '/client', target: 'grid-edit', title: 'Editar', description: '', optional: true, readyWhen: 'grid-row', advance: { next: true } },
    { path: '/client', target: 'grid-delete', title: 'Eliminar', description: '', advance: { next: true } },
  ];
  renderGuide('/client', 0, '', { tutorialSteps: listSteps });

  act(() => { jest.advanceTimersByTime(1000); });
  expect(actions.goToStep).not.toHaveBeenCalled();

  // Cargaron las filas: la del ejemplo no se puede editar, así que el paso se saltea.
  document.body.insertAdjacentHTML('afterbegin', '<div data-tour="grid-row"></div>');
  act(() => { jest.advanceTimersByTime(400); });
  expect(actions.goToStep).toHaveBeenCalledWith(1);
});
