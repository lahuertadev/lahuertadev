// src/components/Footer.js
import React from 'react';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';

const Footer = () => {
  return (
    <AppBar position="static" color="primary" sx={{ top: 'auto', bottom: 0 }}>
      <Toolbar>
        <Box sx={{ flexGrow: 1, textAlign: 'center' }}>
          <Typography variant="body1">
            &copy; {new Date().getFullYear()} La Huerta. Todos los derechos reservados.
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Footer;
