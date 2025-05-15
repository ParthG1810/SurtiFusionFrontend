import React, { useState, useEffect } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import {
  Box, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField
} from '@mui/material';
import { useNotification } from '../context/NotificationContext';
import { list, create, update, remove } from '../services/customers';

export default function CustomerTable() {
  const notify = useNotification();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name:'', phone:'', address:'' });

  const fetch = async () => {
    try { setRows((await list()).data); } 
    catch (e) { notify({ message: e.message, severity:'error' }); }
  };
  useEffect(() => {
  fetch();   // call your async fetch function
}, []);      // empty deps → on mount only

  const openForm = row => {
    if (row) { setEditId(row.id); setForm(row); }
    else     { setEditId(null); setForm({ name:'', phone:'', address:'' }); }
    setOpen(true);
  };

  const save = async () => {
    try {
      if (editId) await update(editId, form);
      else         await create(form);
      notify({ message: editId?'Updated':'Created', severity:'success' });
      fetch(); setOpen(false);
    } catch(e) { notify({ message: e.response?.data?.message||e.message, severity:'error' }); }
  };

  const del = id => {
    remove(id).then(fetch);
  };

  const cols = [
    { field:'id', headerName:'ID', width:70 },
    { field:'name', headerName:'Name', width:150 },
    { field:'phone', headerName:'Phone', width:130 },
    { field:'address', headerName:'Address', width:200 },
    { field:'actions', type:'actions', width:80,
      getActions: ({id,row})=>[
        <GridActionsCellItem label="Edit" onClick={()=>openForm(row)} showInMenu />,
        <GridActionsCellItem label="Delete" onClick={()=>del(id)} showInMenu />
      ]}
  ];

  return (
    <Box sx={{ height:500, width:'100%' }}>
      <Button variant="contained" onClick={()=>openForm()} sx={{ mb:1 }}>
        Add Customer
      </Button>
      <DataGrid rows={rows} columns={cols} pageSize={8} rowsPerPageOptions={[8]} />

      <Dialog open={open} onClose={()=>setOpen(false)}>
        <DialogTitle>{editId?'Edit':'New'} Customer</DialogTitle>
        <DialogContent>
          {['name','phone','address'].map(key=>(
            <TextField
              key={key}
              fullWidth
              margin="dense"
              label={key.charAt(0).toUpperCase()+key.slice(1)}
              name={key}
              value={form[key]}
              onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpen(false)}>Cancel</Button>
          <Button onClick={save}>{editId?'Update':'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}