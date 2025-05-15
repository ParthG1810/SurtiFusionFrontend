import React from 'react';
import { useForm } from 'react-hook-form';
import { TextField, Button, Box, Paper, Typography } from '@mui/material';
import { useNotification } from '../context/NotificationContext';
import { login } from '../services/users';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function LoginForm() {
  const navigate = useNavigate();
  const notify   = useNotification();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async creds => {
    try {
      const { data: resp } = await login(creds);
      const { token, user } = resp;
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('role',  user.role);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      notify({ message: 'Login successful', severity: 'success' });
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      notify({ message: msg, severity: 'error' });
    }
  };

  return (
    <Box display="flex" justifyContent="center" mt={8}>
      <Paper sx={{ p:4, width:360 }}>
        <Typography variant="h5" mb={2}>User Login</Typography>
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            fullWidth label="Username" margin="normal"
            {...register('username', { required: 'Required' })}
            error={!!errors.username}
            helperText={errors.username?.message}
          />
          <TextField
            fullWidth label="Password" type="password" margin="normal"
            {...register('password', { required: 'Required' })}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <Button type="submit" variant="contained" fullWidth sx={{mt:2}} disabled={isSubmitting}>
            {isSubmitting ? 'Logging in…' : 'Log In'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}