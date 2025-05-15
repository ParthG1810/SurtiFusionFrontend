import React, { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { history } from '../services/orders';
import { Box, Typography } from '@mui/material';

export default function UnauthorizedForm() {
  return <Typography variant="h4" color="error">403 – Forbidden</Typography>;
}