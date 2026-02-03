import { createTheme } from "@mui/material/styles";

const SITE_BLUE = '#5d89c8';
const SITE_BLUE_DARK = '#4a73a8';

const theme = createTheme({
  palette: {
    primary: { main: SITE_BLUE, dark: SITE_BLUE_DARK, light: '#AFB9D4' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none' },
        outlined: {
          borderColor: SITE_BLUE,
          color: SITE_BLUE,
          '&:hover': { borderColor: SITE_BLUE_DARK, backgroundColor: 'rgba(93, 137, 200, 0.08)' },
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
            backgroundColor: 'rgba(93, 137, 200, 0.08)',
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

export default theme;
