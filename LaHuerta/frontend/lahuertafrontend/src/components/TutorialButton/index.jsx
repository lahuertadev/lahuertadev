import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import SchoolIcon from '@mui/icons-material/SchoolOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TutorialCard from '../TutorialCard';
import { useTutorial } from '../../context/TutorialContext';
import { isTutorialOnScreen } from '../../utils/tutorial';

/**
 * Botón flotante de tutoriales con el birrete (abajo a la derecha). Muestra solo el tutorial
 * de la pantalla actual, con su estado, y un enlace a la sección Tutoriales con todos.
 * No aparece en las pantallas sin tutorial ni mientras hay uno en curso.
 */
export default function TutorialButton() {
  const { tutorials, progress, session, startTutorial } = useTutorial();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Al cambiar de pantalla se cierra: el listado es de la pantalla anterior.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const onScreen = tutorials.filter((tutorial) => isTutorialOnScreen(tutorial, pathname));
  if (session || onScreen.length === 0) return null;

  const handleStart = (key) => {
    setOpen(false);
    startTutorial(key);
  };

  return (
    <div ref={containerRef} className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3 sm:right-6">
      {open && (
        <section
          role="dialog"
          aria-label="Tutorial de esta pantalla"
          className="flex max-h-[min(28rem,calc(100svh-12rem))] w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 overflow-y-auto rounded-2xl border border-border-subtle bg-surface-card p-4 shadow-xl animate-[fadeSlideIn_0.2s_ease-out]"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-bold text-on-surface">
              <SchoolIcon fontSize="small" className="text-accent" />
              Tutorial de esta pantalla
            </p>
            <button
              type="button"
              aria-label="Cerrar tutoriales"
              onClick={() => setOpen(false)}
              className="text-on-surface-muted transition-colors hover:text-on-surface"
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </button>
          </div>
          <p className="text-xs text-on-surface-muted">
            Te guía paso a paso mientras hacés la tarea real: lo que cargues queda guardado. Podés salir cuando quieras.
          </p>
          <ul className="flex flex-col gap-2">
            {onScreen.map((tutorial) => (
              <TutorialCard key={tutorial.key} tutorial={tutorial} status={progress[tutorial.key]} onStart={handleStart} />
            ))}
          </ul>
          <button
            type="button"
            onClick={() => navigate('/tutorials')}
            className="inline-flex items-center gap-1 self-start text-sm font-semibold text-accent hover:underline"
          >
            Ver todos los tutoriales
            <ArrowForwardIcon sx={{ fontSize: 16 }} />
          </button>
        </section>
      )}
      <button
        type="button"
        aria-label="Tutoriales"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-lahuerta bg-blue-lahuerta text-white shadow-lg transition-[filter,box-shadow] hover:shadow-xl hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <SchoolIcon sx={{ fontSize: 26 }} />
      </button>
    </div>
  );
}
