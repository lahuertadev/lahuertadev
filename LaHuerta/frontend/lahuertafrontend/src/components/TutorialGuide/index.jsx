import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useTutorial } from '../../context/TutorialContext';
import {
  TUTORIAL_EVENT_NAME,
  TUTORIAL_TARGET_WAIT_MS,
  TUTORIAL_OPTIONAL_WAIT_MS,
  TUTORIAL_CHECK_INTERVAL_MS,
} from '../../constants/tutorials';
import { STEP_CHECKS, matchesPath } from '../../utils/tutorial';

const DRIVER_CONFIG = {
  // Solo se sale con el botón "Salir": ni Escape ni el clic afuera cierran el tutorial.
  allowClose: false,
  allowKeyboardControl: false,
  overlayOpacity: 0.55,
  stagePadding: 6,
  stageRadius: 10,
  smoothScroll: true,
  popoverClass: 'tutorial-popover',
};

// Si el paso es de una fila del listado y se acaba de crear un registro, prefiere la fila de ese
// registro (data-tour-row en las acciones, data-id en la fila de DataGrid); si no está en la
// página visible, la primera.
// Flechas de navegación (mismos trazos que ChevronLeft / ChevronRight de MUI): driver.js arma
// el globo con HTML, así que van como SVG en texto.
const chevron = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
const CHEVRON_LEFT = chevron('M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z');
const CHEVRON_RIGHT = chevron('M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z');

const findTarget = (target, createdId) => (
  (createdId != null && document.querySelector(
    `[data-tour="${target}"][data-tour-row="${createdId}"], [data-tour="${target}"][data-id="${createdId}"]`,
  ))
  || document.querySelector(`[data-tour="${target}"]`)
);

// Paso al que lleva "<": el anterior de la misma pantalla (lo cargado sigue ahí), salteando
// los opcionales cuyo elemento no está. -1 si es el primero de la pantalla: volver a otra pantalla
// perdería lo cargado.
const previousStepIndex = (steps, stepIndex) => {
  for (let index = stepIndex - 1; index >= 0 && steps[index].path === steps[stepIndex].path; index -= 1) {
    if (!steps[index].optional || findTarget(steps[index].target)) return index;
  }
  return -1;
};

/**
 * Muestra el tutorial en curso sobre la pantalla real con driver.js: resalta el elemento de
 * cada paso, explica qué hacer y avanza cuando el usuario lo hace (ver `advance` en
 * constants/tutorials). No renderiza nada propio: driver.js dibuja el sombreado y el globo.
 *
 * - Los pasos de recorrido ({ next: true }) muestran el elemento y se sigue con "Siguiente".
 * - "<" vuelve al paso anterior dentro de la misma pantalla, sin perder lo cargado; desde ahí
 *   se sigue con ">" (habilitado si el paso está completo).
 *   Con `readOnly` el elemento no se puede tocar (ej. el ícono de eliminar de una fila).
 * - Los pasos opcionales se saltean si su elemento no aparece (ej. la lista de precios
 *   cuando el cliente no usa lista).
 * - Después de un guardado la pantalla navega sola: el paso siguiente espera esa navegación.
 * - Si el usuario vuelve a una pantalla anterior del tutorial (ej. cancela el formulario),
 *   retoma desde el primer paso de esa pantalla.
 * - Si va a una pantalla que no es del tutorial, queda en pausa con la opción de volver o salir.
 * - Si un guardado falla, la pantalla no emite el evento y el tutorial se queda en ese paso,
 *   con el error de la pantalla a la vista.
 */
