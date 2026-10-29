import { matchPath } from 'react-router-dom';
import { TUTORIAL_EVENT_NAME } from '../constants/tutorials';

//* Avisa al tutorial en curso que pasó algo en la pantalla (ej. guardado exitoso). Ver TUTORIAL_EVENTS.
//* `id` es el del registro creado: los pasos siguientes resaltan su fila en el listado.
export const emitTutorialEvent = (name, { id } = {}) => {
  window.dispatchEvent(new CustomEvent(TUTORIAL_EVENT_NAME, { detail: { name, id } }));
};

//* Indica si la ruta actual corresponde al `path` de un paso (admite parámetros y barra final).
export const matchesPath = (path, pathname) => Boolean(matchPath({ path, end: true }, pathname));

//* Pasa un tutorial de la API (GET /tutorials/, con sus pasos) a la forma que usa el guía.
//* El backend ya devuelve solo los del rol del usuario y en orden.
export const mapTutorial = (tutorial) => ({
  key: tutorial.clave,
  title: tutorial.titulo,
  description: tutorial.descripcion,
  section: tutorial.seccion,
  steps: tutorial.pasos.map((step) => ({
    path: step.ruta,
    target: step.elemento,
    title: step.titulo,
    description: step.descripcion,
    media: step.dispositivo || undefined,
    optional: step.opcional,
    readOnly: step.solo_lectura,
    readyWhen: step.listo_cuando || undefined,
    advance: {
      next: { next: true },
      route: { route: step.ruta_destino },
      event: { event: step.evento },
      check: { check: step.condicion, confirm: step.confirmar },
    }[step.avance],
  })),
});

//* Pasos del tutorial para el tamaño de pantalla (los que tienen `media` solo van en ese tamaño).
export const tutorialSteps = (tutorial, isMobile) =>
  tutorial.steps.filter((step) => !step.media || step.media === (isMobile ? 'mobile' : 'desktop'));

//* Indica si algún paso del tutorial es en la pantalla actual.
export const isTutorialOnScreen = (tutorial, pathname) =>
  tutorial.steps.some((step) => matchesPath(step.path, pathname));

//* Valor del campo resaltado: el elemento mismo si es un campo, o el primer campo que contiene.
export const fieldValue = (element) => {
  const field = element.matches('input, select, textarea')
    ? element
    : element.querySelector('input:not([type="hidden"]):not([type="checkbox"]), select, textarea');
  return field ? field.value.trim() : '';
};

// Condiciones para avanzar de paso (advance.check en constants/tutorials).
export const STEP_CHECKS = {
  // El campo tiene algo cargado (texto o una opción elegida).
  filled: (element) => fieldValue(element) !== '',
  // El selector de fecha tiene una fecha completa (vacío muestra la máscara DD/MM/YYYY).
  date: (element) => /^\d{2}\/\d{2}\/\d{4}$/.test(fieldValue(element)),
  // La pantalla marca el elemento como listo con data-tour-complete="true".
  complete: (element) => element.dataset.tourComplete === 'true',
};

//* Paso desde el que arranca el tutorial según la pantalla actual. Si no tiene pasos acá, el primero.
//* Si los tiene, retoma después del último paso de esta pantalla que ya está completo (ej. salió
//* sin querer con el formulario a medio cargar y lo vuelve a empezar): lo cargado sigue en pantalla.
export const resumeStepIndex = (steps, pathname) => {
  const onScreen = steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => matchesPath(step.path, pathname));
  if (onScreen.length === 0) return 0;

  let resumeAt = onScreen[0].index;
  onScreen.forEach(({ step, index }) => {
    const check = step.advance.check && STEP_CHECKS[step.advance.check];
    const element = check && document.querySelector(`[data-tour="${step.target}"]`);
    if (element && check(element) && index + 1 < steps.length) resumeAt = index + 1;
  });
  return resumeAt;
};
