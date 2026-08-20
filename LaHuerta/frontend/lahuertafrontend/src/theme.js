import { createTheme } from "@mui/material/styles";

const SITE_BLUE = '#4a7bc4';
const SITE_BLUE_DARK = '#3a6ab4';

// Mismos tokens que las CSS variables de src/index.css, para que MUI y Tailwind queden sincronizados.
const SURFACE_TOKENS = {
  light: {
    surface: '#f7f9fb',
    surfaceCard: '#ffffff',
    onSurface: '#2c3437',
    onSurfaceMuted: '#596064',
    borderSubtle: '#e3e9ed',
  },
  dark: {
    surface: '#1a1f23',
    surfaceCard: '#22282c',
    onSurface: '#e7ebee',
    onSurfaceMuted: '#9aa4ab',
    borderSubtle: '#333d43',
  },
};

export default function getTheme(mode = 'light') {
  const tokens = SURFACE_TOKENS[mode] ?? SURFACE_TOKENS.light;

  return createTheme({
    palette: {
      mode,
      primary: { main: SITE_BLUE, dark: SITE_BLUE_DARK, light: '#AFB9D4' },
      background: { default: tokens.surface, paper: tokens.surfaceCard },
      text: { primary: tokens.onSurface, secondary: tokens.onSurfaceMuted },
      divider: tokens.borderSubtle,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none' },
          outlined: {
            borderColor: SITE_BLUE,
            color: SITE_BLUE,
            '&:hover': { borderColor: SITE_BLUE_DARK, backgroundColor: 'rgba(74, 123, 196, 0.08)' },
          },
          contained: {
            backgroundColor: SITE_BLUE,
            color: '#fff',
            '&:hover': { backgroundColor: SITE_BLUE_DARK },
          },
        },
      },
      MuiCardActionArea: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: 'rgba(74, 123, 196, 0.08)',
            },
            '& .MuiCardActionArea-focusHighlight': {
              backgroundColor: SITE_BLUE,
              opacity: 0.12,
            },
          },
        },
      },
    },
  });
}
