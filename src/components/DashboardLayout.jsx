import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, IconButton, Typography, Drawer,
  List, ListItemButton, ListItemIcon, ListItemText, Box
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const role = sessionStorage.getItem('role');
  const [open, setOpen] = useState(false);

  const menuItems = [
    { text: 'Meal Plans',   path: 'meal-plans' },
    { text: 'Place Order',  path: 'place-order' },
    { text: 'History',      path: 'history' },
    { text: 'Daily Counts', path: 'daily-counts' },
     { text: 'Label Format', path: 'label-format' },
    ...(role === 'admin' ? [{ text: 'Customers', path: 'customers' }] : [])
  ];

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed">
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setOpen(true)}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            SurtiFusion ERP
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Drawer open={open} onClose={() => setOpen(false)}>
        <List sx={{ width: 240 }}>
          {menuItems.map(item => (
            <ListItemButton
              key={item.path}
              onClick={() => { navigate(item.path); setOpen(false); }}
            >
              <ListItemIcon />
              <ListItemText primary={item.text} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow:1, p:3, mt:8 }}>
        <Outlet />
      </Box>
    </Box>
  );
}