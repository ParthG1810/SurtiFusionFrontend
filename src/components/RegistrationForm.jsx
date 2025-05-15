import React from 'react';
import { useForm } from 'react-hook-form';
import { TextField, Button, Box, Paper, Typography } from '@mui/material';
import { useNotification } from '../context/NotificationContext';
import { register } from '../services/users';
import { useNavigate } from 'react-router-dom';

export default function RegisterForm() {
  const navigate = useNavigate();
  const notify   = useNotification();
  const { register: rf, handleSubmit, formState:{ errors, isSubmitting } } = useForm();

  const onSubmit = async data => {
    try {
      await register(data);
      notify({ message: 'Registration successful', severity: 'success' });
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      notify({ message: msg, severity: 'error' });
    }
  };

  return (
    <Box display="flex" justifyContent="center" mt={8}>
      <Paper sx={{ p:4, width:360 }}>
        <Typography variant="h5" mb={2}>User Registration</Typography>
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            fullWidth label="Username" margin="normal"
            {...rf('username', { required: 'Required' })}
            error={!!errors.username}
            helperText={errors.username?.message}
          />
          <TextField
            fullWidth label="Password" type="password" margin="normal"
            {...rf('password', { required: 'Required' })}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <Button type="submit" variant="contained" fullWidth sx={{mt:2}} disabled={isSubmitting}>
            {isSubmitting ? 'Registering…' : 'Register'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}