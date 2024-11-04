import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import { useNavigate } from 'react-router-dom';

function Header({ title, menuOptions }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const navigate = useNavigate();

  //* Función para manejar la apertura/cierre del drawer
  const toggleDrawer = (open) => () => {
    setIsDrawerOpen(open);
  };

  //* Función para redireccionar a las distintas vistas
  const handleMenuClick = (option) => {
    if (option === 'Gastos') {
      navigate('/expense/list');
    } else if (option === 'Inicio') {
      navigate('/');
    } else if (option === 'Clientes') {
      navigate('/');
    }
  }
  return (
    <>
      {/* AppBar con menú hamburguesa */}
      <AppBar 
        position="static"
        className='!bg-gradient-to-r from-green-lahuerta to-brown-lahuerta'>
        <Toolbar>
          {/* Botón de menú hamburguesa */}
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={toggleDrawer(true)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1 }} />

          <Typography variant="h6" component="div">
            {title}
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={isDrawerOpen} onClose={toggleDrawer(false)}>
        <Box
          sx={{ width: 250 }}
          role="presentation"
          onClick={toggleDrawer(false)}
          onKeyDown={toggleDrawer(false)}
        >
          <List>
            {menuOptions.map((option, index) => (
              <ListItem button key={index} onClick={() => handleMenuClick(option)}>
                <ListItemText primary={option} />
              </ListItem>
            ))}
          </List>
          <Divider />
        </Box>
      </Drawer>
    </>
  );
}

export default Header;