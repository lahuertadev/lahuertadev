// src/components/Header.js
import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Button from '@mui/material/Button';
import { Box } from '@mui/material';

const Header = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        {/* Icono de menú
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton> */}

        {/* Título */}
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          La Huerta
        </Typography>

        {/* Botones */}
        <Box>
          <Button color="inherit">Inicio</Button>
          <Button color="inherit">Sobre nosotros</Button>
          <Button color="inherit">Contacto</Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;