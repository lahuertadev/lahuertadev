import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { tutorialUrl } from '../constants/urls';
import { TUTORIAL_STATUS, TUTORIAL_MOBILE_QUERY } from '../constants/tutorials';
import { mapTutorial, matchesPath, resumeStepIndex, tutorialSteps } from '../utils/tutorial';

const TutorialContext = createContext(null);

/**
 * Tutoriales guiados (DEV-138): los que puede ver el usuario según su rol, con sus pasos y en
 * qué estado quedó cada uno (GET /tutorials/), y el tutorial en curso.
 *
 * session: null o { key, stepIndex, isMobile, revisiting }. Los pasos se eligen al empezar según
 * el tamaño de pantalla (`media` de cada paso) y quedan fijos hasta que termina. `revisiting`
 * indica que se llegó al paso con "Anterior" (ver TutorialGuide).
 *
 * Va dentro de <App/> (área autenticada): necesita la sesión y el router.
 */
export function TutorialProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [tutorials, setTutorials] = useState([]);
  const [progress, setProgress] = useState({});
  const [session, setSession] = useState(null);

  const activeTutorial = session ? tutorials.find((tutorial) => tutorial.key === session.key) : null;
  const activeSteps = activeTutorial ? tutorialSteps(activeTutorial, session.isMobile) : [];

  useEffect(() => {
    let cancelled = false;
    axios.get(tutorialUrl)
      .then((response) => {
        if (cancelled) return;
        setTutorials(response.data.map(mapTutorial));
        setProgress(Object.fromEntries(
          response.data.filter((item) => item.estado).map((item) => [item.clave, item.estado]),
        ));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // El avance se guarda en segundo plano: si falla, el tutorial sigue igual.
  const saveStatus = async (key, action) => {
    try {
      const response = await axios.post(`${tutorialUrl}${key}/${action}/`);
      setProgress((current) => ({ ...current, [key]: response.data.estado }));
    } catch {
      // Sin acción: el estado se vuelve a guardar la próxima vez que lo use.
    }
  };

  const findTutorial = (key) => tutorials.find((tutorial) => tutorial.key === key);

  // Se puede ofrecer solo si existe para su rol y todavía no lo completó.
  const canOfferTutorial = (key) => Boolean(findTutorial(key)) && progress[key] !== TUTORIAL_STATUS.completed;

  const startTutorial = (key) => {
    const tutorial = findTutorial(key);
    if (!tutorial) return;
    const isMobile = window.matchMedia(TUTORIAL_MOBILE_QUERY).matches;
    const steps = tutorialSteps(tutorial, isMobile);
    // En una pantalla del tutorial arranca ahí (retomando lo ya cargado); si no, lleva a la primera.
    const stepIndex = resumeStepIndex(steps, location.pathname);
    setSession({ key, stepIndex, isMobile, revisiting: false });
    saveStatus(key, 'start');
    if (stepIndex === 0 && !matchesPath(steps[0].path, location.pathname)) navigate(steps[0].path);
  };

  // Salir a mitad de camino lo deja como omitido (si ya lo había completado, el backend lo mantiene).
  const exitTutorial = () => {
    if (session) saveStatus(session.key, 'skip');
    setSession(null);
  };

  const goToStep = (stepIndex, { revisiting = false } = {}) => (
    setSession((current) => (current ? { ...current, stepIndex, revisiting } : current))
  );

  // Sin aviso propio: la pantalla ya muestra el suyo al guardar (ej. "El cliente se creó…").
  const finishTutorial = () => {
    if (!activeTutorial) return;
    saveStatus(activeTutorial.key, 'complete');
    setSession(null);
  };

  const value = {
    tutorials,
    progress,
    session,
    activeTutorial,
    activeSteps,
    canOfferTutorial,
    startTutorial,
    exitTutorial,
    goToStep,
    finishTutorial,
  };

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial debe usarse dentro de TutorialProvider');
  }
  return context;
}
