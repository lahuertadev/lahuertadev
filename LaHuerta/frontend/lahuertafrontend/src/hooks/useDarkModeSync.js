import { useEffect, useMemo } from 'react';
import { useThemeMode } from '../context/ThemeModeContext';
import getTheme from '../theme';

/**
 * Aplica la clase .dark al documento según la preferencia de tema mientras el
 * componente que llama al hook está montado, y devuelve el theme de MUI acorde.
 * Se limpia al desmontar para no filtrar el modo oscuro a pantallas que deben
 * quedar siempre en claro (ver App.js y ThemeModeContext).
 */
export const useDarkModeSync = () => {
  const { mode } = useThemeMode();
  const theme = useMemo(() => getTheme(mode), [mode]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
    return () => document.documentElement.classList.remove('dark');
  }, [mode]);

  return theme;
};
