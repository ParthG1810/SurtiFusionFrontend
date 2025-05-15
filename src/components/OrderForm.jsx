// src/components/OrderForm.jsx

import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Button
} from '@mui/material';
import { useNotification } from '../context/NotificationContext';
import { list as listPlans } from '../services/mealPlans';
import { list as listCustomers } from '../services/customers';
import { place } from '../services/orders';

const DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function OrderForm() {
  const notify = useNotification();

  const [plans, setPlans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({
    customerId: '',
    mealPlanId: '',
    quantity: 1,
    selectedDays: [],
    startDate: '',
    endDate: ''
  });

  // Load dropdown data
  useEffect(() => {
    listPlans()
      .then(res => setPlans(res.data))
      .catch(err => notify({ message: err.message, severity: 'error' }));

    listCustomers()
      .then(res => setCustomers(res.data))
      .catch(err => notify({ message: err.message, severity: 'error' }));
  }, []);

  // Handle field changes
  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  // Submit handler
  const handleSubmit = async e => {
    e.preventDefault();

    const { customerId, mealPlanId, quantity, selectedDays, startDate, endDate } = form;
    if (!customerId || !mealPlanId || !startDate || !endDate) {
      notify({ message: 'Please fill in all required fields.', severity: 'warning' });
      return;
    }

    try {
      await place({
        customerId,
        startDate,
        endDate,
        items: [{ mealPlanId, quantity, selectedDays }]
      });
      notify({ message: 'Order placed successfully!', severity: 'success' });
      // Optionally reset:
      setForm({ customerId:'', mealPlanId:'', quantity:1, selectedDays:[], startDate:'', endDate:'' });
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      notify({ message: msg, severity: 'error' });
    }
  };

  return (
    <Paper sx={{ maxWidth: 600, mx: 'auto', p: 4, mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Place New Order
      </Typography>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'grid', gap: 2 }}
      >
        {/* Customer */}
        <FormControl fullWidth>
          <InputLabel id="customer-label">Customer</InputLabel>
          <Select
            labelId="customer-label"
            label="Customer"
            name="customerId"
            value={form.customerId}
            onChange={handleChange}
            required
          >
            {customers.map(c => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Meal Plan */}
        <FormControl fullWidth>
          <InputLabel id="plan-label">Meal Plan</InputLabel>
          <Select
            labelId="plan-label"
            label="Meal Plan"
            name="mealPlanId"
            value={form.mealPlanId}
            onChange={handleChange}
            required
          >
            {plans.map(p => (
              <MenuItem key={p.id} value={p.id}>
                {p.name} — ${p.price}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Quantity */}
        <TextField
          label="Quantity"
          name="quantity"
          type="number"
          inputProps={{ min: 1 }}
          value={form.quantity}
          onChange={handleChange}
          fullWidth
          required
        />

        {/* Selected Days */}
        <FormControl fullWidth>
          <InputLabel id="days-label">Selected Days</InputLabel>
          <Select
            labelId="days-label"
            label="Selected Days"
            name="selectedDays"
            multiple
            value={form.selectedDays}
            onChange={handleChange}
            input={<OutlinedInput label="Selected Days" />}
            renderValue={selected => selected.join(', ')}
          >
            {DAY_OPTIONS.map(day => (
              <MenuItem key={day} value={day}>
                <Checkbox checked={form.selectedDays.includes(day)} />
                <ListItemText primary={day} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Start Date */}
        <TextField
          label="Start Date"
          name="startDate"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={form.startDate}
          onChange={handleChange}
          fullWidth
          required
        />

        {/* End Date */}
        <TextField
          label="End Date"
          name="endDate"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={form.endDate}
          onChange={handleChange}
          fullWidth
          required
        />

        {/* Submit */}
        <Button type="submit" variant="contained" size="large">
          Place Order
        </Button>
      </Box>
    </Paper>
  );
}
