import * as React from 'react';
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import MuiDrawer from '@mui/material/Drawer';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AccountCircle from '@mui/icons-material/AccountCircle';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import Collapse from '@mui/material/Collapse';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { authLogoutUrl } from '../../constants/urls';
import { useCsrfToken } from '../../hooks/useCsrfToken';
import { useAuth } from '../../context/AuthContext';
import logoLaHuerta from '../../assets/logo-lahuerta-sin-fondo.png';

const drawerWidth = 240;

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
});

const closedMixin = (theme) => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  backgroundColor: '#ffffff',
  color: '#2c3437',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  variants: [
    {
      props: ({ open }) => open,
      style: {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
      },
    },
  ],
}));

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    '& .MuiDrawer-paper': {
      backgroundColor: '#f0f4f7',
      borderRight: '1px solid #e3e9ed',
    },
    variants: [
      {
        props: ({ open }) => open,
        style: {
          ...openedMixin(theme),
          '& .MuiDrawer-paper': {
            ...openedMixin(theme),
            backgroundColor: '#f0f4f7',
            borderRight: '1px solid #e3e9ed',
          },
        },
      },
      {
        props: ({ open }) => !open,
        style: {
          ...closedMixin(theme),
          '& .MuiDrawer-paper': {
            ...closedMixin(theme),
            backgroundColor: '#f0f4f7',
            borderRight: '1px solid #e3e9ed',
          },
        },
      },
    ],
  }),
);

const BLUE = '#4a7bc4';

const isPathActive = (path, currentPath) => {
  if (!path) return false;
  if (path === '/') return currentPath === '/';
  return currentPath === path || currentPath.startsWith(path);
};

export default function MiniDrawer({title, menuOptions}) {
  const theme = useTheme();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const csrfToken = useCsrfToken();
  const navigate = useNavigate();
  const { clearUser, user } = useAuth();

  // Auto-expande el grupo cuyo hijo está activo
  const initialOpenGroups = React.useMemo(() => {
    const groups = {};
    menuOptions.forEach((item) => {
      if (Array.isArray(item.children)) {
        const hasActiveChild = item.children.some(c => isPathActive(c.path, location.pathname));
        if (hasActiveChild) groups[item.text] = true;
      }
    });
    return groups;
  }, []);
  const [openGroups, setOpenGroups] = React.useState(initialOpenGroups);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const handleNavigate = (path) => {
    if (!path) return;
    handleDrawerClose();
    navigate(path);
  };

  const toggleGroup = (groupText) => {
    setOpenGroups((prev) => ({ ...prev, [groupText]: !prev[groupText] }));
  };

  // Manejo del menú de usuario
  const handleUserMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    handleUserMenuClose();
    // TODO: Navegar a la página de perfil cuando esté implementada
    // navigate('/profile');
    alert('Página de perfil próximamente');
  };

  const handleLogout = async () => {
    handleUserMenuClose();
    try {
      await axios.post(
        authLogoutUrl,
        {},
        {
          withCredentials: true,
          headers: {
            'X-CSRFToken': csrfToken,
          },
        }
      );
      clearUser();
      navigate('/login');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      clearUser();
      navigate('/login');
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={[
              { marginRight: 2, color: '#596064' },
              open && { display: 'none' },
            ]}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
            <img src={logoLaHuerta} alt="La Huerta" style={{ height: 36, width: 'auto', objectFit: 'contain' }} />
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
          </Box>
          {/* Info de usuario + menú desplegable */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {user && (
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2, color: 'inherit' }}>
                  {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.email}
                </Typography>
                <Typography variant="caption" sx={{ color: '#596064', lineHeight: 1.2 }}>
                  {user.role}
                </Typography>
              </Box>
            )}
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls="user-menu"
              aria-haspopup="true"
              onClick={handleUserMenuOpen}
              sx={{ color: '#596064' }}
            >
              <AccountCircle />
            </IconButton>
          </Box>
          <Menu
            id="user-menu"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleUserMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={handleProfileClick}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              Perfil
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Cerrar Sesión
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" open={open}>
        <DrawerHeader>
          <IconButton onClick={handleDrawerClose} sx={{ color: '#596064' }}>
            {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List>
          {menuOptions.map((item) => {
            const isGroup = Array.isArray(item.children) && item.children.length > 0;
            const isGroupOpen = Boolean(openGroups[item.text]);
            const groupHasActiveChild = isGroup && item.children.some(c => isPathActive(c.path, location.pathname));
            const itemActive = !isGroup && isPathActive(item.path, location.pathname);

            const itemSx = (active) => ({
              minHeight: 50,
              px: 1.5,
              mx: 1,
              borderRadius: '8px',
              color: active ? BLUE : '#596064',
              backgroundColor: active ? `rgba(74,123,196,0.10)` : 'transparent',
              '&:hover': { backgroundColor: `rgba(74,123,196,0.08)`, color: BLUE },
              justifyContent: open ? 'initial' : 'center',
            });

            if (isGroup) {
              return (
                <React.Fragment key={item.text}>
                  <ListItem disablePadding sx={{ display: 'block' }}>
                    <ListItemButton
                      onClick={() => toggleGroup(item.text)}
                      sx={itemSx(groupHasActiveChild)}
                    >
                      <ListItemIcon
                        sx={[
                          { minWidth: 0, justifyContent: 'center', color: 'inherit' },
                          open ? { mr: 3 } : { mr: 'auto' },
                        ]}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }}
                        sx={[open ? { opacity: 1 } : { opacity: 0 }]}
                      />
                      {open ? (isGroupOpen ? <ExpandLess sx={{ color: 'inherit' }} /> : <ExpandMore sx={{ color: 'inherit' }} />) : null}
                    </ListItemButton>
                  </ListItem>

                  <Collapse in={isGroupOpen && open} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding sx={{ ml: 1, pl: 1, borderLeft: '1px solid rgba(74,123,196,0.15)' }}>
                      {item.children.map((child) => {
                        const childActive = isPathActive(child.path, location.pathname);
                        return (
                          <ListItem key={child.text} disablePadding sx={{ display: 'block' }}>
                            <ListItemButton
                              onClick={() => handleNavigate(child.path)}
                              sx={{
                                minHeight: 40,
                                pl: 3,
                                pr: 2,
                                mx: 1,
                                borderRadius: '8px',
                                color: childActive ? BLUE : '#596064',
                                backgroundColor: childActive ? 'rgba(74,123,196,0.06)' : 'transparent',
                                fontWeight: childActive ? 600 : 400,
                                '&:hover': { backgroundColor: 'rgba(74,123,196,0.06)', color: BLUE },
                              }}
                            >
                              <ListItemText
                                primary={child.text}
                                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: childActive ? 600 : 400 }}
                              />
                            </ListItemButton>
                          </ListItem>
                        );
                      })}
                    </List>
                  </Collapse>
                </React.Fragment>
              );
            }

            return (
              <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                <ListItemButton
                  onClick={() => handleNavigate(item.path)}
                  sx={itemSx(itemActive)}
                >
                  <ListItemIcon
                    sx={[
                      { minWidth: 0, justifyContent: 'center', color: 'inherit' },
                      open ? { mr: 3 } : { mr: 'auto' },
                    ]}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }}
                    sx={[open ? { opacity: 1 } : { opacity: 0 }]}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <DrawerHeader />
      </Box>
    </Box>
  );
}