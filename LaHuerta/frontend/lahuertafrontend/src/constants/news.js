// Novedades de la plataforma (DEV-137).

// Cantidad máxima de novedades en el carrusel del Inicio (las más recientes).
export const NEWS_MAX_VISIBLE = 3;

// Segundos que se muestra cada novedad antes de pasar sola a la siguiente.
export const NEWS_AUTOPLAY_SECONDS = 7;

// Segundos que el carrusel queda pausado después de tocarlo en mobile.
export const NEWS_TOUCH_PAUSE_SECONDS = 8;

// Desplazamiento mínimo (px) para que un deslizamiento cuente como cambio de novedad.
export const NEWS_SWIPE_THRESHOLD = 40;

export const NEWS_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'unseen', label: 'No vistas' },
  { value: 'current', label: 'Vigentes' },
  { value: 'expired', label: 'Vencidas' },
];
