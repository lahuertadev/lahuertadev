import { useEffect, useRef, useState } from 'react';

const easeOutCubic = (progress) => 1 - Math.pow(1 - progress, 3);

/**
 * Anima un número desde su valor anterior hasta el nuevo (count up / count down)
 * y frena exactamente en el valor final. Si el usuario pidió reducir animaciones,
 * devuelve el valor directo.
 */
const useCountUp = (value, duration = 600) => {
  const [displayed, setDisplayed] = useState(value);
  const displayedRef = useRef(value);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = displayedRef.current;

    if (reducedMotion || from === value) {
      displayedRef.current = value;
      setDisplayed(value);
      return undefined;
    }

    let frameId;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const current = progress === 1 ? value : from + (value - from) * easeOutCubic(progress);
      displayedRef.current = current;
      setDisplayed(current);
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value, duration]);

  return displayed;
};

export default useCountUp;
