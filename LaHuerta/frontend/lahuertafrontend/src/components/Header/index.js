import * as React from 'react';
import { styled, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
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
import AccountCircle from '@mui/icons-material/AccountCircleOutlined';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import PersonIcon from '@mui/icons-material/PersonOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
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
import { useThemeMode } from '../../context/ThemeModeContext';
import { ROLE_CONFIG } from '../../constants/roles';
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
  backgroundColor: 'var(--color-surface-card)',
  color: 'var(--color-on-surface)',
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
      backgroundColor: 'var(--color-surface-low)',
      borderRight: '1px solid var(--color-border-subtle)',
      scrollbarColor: 'var(--color-border-subtle) transparent',
      scrollbarWidth: 'thin',
      '&::-webkit-scrollbar': { width: '8px' },
      '&::-webkit-scrollbar-track': { background: 'transparent' },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: 'var(--color-border-subtle)',
        borderRadius: '4px',
      },
      '&::-webkit-scrollbar-thumb:hover': {
        backgroundColor: 'var(--color-on-surface-muted)',
      },
    },
    variants: [
      {
        props: ({ open }) => open,
        style: {
          ...openedMixin(theme),
          '& .MuiDrawer-paper': {
            ...openedMixin(theme),
            backgroundColor: 'var(--color-surface-low)',
            borderRight: '1px solid var(--color-border-subtle)',
          },
        },
      },
      {
        props: ({ open }) => !open,
        style: {
          ...closedMixin(theme),
          '& .MuiDrawer-paper': {
            ...closedMixin(theme),
            backgroundColor: 'var(--color-surface-low)',
            borderRight: '1px solid var(--color-border-subtle)',
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

export default function MiniDrawer({title, menuOptions, open, onOpenChange}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();
  const setOpen = onOpenChange;
  const [pinned, setPinned] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const csrfToken = useCsrfToken();
  const navigate = useNavigate();
  const { clearUser, user } = useAuth();
  const { mode, toggleMode } = useThemeMode();

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
    setPinned(false);
  };

  // Al anclar, el menú queda abierto y no se cierra al navegar entre pantallas.
  // Al desanclar, vuelve al comportamiento normal (se abre/cierra manualmente).
  const handleTogglePin = () => {
    setPinned((prev) => {
      const next = !prev;
      if (next) setOpen(true);
      return next;
    });
  };

  const handleNavigate = (path) => {
    if (!path) return;
    // En mobile el menú siempre se cierra al navegar, sin importar el ancla: no tiene
    // sentido dejarlo fijo abierto tapando la pantalla en una vista chica.
    if (isMobile || !pinned) handleDrawerClose();
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
    navigate('/profile');
  };

  const handleToggleTheme = () => {
    handleUserMenuClose();
    toggleMode();
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

  const drawerMenuContent = (
    <>
      <DrawerHeader>
        {/* Anclar el menú no aplica en mobile: ahí siempre se cierra al elegir una opción. */}
        {!isMobile && (
          <IconButton
            onClick={handleTogglePin}
            aria-label={pinned ? 'Desanclar menú' : 'Anclar menú'}
            sx={{ color: pinned ? BLUE : 'var(--color-on-surface-muted)' }}
          >
            {pinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
          </IconButton>
        )}
        <IconButton onClick={handleDrawerClose} sx={{ color: 'var(--color-on-surface-muted)' }}>
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
            color: active ? BLUE : 'var(--color-on-surface-muted)',
            backgroundColor: active ? `rgba(74,123,196,0.10)` : 'transparent',
            '&:hover': { backgroundColor: `rgba(74,123,196,0.08)`, color: BLUE },
            justifyContent: open ? 'initial' : 'center',
          });

          if (isGroup) {
            const groupClickHandler = item.path
              ? () => handleNavigate(item.path)
              : () => toggleGroup(item.text);

            return (
              <React.Fragment key={item.text}>
                <ListItem disablePadding sx={{ display: 'block' }}>
                  <ListItemButton
                    onClick={groupClickHandler}
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
                    {open ? (
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); toggleGroup(item.text); }}
                        sx={{ color: 'inherit', p: 0.5 }}
                      >
                        {isGroupOpen ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    ) : null}
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
                              color: childActive ? BLUE : 'var(--color-on-surface-muted)',
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
    </>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" open={!isMobile && open}>
        <Toolbar>
          <IconButton
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={[
              { marginRight: 2, color: 'var(--color-on-surface-muted)' },
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
                  {(isMobile
                    ? user.first_name
                    : [user.first_name, user.last_name].filter(Boolean).join(' ')
                  ) || user.email}
                </Typography>
                <Box
                  component="span"
                  sx={{
                    display: 'inline-block',
                    mt: 0.4,
                    px: 1.1,
                    py: 0.15,
                    borderRadius: '999px',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    lineHeight: '16px',
                    backgroundColor: (ROLE_CONFIG[user.role] || {}).bg || 'var(--color-surface-low)',
                    color: (ROLE_CONFIG[user.role] || {}).color || 'var(--color-on-surface-muted)',
                  }}
                >
                  {(ROLE_CONFIG[user.role] || {}).label || user.role}
                </Box>
              </Box>
            )}
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls="user-menu"
              aria-haspopup="true"
              onClick={handleUserMenuOpen}
              sx={{ color: 'var(--color-on-surface-muted)' }}
            >
              {user?.avatar ? (
                <Avatar src={user.avatar} sx={{ width: 32, height: 32 }} />
              ) : (
                <AccountCircle />
              )}
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
            slotProps={{
              paper: {
                sx: {
                  minWidth: 220,
                  mt: 1,
                  borderRadius: '10px',
                  backgroundColor: 'var(--color-surface-card)',
                  color: 'var(--color-on-surface)',
                },
              },
            }}
          >
            {user && (
              <Box sx={{ px: 2, py: 1.25 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                  {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.email}
                </Typography>
                {user.email && (
                  <Typography variant="caption" sx={{ color: 'var(--color-on-surface-muted)' }}>
                    {user.email}
                  </Typography>
                )}
              </Box>
            )}
            <Divider />
            <MenuItem onClick={handleProfileClick} sx={{ py: 1 }}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              Perfil
            </MenuItem>
            <MenuItem onClick={handleToggleTheme} sx={{ py: 1 }}>
              <ListItemIcon>
                {mode === 'dark' ? <DarkModeOutlinedIcon fontSize="small" /> : <LightModeOutlinedIcon fontSize="small" />}
              </ListItemIcon>
              Cambiar tema
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ py: 1 }}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Cerrar Sesión
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      {isMobile ? (
        <MuiDrawer
          variant="temporary"
          open={open}
          onClose={handleDrawerClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              backgroundColor: 'var(--color-surface-low)',
              borderRight: '1px solid var(--color-border-subtle)',
              scrollbarColor: 'var(--color-border-subtle) transparent',
              scrollbarWidth: 'thin',
              '&::-webkit-scrollbar': { width: '8px' },
              '&::-webkit-scrollbar-track': { background: 'transparent' },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'var(--color-border-subtle)',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                backgroundColor: 'var(--color-on-surface-muted)',
              },
            },
          }}
        >
          {drawerMenuContent}
        </MuiDrawer>
      ) : (
        <Drawer variant="permanent" open={open}>
          {drawerMenuContent}
        </Drawer>
      )}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <DrawerHeader />
      </Box>
    </Box>
  );
}