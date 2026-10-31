import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CampaignIcon from '@mui/icons-material/CampaignOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SchoolIcon from '@mui/icons-material/SchoolOutlined';
import SpotlightButton from '../SpotlightButton';
import {
  NEWS_MAX_VISIBLE,
  NEWS_AUTOPLAY_SECONDS,
  NEWS_TOUCH_PAUSE_SECONDS,
  NEWS_SWIPE_THRESHOLD,
} from '../../constants/news';

// Duración de la salida (desenfoque) antes de mostrar la siguiente novedad.
const BLUR_OUT_MS = 200;
// Escalonado de la entrada palabra por palabra (efecto Blur Text).
const TITLE_WORD_STEP_MS = 45;
const DESCRIPTION_WORD_STEP_MS = 18;
const DESCRIPTION_START_GAP_MS = 120;

/**
 * Texto que entra palabra por palabra, de borroso a nítido (efecto Blur Text).
 * Con "reducir movimiento" se muestra sin animar.
 */
const BlurWords = ({ text, startDelay = 0, step }) => (
  text.split(' ').map((word, index) => (
    <React.Fragment key={index}>
      {index > 0 && ' '}
      <span
        className="inline-block motion-safe:animate-[newsBlurIn_450ms_cubic-bezier(.22,.8,.24,1)_both]"
        style={{ animationDelay: `${startDelay + index * step}ms` }}
      >
        {word}
      </span>
    </React.Fragment>
  ))
);

/**
 * Carrusel de novedades de la plataforma para el Inicio. Recibe las novedades pendientes
 * del usuario (vigentes y no vistas) tal como vienen de GET /news/?pending=true y muestra
 * las más recientes, de a una. No se renderiza si no hay ninguna.
 *
 * Al cambiar de novedad, la que sale se desenfoca y la que entra aparece palabra por palabra
 * (efecto Blur Text): primero el título y después la descripción.
 *
 * Avanza sola cada NEWS_AUTOPLAY_SECONDS: la barra del punto activo se llena y al terminar
 * (onAnimationEnd) pasa a la siguiente. Pasar el mouse por encima o tocarla pausa esa
 * animación y, con ella, el avance. Con "reducir movimiento" del sistema no avanza sola.
 *
 * Props:
 *   news       — array de novedades
 *   onDismiss  — async (item) => void. "Entendido": marca la novedad como vista.
 *   historyUrl — ruta de "Ver todas las novedades"
 *   canStartTutorial — (opcional) (key) => bool. Si la novedad tiene `tutorial_clave` y devuelve
 *                      true (el tutorial existe para su rol y no lo completó), se ofrece "Ver tutorial".
 *   onStartTutorial  — (opcional) (key) => void. Empieza el tutorial guiado.
 */
