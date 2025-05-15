// src/components/DailyCount.jsx

import React, { useState, useEffect,useRef } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Typography, Button } from '@mui/material';
import { daily } from '../services/orders';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
export default function DailyCount() {
  const notify = useNotification();
const printRef = useRef();
  // All tiffins for today
  const [rows, setRows] = useState([]);
  // Subset remaining to pack
  const [remaining, setRemaining] = useState([]);
  // Are we in “packing” mode?
  const [packing, setPacking] = useState(false);
  // IDs of rows that user has checked as “packed”
  const [selectionModel, setSelectionModel] = useState([]);

  // Load data once
  useEffect(() => {
    daily()
      .then(res => {
        console.log(res.data);
        const data = res.data.map((item, idx) => {
          const o = item.order;
          const plan = item.meal_plan;
          const cust = o.customer || {};
          return {
            id: idx+1,
            plan: plan?.name || plan?.planname,
            customer: cust?.name,
            address:  cust.address,  
            qty: item.quantity
          };
        });
        setRows(data);
      })
      .catch(err => notify({ message: err.message, severity: 'error' }));
  }, []);

  // Start Packing: initialize remaining list
  const handleStart = () => {
    setRemaining(rows);
    setSelectionModel([]);
    setPacking(true);
  };

  // End Packing: find unchecked = still to pack
  const handleEnd = () => {
    const packedIds = new Set(selectionModel);
    const unchecked = remaining.filter(r => !packedIds.has(r.id));

    if (unchecked.length === 0) {
      notify({ message: 'Done with packing for today!', severity: 'success' });
      setPacking(false);
    } else {
      notify({
        message: 'These tiffins remain to pack – please pack them and try again.',
        severity: 'warning'
      });
      setRemaining(unchecked);
      setSelectionModel([]); // reset for next pass
    }
  };

   // New: Print Labels button handler
 const handlePrintLabels = () => {
    const defaultTpl = {
  line1: 'Surti Fusion',
  line2: '{{customerName}}',
  line3: '{{customerAddress}}'
};

// Load saved or fall back:
const tpl = JSON.parse(localStorage.getItem('labelTemplate') || 'null') || defaultTpl;
  console.log(rows);
   // Distinct customers with addresses
  const distinctData = Array.from(
    rows.reduce((map, r) => {
      if (!map.has(r.customer)) map.set(r.customer, r.address|| '');
      return map;
    }, new Map())
  ); // array of [name, address]

    // Build printable HTML
    const html = `
    <html>
      <head>
        <style>
          @media print {
            @page { size: 4in 2in; margin: 0; }
            body { margin: 0; }
          }
          .label {
            width: 4in; height: 2in;
            padding: 0.2in; box-sizing: border-box;
            page-break-after: always;
          }
          .line1 { text-align: center; font-size: 24px; font-weight: bold; }
          .line2 { margin-top: 0.2in; font-size: 20px; }
          .line3 { margin-top: 0.1in; font-size: 18px; }
        </style>
      </head>
      <body>
        ${distinctData.map(([name, address]) => `
          <div class="label">
            <div class="line1">${tpl.line1}</div>
            <div class="line2">${tpl.line2.replace('{{customerName}}', name)}</div>
            <div class="line3">${tpl.line3.replace('{{customerAddress}}', address || '')}</div>
          </div>
        `).join('')}
      </body>
    </html>
  `;
   const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  // 5) Write to iframe and trigger print
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  // Wait for content to load before printing
  iframe.onload = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    // remove the iframe after printing
    setTimeout(() => document.body.removeChild(iframe), 500);
  };
};
  // Rows to display: full list or just remaining
  const displayRows = packing ? remaining : rows;

  const columns = [
    { field: 'plan',     headerName: 'Meal Plan', width: 200 },
    { field: 'customer', headerName: 'Customer',  width: 180 },
    /*{ field: 'address',  headerName: 'Address',   width: 200 }, // optional*/
    { field: 'qty',      headerName: 'Quantity',  width: 100 },
  ];

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Typography variant="h6" mb={1}>Today's Tiffin Counts</Typography>

      {!packing ? (
        <Button variant="contained" onClick={handleStart} sx={{ mb: 2 }}>
          Start Packing
        </Button>
      ) : (
        <Button
          variant="contained"
          color="secondary"
          onClick={handleEnd}
          sx={{ mb: 2 }}
        >
          End Packing
        </Button>
      )}

 {/* New Print Labels button */}
     <Button variant="outlined" onClick={handlePrintLabels} sx={{ ml: 1 }}>
  Print Labels
</Button>

      <DataGrid
        rows={displayRows}
        columns={columns}
        pageSize={5}
        rowsPerPageOptions={[5]}
        autoHeight
        checkboxSelection={packing}
        disableSelectionOnClick
        selectionModel={selectionModel}
        onSelectionModelChange={newSelection =>
          setSelectionModel(newSelection)
        }
      />
    </Box>
  );
}


/*import React, { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { daily } from '../services/orders';
import { useNotification } from '../context/NotificationContext';
import { Box, Typography } from '@mui/material';

export default function DailyCount() {
  const notify = useNotification();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    daily()
      .then(res => {
        const data = res.data.map((item, idx) => {
          const o = item.order;
          const plan = item.meal_plan;
          return {
            id: idx,
            plan: plan?.name || plan?.planname,
            customer: o.customer?.name,
            qty: item.quantity
          };
        });
        setRows(data);
      })
      .catch(err => notify({ message:err.message, severity:'error' }));
  }, []);

  const columns = [
    { field:'plan',     headerName:'Meal Plan', width:200 },
    { field:'customer', headerName:'Customer',  width:180 },
    { field:'qty',      headerName:'Quantity',  width:100 }
  ];

  return (
    <Box sx={{ height:400, width:'100%', mt:2 }}>
      <Typography variant="h6" mb={1}>Today's Tiffin Counts</Typography>
      <DataGrid rows={rows} columns={columns} pageSize={5} />
    </Box>
  );
}*/