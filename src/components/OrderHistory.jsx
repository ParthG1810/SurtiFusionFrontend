import React, { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { history } from '../services/orders';
import { useNotification } from '../context/NotificationContext';
import { Box, Typography } from '@mui/material';

export default function OrderHistory() {
  const notify = useNotification();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    history()
      .then(res => {
        const data = res.data.map(o => {
          const items = (o.orderItems || []).map(i => {
            const planName = i.MealPlan?.name || i.MealPlan?.planname;
            return `${i.quantity}×${planName}`;
          }).join(', ');
          return {
            id: o.id,
            customer: o.customer?.name,
            dates: `${o.startDate} → ${o.endDate}`,
            items: o.order_items
           .map(i =>{
        // i.MealPlan.name is the plan name from the back-end include
        const planName = i.meal_plan?.name || 'Unknown Plan';
        return `${i.quantity}×${planName}`;
      })
           .join(', ')
          };
        });
        setRows(data);
      })
      .catch(err => notify({ message: err.message, severity:'error' }));
  }, []);

  const columns = [
    { field: 'id',       headerName: 'Order ID', width:100 },
    { field: 'customer', headerName: 'Customer', width:180 },
    { field: 'dates',    headerName: 'Period',   width:200 },
    { field: 'items',    headerName: 'Items',    width:300 }
  ];

  return (
    <Box sx={{ height:400, width:'100%', mt:2 }}>
      <Typography variant="h6" mb={1}>Order History</Typography>
      <DataGrid rows={rows} columns={columns} pageSize={5} />
    </Box>
  );
}