export default function NewsPanel({ news = [], onDismiss, historyUrl, canStartTutorial, onStartTutorial }) {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [touchPaused, setTouchPaused] = useState(false);
  const touchStartX = useRef(null);
  const touchPauseTimer = useRef(null);
  const leaveTimer = useRef(null);

  useEffect(() => () => {
    clearTimeout(touchPauseTimer.current);
    clearTimeout(leaveTimer.current);
  }, []);

  const visibleNews = news.slice(0, NEWS_MAX_VISIBLE);
  if (visibleNews.length === 0) return null;

  const total = visibleNews.length;
  const current = Math.min(slide, total - 1);
  const hasMany = total > 1;

  // Desenfoca la novedad actual y, al terminar, ejecuta `then` (cambiar o descartar).
  const leaveThen = (then) => {
    if (leaving) return;
    setLeaving(true);
    leaveTimer.current = setTimeout(async () => {
      try {
        await then();
      } finally {
        setLeaving(false);
      }
    }, BLUR_OUT_MS);
  };

  const goTo = (index) => {
    const next = (index + total) % total;
    if (next !== current) leaveThen(() => setSlide(next));
  };

  // Al descartarla, la siguiente ocupa su lugar (mismo índice) y entra con el efecto.
  const handleDismiss = (item) => leaveThen(() => onDismiss(item));

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0].clientX;
    setTouchPaused(true);
    clearTimeout(touchPauseTimer.current);
    touchPauseTimer.current = setTimeout(() => setTouchPaused(false), NEWS_TOUCH_PAUSE_SECONDS * 1000);
  };

  const handleTouchEnd = (event) => {
    if (touchStartX.current === null || !hasMany) return;
    const delta = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) > NEWS_SWIPE_THRESHOLD) goTo(current + (delta < 0 ? 1 : -1));
  };

  const item = visibleNews[current];
  const offersTutorial = Boolean(item.tutorial_clave && onStartTutorial && canStartTutorial?.(item.tutorial_clave));
  const titleWords = item.titulo.split(' ').length;

  const historyLink = (
    <button
      type="button"
      onClick={() => navigate(historyUrl)}
      className="inline-flex items-center gap-1 text-sm font-semibold text-news-accent hover:underline"
    >
      Ver todas las novedades
      <ArrowForwardIcon sx={{ fontSize: 16 }} />
    </button>
  );

  const arrowClass = 'flex h-7 w-7 items-center justify-center rounded-full border border-news-border bg-surface-card text-news-accent transition-colors hover:bg-news-accent/10';

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Novedades"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="group/news col-span-full flex flex-col rounded-2xl border border-news-border bg-news-surface p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-news-accent">
          <CampaignIcon sx={{ fontSize: 16 }} />
          Novedades
          {hasMany && (
            <span className="font-semibold normal-case tracking-normal text-on-surface-muted">
              {current + 1} de {total}
            </span>
          )}
        </p>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">{historyLink}</div>
          {hasMany && (
            <div className="flex gap-1">
              <button type="button" aria-label="Novedad anterior" onClick={() => goTo(current - 1)} className={arrowClass}>
                <ChevronLeftIcon sx={{ fontSize: 18 }} />
              </button>
              <button type="button" aria-label="Novedad siguiente" onClick={() => goTo(current + 1)} className={arrowClass}>
                <ChevronRightIcon sx={{ fontSize: 18 }} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* key: al cambiar de novedad se vuelve a montar y las palabras entran de nuevo */}
      <div
        key={item.id}
        className={`flex flex-col gap-2 px-0.5 pb-2 pt-3 transition-[opacity,filter,transform] duration-200 ${
          leaving ? '-translate-x-3 opacity-0 blur-sm' : ''
        }`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-news-accent/15 text-news-accent">
          <AutoAwesomeIcon fontSize="small" />
        </span>

        {/* Título y descripción juntos (como las tarjetas). Mobile: botones debajo a lo ancho,
            Entendido arriba (como FormActions). Desktop: botones a la derecha, al pie del texto. */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          {/* Alto fijo: título en una línea y descripción siempre en dos (line-clamp-2 + h-10 =
              2 × 1.25rem), así el panel no cambia de tamaño entre una novedad y otra. */}
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="line-clamp-1 text-sm font-bold text-on-surface" title={item.titulo}>
              <BlurWords text={item.titulo} step={TITLE_WORD_STEP_MS} />
            </p>
            <p className="line-clamp-2 h-10 text-sm text-on-surface-muted" title={item.descripcion}>
              <BlurWords
                text={item.descripcion}
                startDelay={DESCRIPTION_START_GAP_MS + titleWords * TITLE_WORD_STEP_MS}
                step={DESCRIPTION_WORD_STEP_MS}
              />
            </p>
          </div>

          {/* Mobile: Entendido arriba a lo ancho y debajo, en una fila, "Ir a…" y "Ver tutorial";
              el alto de las dos filas queda reservado aunque no haya botones secundarios.
              Desktop: todos en una fila, Entendido al final. */}
          <div className="flex min-h-[4.5rem] shrink-0 flex-col gap-2 sm:min-h-0 sm:flex-row sm:items-center">
            <SpotlightButton
              variant="news"
              disabled={leaving}
              onClick={() => handleDismiss(item)}
              className="w-full px-4 py-1.5 text-sm sm:order-last sm:w-auto"
            >
              Entendido
            </SpotlightButton>
            <div className="flex gap-2 sm:contents">
              {item.pantalla_url && (
                <SpotlightButton
                  variant="newsOutline"
                  onClick={() => navigate(item.pantalla_url)}
                  className="min-w-0 flex-1 px-3 py-1.5 text-sm sm:flex-none"
                >
                  <span className="truncate">Ir a {item.pantalla_nombre || 'la pantalla'}</span>
                </SpotlightButton>
              )}
              {offersTutorial && (
                <SpotlightButton
                  variant="newsOutline"
                  onClick={() => onStartTutorial(item.tutorial_clave)}
                  className="min-w-0 flex-1 px-3 py-1.5 text-sm sm:flex-none"
                >
                  <SchoolIcon sx={{ fontSize: 16 }} />
                  Ver tutorial
                </SpotlightButton>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pie: puntos (si hay más de una) y, en mobile, "Ver todas las novedades" */}
      <div className={`flex flex-col items-center gap-2 border-t border-news-border pt-2 sm:flex-row sm:justify-center ${hasMany ? '' : 'sm:hidden'}`}>
        {hasMany && (
          <div className="flex items-center gap-1.5">
            {visibleNews.map((newsItem, index) => (
              index === current ? (
                <button
                  key={newsItem.id}
                  type="button"
                  aria-label={`Novedad ${index + 1}`}
                  aria-current="true"
                  className="relative h-2 w-6 overflow-hidden rounded-full bg-news-accent/30"
                >
                  {/* key={current}: reinicia la barra en cada cambio de novedad */}
                  <span
                    key={current}
                    onAnimationEnd={() => goTo(current + 1)}
                    style={{ animationDuration: `${NEWS_AUTOPLAY_SECONDS}s` }}
                    className={`absolute inset-y-0 left-0 w-full rounded-full bg-news-accent motion-safe:w-0 motion-safe:animate-[newsProgress_linear_forwards] group-hover/news:[animation-play-state:paused] ${
                      touchPaused ? '[animation-play-state:paused]' : ''
                    }`}
                  />
                </button>
              ) : (
                <button
                  key={newsItem.id}
                  type="button"
                  aria-label={`Novedad ${index + 1}`}
                  onClick={() => goTo(index)}
                  className="h-2 w-2 rounded-full bg-news-accent/30 transition-colors hover:bg-news-accent/50"
                />
              )
            ))}
          </div>
        )}
        <div className="sm:hidden">{historyLink}</div>
      </div>
    </section>
  );
}