export default function TutorialGuide() {
  const { session, activeTutorial, activeSteps, exitTutorial, goToStep, finishTutorial } = useTutorial();
  const location = useLocation();
  const navigate = useNavigate();
  const driverRef = useRef(null);
  const popoverRef = useRef(null);
  // Tutorial y ruta de la corrida anterior del paso: para distinguir "el usuario cambió de
  // pantalla" de "el paso cambió y la pantalla todavía no navegó".
  const lastRunRef = useRef({ key: null, pathname: null });
  // Id del registro que se creó durante el tutorial (llega con el evento de guardado).
  const createdIdRef = useRef(null);

  // Las funciones del contexto cambian en cada render; los callbacks de driver.js leen las últimas.
  const actionsRef = useRef({});
  actionsRef.current = { exitTutorial, goToStep, finishTutorial, navigate };

  const getDriver = () => {
    if (!driverRef.current) {
      driverRef.current = driver({
        ...DRIVER_CONFIG,
        onPopoverRender: (popover) => { popoverRef.current = popover; },
      });
    }
    return driverRef.current;
  };

  // Globo con "Salir" (previous de driver.js), "<" (botón propio, si hay a dónde volver) y, si
  // corresponde, la acción principal (next de driver.js). Con `forwardArrow` la acción principal
  // es ">" en lugar de un texto (al haber vuelto con "<").
  const show = ({ element, title, description, progressText, nextText, onNext, onBack, forwardArrow = false, readOnly = false }) => {
    getDriver().highlight({
      element,
      disableActiveInteraction: readOnly,
      popover: {
        title,
        description,
        showButtons: nextText ? ['next', 'previous'] : ['previous'],
        nextBtnText: forwardArrow ? CHEVRON_RIGHT : nextText,
        prevBtnText: 'Salir',
        onNextClick: () => onNext?.(),
        onPrevClick: () => actionsRef.current.exitTutorial(),
        onPopoverRender: (popover) => {
          popoverRef.current = popover;
          if (progressText) {
            popover.progress.textContent = progressText;
            popover.progress.style.display = 'block';
          }
          if (forwardArrow) {
            popover.nextButton.classList.add('tutorial-arrow-btn');
            popover.nextButton.setAttribute('aria-label', 'Paso siguiente');
          }
          if (onBack) {
            const backButton = document.createElement('button');
            backButton.type = 'button';
            backButton.className = 'driver-popover-back-btn tutorial-arrow-btn';
            backButton.setAttribute('aria-label', 'Paso anterior');
            backButton.innerHTML = CHEVRON_LEFT;
            backButton.addEventListener('click', onBack);
            popover.footerButtons.insertBefore(backButton, popover.nextButton);
          }
        },
      },
    });
  };

  const setNextEnabled = (enabled) => {
    const button = popoverRef.current?.nextButton;
    if (!button) return;
    button.disabled = !enabled;
    button.classList.toggle('driver-popover-btn-disabled', !enabled);
  };

  // Sin tutorial en curso: se saca el sombreado.
  useEffect(() => {
    if (session) return;
    driverRef.current?.destroy();
    driverRef.current = null;
    lastRunRef.current = { key: null, pathname: null };
    createdIdRef.current = null;
  }, [session]);

  useEffect(() => () => driverRef.current?.destroy(), []);

  // Paso en curso.
  useEffect(() => {
    if (!session || !activeTutorial) return undefined;

    const steps = activeSteps;
    const stepIndex = session.stepIndex;
    const step = steps[stepIndex];
    const { pathname } = location;
    const isLast = stepIndex === steps.length - 1;
    const progressText = `Paso ${stepIndex + 1} de ${steps.length}`;

    const lastRun = lastRunRef.current;
    const navigationPending = lastRun.key !== session.key || lastRun.pathname === pathname;
    lastRunRef.current = { key: session.key, pathname };

    const goNext = () => {
      if (isLast) actionsRef.current.finishTutorial();
      else actionsRef.current.goToStep(stepIndex + 1);
    };

    // El usuario hizo la navegación que pedía el paso.
    if (step.advance.route && matchesPath(step.advance.route, pathname)) {
      goNext();
      return undefined;
    }

    const showPaused = () => show({
      title: 'Tutorial en pausa',
      description: `Saliste de la pantalla del tutorial de ${activeTutorial.title}. Volvé para seguir donde estabas.`,
      nextText: 'Volver al tutorial',
      onNext: () => {
        actionsRef.current.goToStep(steps.findIndex((candidate) => candidate.path === step.path));
        actionsRef.current.navigate(step.path);
      },
    });

    if (!matchesPath(step.path, pathname)) {
      // El paso es de otra pantalla y la ruta no cambió: la pantalla está por navegar
      // (ej. al guardar vuelve al listado). Si no navega, queda en pausa.
      if (navigationPending) {
        const timer = setTimeout(showPaused, TUTORIAL_TARGET_WAIT_MS);
        return () => clearTimeout(timer);
      }
      const firstOnScreen = steps.findIndex((candidate) => matchesPath(candidate.path, pathname));
      if (firstOnScreen !== -1 && firstOnScreen < stepIndex) {
        actionsRef.current.goToStep(firstOnScreen);
        return undefined;
      }
      showPaused();
      return undefined;
    }

    const check = step.advance.check && STEP_CHECKS[step.advance.check];
    // Al volver con "<" a un paso que avanza solo (ej. un desplegable ya elegido), se sigue con ">":
    // si no, avanzaría de inmediato porque ya está completo.
    const revisiting = Boolean(session.revisiting);
    const needsConfirm = Boolean(step.advance.confirm || (revisiting && check));
    const startedAt = Date.now();
    let shownElement = null;
    let advanced = false;

    const advanceOnce = () => {
      if (advanced) return;
      advanced = true;
      goNext();
    };

    const tick = () => {
      if (advanced) return;
      const element = findTarget(step.target, createdIdRef.current);
      const waited = Date.now() - startedAt;

      if (!element) {
        // Paso opcional cuyo elemento no está (ej. depende de lo que eligió el usuario): se saltea,
        // pero recién cuando la pantalla terminó de cargar (readyWhen, ej. las filas del listado).
        const screenReady = !step.readyWhen || Boolean(findTarget(step.readyWhen));
        if (step.optional && screenReady && waited > TUTORIAL_OPTIONAL_WAIT_MS) {
          advanceOnce();
          return;
        }
        // El elemento todavía no está (carga de la pantalla): pasado un rato, globo centrado.
        if (shownElement !== 'centered' && waited > TUTORIAL_TARGET_WAIT_MS) {
          shownElement = 'centered';
          show({ title: step.title, description: step.description, progressText });
        }
        return;
      }

      if (shownElement !== element) {
        shownElement = element;
        const backIndex = previousStepIndex(steps, stepIndex);
        const onBack = backIndex === -1
          ? undefined
          : () => actionsRef.current.goToStep(backIndex, { revisiting: true });
        // driver.js solo lo acerca si está fuera de la ventana; acá puede quedar tapado por el
        // pie o al borde de <main>, así que se centra siempre. Sin animación: driver.js calcula
        // la posición del globo al resaltar y con un scroll animado quedaría desfasado.
        element.scrollIntoView({ block: 'center' });
        if (step.advance.next) {
          show({
            element,
            title: step.title,
            description: step.description,
            progressText,
            nextText: isLast ? 'Terminar' : 'Siguiente',
            forwardArrow: revisiting && !isLast,
            onNext: advanceOnce,
            onBack,
            readOnly: Boolean(step.readOnly),
          });
        } else {
          show({
            element,
            title: step.title,
            description: step.description,
            progressText,
            nextText: needsConfirm ? 'Continuar' : undefined,
            forwardArrow: needsConfirm && revisiting,
            onNext: () => {
              const current = findTarget(step.target, createdIdRef.current);
              if (current && check?.(current)) advanceOnce();
            },
            onBack,
          });
        }
      }

      if (!check) return;
      const done = check(element);
      if (needsConfirm) setNextEnabled(done);
      else if (done) advanceOnce();
    };

    // Guardado exitoso avisado por la pantalla (emitTutorialEvent).
    const handleTutorialEvent = (event) => {
      if (!step.advance.event || event.detail.name !== step.advance.event) return;
      createdIdRef.current = event.detail.id ?? null;
      advanceOnce();
    };

    // driver.js solo se reacomoda con el scroll de la ventana; el contenido scrollea dentro de <main>.
    let frame = null;
    const handleScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        driverRef.current?.refresh();
      });
    };

    tick();
    const interval = setInterval(tick, TUTORIAL_CHECK_INTERVAL_MS);
    document.addEventListener('input', tick, true);
    document.addEventListener('change', tick, true);
    document.addEventListener('scroll', handleScroll, true);
    window.addEventListener(TUTORIAL_EVENT_NAME, handleTutorialEvent);

    return () => {
      clearInterval(interval);
      document.removeEventListener('input', tick, true);
      document.removeEventListener('change', tick, true);
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener(TUTORIAL_EVENT_NAME, handleTutorialEvent);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [session?.key, session?.stepIndex, location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
