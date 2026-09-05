import React, { useEffect, useRef } from 'react';

const FRUITS = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍉', '🍒', '🍍', '🥝', '🍌', '🥭', '🍑'];
const COLUMN_WIDTH = 88;
const FONT_SIZE = 26;
const MIN_SPEED = 55;
const MAX_SPEED = 110;
const OPACITY = 0.65;

const randomFruit = () => FRUITS[Math.floor(Math.random() * FRUITS.length)];

/**
 * Fondo decorativo del Login: frutas cayendo en loop sobre canvas, una por columna
 * a velocidad propia. Se desactiva con prefers-reduced-motion y en mobile (deja un
 * frame estático) por batería/rendimiento.
 */
export default function FruitRain() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 640px)').matches;

    const ctx = canvas.getContext('2d');
    let rect = { width: 0, height: 0 };
    let drops = [];
    let lastFrame = 0;
    let raf = null;

    const makeDrop = (x) => ({
      x,
      y: Math.random() * rect.height,
      speed: MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED),
      fruit: randomFruit(),
    });

    const draw = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.font = `${FONT_SIZE}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
      ctx.globalAlpha = OPACITY;
      drops.forEach((drop) => ctx.fillText(drop.fruit, drop.x, drop.y));
      ctx.globalAlpha = 1;
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const columns = Math.max(1, Math.ceil(rect.width / COLUMN_WIDTH));
      drops = Array.from({ length: columns }, (_, i) => makeDrop(i * COLUMN_WIDTH + COLUMN_WIDTH / 2));
      draw();
    };

    const tick = (now) => {
      const dt = lastFrame ? (now - lastFrame) / 1000 : 0;
      lastFrame = now;

      drops.forEach((drop) => {
        drop.y += drop.speed * dt;
        if (drop.y > rect.height + FONT_SIZE) {
          drop.y = -FONT_SIZE - Math.random() * 80;
          drop.fruit = randomFruit();
          drop.speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
        }
      });

      draw();
      raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener('resize', resize);

    if (!reducedMotion && !isMobile) {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
