import React from 'react';
import { Typography, Box } from '@mui/material';

export default function Unauthorized() {
  return (
    <Box textAlign="center" mt={8}>
      <Typography variant="h3" color="error">403</Typography>
      <Typography variant="h5">You do not have access to this page.</Typography>
    </Box>
  );
}