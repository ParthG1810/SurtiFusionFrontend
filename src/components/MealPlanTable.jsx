import React, { useState, useEffect } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import {
  Box, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem
} from '@mui/material';
import { useNotification } from '../context/NotificationContext';
import { list, create, update, remove } from '../services/mealPlans';

export default function MealPlanTable() {
  const notify = useNotification();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({
    name:'', frequency:'Weekly', days:'Mon-Fri', items:'', price:''
  });

  const fetch = async () => {
    try { setRows((await list()).data); }
    catch(e) { notify({ message:e.message, severity:'error' }); }
  };
 useEffect(() => {
  fetch();   // call your async fetch function
}, []);      // empty deps → on mount only

  const openForm = row => {
    if(row) { setEdit(row.id); setForm(row);} else { setEdit(null); setForm({ name:'', frequency:'Weekly', days:'Mon-Fri', items:'', price:'' }); }
    setOpen(true);
  };

  const save = async () => {
    try {
      if(edit) await update(edit, form);
      else      await create(form);
      notify({ message: edit?'Updated':'Created', severity:'success' });
      fetch(); setOpen(false);
    } catch(e) { notify({ message:e.response?.data?.message||e.message, severity:'error' }); }
  };

  const del = id => remove(id).then(fetch);
  
  const cols = [
    { field:'id', headerName:'ID', width:70 },
    { field:'name', headerName:'Name', width:150 },
    { field:'frequency', headerName:'Frequency', width:100 },
    { field:'days', headerName:'Days', width:100 },
    { field:'items', headerName:'Items', width:200 },
    { field:'price', headerName:'Price', width:100 },
    { field:'actions', type:'actions', width:80,
      getActions: ({id,row})=>[
        <GridActionsCellItem label="Edit" onClick={()=>openForm(row)} showInMenu />,
        <GridActionsCellItem label="Delete" onClick={()=>del(id)} showInMenu />
      ]}
  ];

  return (
    <Box sx={{ height:500, width:'100%' }}>
      <Button variant="contained" onClick={()=>openForm()} sx={{ mb:1 }}>
        Add Plan
      </Button>
      <DataGrid rows={rows} columns={cols} pageSize={8} rowsPerPageOptions={[8]} />

      <Dialog open={open} onClose={()=>setOpen(false)}>
        <DialogTitle>{edit?'Edit':'New'} Plan</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth label="Name" name="name" margin="dense"
            value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
          />
          <TextField
            select fullWidth label="Frequency" name="frequency" margin="dense"
            value={form.frequency} onChange={e=>setForm(f=>({...f,frequency:e.target.value}))}
          >{['Weekly','Monthly'].map(v=><MenuItem key={v} value={v}>{v}</MenuItem>)}</TextField>
          <TextField
            select fullWidth label="Days" name="days" margin="dense"
            value={form.days} onChange={e=>setForm(f=>({...f,days:e.target.value}))}
          >{['Mon-Fri','Mon-Sat'].map(v=><MenuItem key={v} value={v}>{v}</MenuItem>)}</TextField>
          <TextField
            fullWidth label="Items" name="items" margin="dense"
            value={form.items} onChange={e=>setForm(f=>({...f,items:e.target.value}))}
          />
          <TextField
            fullWidth label="Price" name="price" type="number" margin="dense"
            value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpen(false)}>Cancel</Button>
          <Button onClick={save}>{edit?'Update':'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}