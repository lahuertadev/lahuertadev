import { emitTutorialEvent, fieldValue, isTutorialOnScreen, mapTutorial, matchesPath, resumeStepIndex, STEP_CHECKS, tutorialSteps } from './tutorial';
import { TUTORIAL_EVENT_NAME } from '../constants/tutorials';

const html = (markup) => {
  const container = document.createElement('div');
  container.innerHTML = markup;
  return container.firstElementChild;
};

describe('matchesPath', () => {
  test('coincide con la ruta exacta, con o sin barra final', () => {
    expect(matchesPath('/client', '/client')).toBe(true);
    expect(matchesPath('/client', '/client/')).toBe(true);
  });

  test('no coincide con subrutas', () => {
    expect(matchesPath('/client', '/client/create')).toBe(false);
  });

  test('admite parámetros', () => {
    expect(matchesPath('/client/edit/:id', '/client/edit/7')).toBe(true);
  });
});

describe('isTutorialOnScreen', () => {
  const tutorial = { steps: [{ path: '/client' }, { path: '/client/create' }] };

  test('es de la pantalla si algún paso es en esa ruta', () => {
    expect(isTutorialOnScreen(tutorial, '/client/create')).toBe(true);
    expect(isTutorialOnScreen(tutorial, '/bill')).toBe(false);
  });
});

describe('tutorialSteps', () => {
  const tutorial = { steps: [{ target: 'todos' }, { target: 'acciones', media: 'desktop' }, { target: 'fila', media: 'mobile' }] };

  test('en escritorio saca los pasos de mobile y viceversa', () => {
    expect(tutorialSteps(tutorial, false).map((step) => step.target)).toEqual(['todos', 'acciones']);
    expect(tutorialSteps(tutorial, true).map((step) => step.target)).toEqual(['todos', 'fila']);
  });
});

describe('emitTutorialEvent', () => {
  test('dispara el evento con el nombre y el id creado en detail', () => {
    const listener = jest.fn();
    window.addEventListener(TUTORIAL_EVENT_NAME, listener);

    emitTutorialEvent('client-created', { id: 7 });

    expect(listener.mock.calls[0][0].detail).toEqual({ name: 'client-created', id: 7 });
    window.removeEventListener(TUTORIAL_EVENT_NAME, listener);
  });
});

describe('fieldValue y STEP_CHECKS', () => {
  test('filled: el campo dentro del contenedor tiene valor', () => {
    expect(STEP_CHECKS.filled(html('<div><label>CUIT</label><input value="20-1" /></div>'))).toBe(true);
    expect(STEP_CHECKS.filled(html('<div><input value="  " /></div>'))).toBe(false);
  });

  test('filled: un select con la opción vacía no cuenta', () => {
    const element = html('<div><select><option value="">Seleccionar...</option><option value="1">BA</option></select></div>');
    expect(STEP_CHECKS.filled(element)).toBe(false);
    element.querySelector('select').value = '1';
    expect(STEP_CHECKS.filled(element)).toBe(true);
  });

  test('fieldValue ignora checkboxes e inputs ocultos', () => {
    expect(fieldValue(html('<div><input type="hidden" value="x" /><input type="checkbox" /><input value="ok" /></div>'))).toBe('ok');
  });

  test('date: solo una fecha completa, no la máscara vacía', () => {
    expect(STEP_CHECKS.date(html('<div><input value="DD/MM/YYYY" /></div>'))).toBe(false);
    expect(STEP_CHECKS.date(html('<div><input value="26/10/2026" /></div>'))).toBe(true);
  });

  test('complete: lee data-tour-complete', () => {
    expect(STEP_CHECKS.complete(html('<div data-tour-complete="true"></div>'))).toBe(true);
    expect(STEP_CHECKS.complete(html('<div data-tour-complete="false"></div>'))).toBe(false);
  });
});

describe('mapTutorial', () => {
  const step = (overrides) => ({
    orden: 1, ruta: '/client', elemento: 'list-add', titulo: 'Paso', descripcion: 'Texto',
    avance: 'next', ruta_destino: null, evento: null, condicion: null, confirmar: false,
    opcional: false, solo_lectura: false, listo_cuando: null, dispositivo: null,
    ...overrides,
  });

  const tutorial = mapTutorial({
    clave: 'clients',
    titulo: 'Clientes',
    descripcion: 'Alta',
    seccion: 'Clientes',
    pasos: [
      step({ avance: 'route', ruta_destino: '/client/create' }),
      step({ avance: 'check', condicion: 'filled', confirmar: true }),
      step({ avance: 'event', evento: 'client-created' }),
      step({ elemento: 'grid-edit', opcional: true, solo_lectura: true, listo_cuando: 'grid-row', dispositivo: 'desktop' }),
    ],
  });

  test('pasa los datos del tutorial a la forma del guía', () => {
    expect(tutorial).toMatchObject({ key: 'clients', title: 'Clientes', description: 'Alta', section: 'Clientes' });
  });

  test('arma la condición de avance de cada paso', () => {
    expect(tutorial.steps.map((s) => s.advance)).toEqual([
      { route: '/client/create' },
      { check: 'filled', confirm: true },
      { event: 'client-created' },
      { next: true },
    ]);
  });

  test('pasa las opciones del paso y deja sin valor las vacías', () => {
    expect(tutorial.steps[3]).toMatchObject({
      path: '/client', target: 'grid-edit', optional: true, readOnly: true, readyWhen: 'grid-row', media: 'desktop',
    });
    expect(tutorial.steps[0].media).toBeUndefined();
    expect(tutorial.steps[0].readyWhen).toBeUndefined();
  });
});

describe('resumeStepIndex', () => {
  const steps = [
    { path: '/client', target: 'list-add', advance: { route: '/client/create' } },
    { path: '/client/create', target: 'name', advance: { check: 'filled', confirm: true } },
    { path: '/client/create', target: 'province', advance: { check: 'filled' } },
    { path: '/client/create', target: 'save', advance: { event: 'client-created' } },
  ];

  afterEach(() => { document.body.innerHTML = ''; });

  test('fuera de las pantallas del tutorial arranca desde el primero', () => {
    expect(resumeStepIndex(steps, '/')).toBe(0);
  });

  test('con el formulario vacío arranca en el primer paso de la pantalla', () => {
    document.body.innerHTML = '<div data-tour="name"><input value="" /></div>';
    expect(resumeStepIndex(steps, '/client/create')).toBe(1);
  });

  test('retoma después del último paso ya completo de la pantalla', () => {
    document.body.innerHTML = '<div data-tour="name"><input value="La Huerta" /></div><div data-tour="province"><select><option value="1">BA</option></select></div>';
    expect(resumeStepIndex(steps, '/client/create')).toBe(3);
  });
});
