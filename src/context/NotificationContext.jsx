import React, { createContext, useContext, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

const NotificationContext = createContext();
export const useNotification = () => useContext(NotificationContext);

export function NotificationProvider({ children }) {
  const [notif, setNotif] = useState({ open: false, message: '', severity: 'info' });

  const showNotification = ({ message, severity = 'info' }) => {
    setNotif({ open: true, message, severity });
  };

  const handleClose = () => setNotif(n => ({ ...n, open: false }));

  return (
    <NotificationContext.Provider value={showNotification}>
      {children}
      <Snackbar open={notif.open} autoHideDuration={5000} onClose={handleClose}>
        <Alert onClose={handleClose} severity={notif.severity} sx={{ width: '100%' }}>
          {notif.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}