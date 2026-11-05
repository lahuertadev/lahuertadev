import { useEffect } from 'react';

/**
 * Efecto "spotlight" sobre un elemento del DOM: sigue al cursor y expone su posición en las
 * variables CSS --mx / --my (para un radial-gradient) y una leve inclinación en --rx / --ry.
 * Solo se activa en dispositivos con mouse y si el usuario no pidió reducir animaciones.
 * Devuelve la función que lo saca. La usan useSpotlight y los botones que no son de React
 * (ej. los del globo del tutorial, que arma driver.js).
 */
export const attachSpotlight = (element) => {
  if (!element) return () => {};

  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!canHover || reducedMotion) return () => {};

  const handleMove = (e) => {
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    element.style.setProperty('--mx', `${x}px`);
    element.style.setProperty('--my', `${y}px`);
    element.style.setProperty('--rx', `${((y / rect.height) - 0.5) * -4}deg`);
    element.style.setProperty('--ry', `${((x / rect.width) - 0.5) * 4}deg`);
  };
  const handleLeave = () => {
    element.style.setProperty('--rx', '0deg');
    element.style.setProperty('--ry', '0deg');
  };

  element.addEventListener('pointermove', handleMove);
  element.addEventListener('pointerleave', handleLeave);
  return () => {
    element.removeEventListener('pointermove', handleMove);
    element.removeEventListener('pointerleave', handleLeave);
  };
};

/**
 * Hook del efecto "spotlight" (ver attachSpotlight) para un elemento de React.
 */
const useSpotlight = (ref) => {
  useEffect(() => attachSpotlight(ref.current), [ref]);
};

export default useSpotlight;
