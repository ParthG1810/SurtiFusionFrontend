// src/components/DailyCount.jsx

import React, { useState, useEffect, useRef } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box, Typography, Button } from "@mui/material";
import { daily } from "../services/orders";
import { useNotification } from "../context/NotificationContext";
import { QRCodeSVG } from "qrcode.react";
import api from "../services/api";

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
      .then((res) => {
        console.log(res.data);
        const data = res.data.map((item, idx) => {
          const o = item.order;
          const plan = item.meal_plan;
          const cust = o.customer || {};
          return {
            id: idx + 1,
            plan: plan?.name || plan?.planname,
            customer: cust?.name,
            address: cust.address,
            qty: item.quantity,
          };
        });
        setRows(data);
      })
      .catch((err) => notify({ message: err.message, severity: "error" }));
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
    const unchecked = remaining.filter((r) => !packedIds.has(r.id));

    if (unchecked.length === 0) {
      notify({ message: "Done with packing for today!", severity: "success" });
      setPacking(false);
    } else {
      notify({
        message:
          "These tiffins remain to pack – please pack them and try again.",
        severity: "warning",
      });
      setRemaining(unchecked);
      setSelectionModel([]); // reset for next pass
    }
  };

  // New: Print Labels button handler
  const handlePrintLabels = () => {
    // 1. Load the saved raw HTML from Quill
    const savedTpl = localStorage.getItem("labelTemplateHTML");
    if (!savedTpl) {
      notify({
        message: "Please save your label template first.",
        severity: "warning",
      });
      return;
    }

    // 2. Build distinct customer → address map
    const custMap = rows.reduce((m, r) => {
      if (!m.has(r.customer)) m.set(r.customer, r.address || "");
      return m;
    }, new Map());

    // 3. Build one giant HTML document
    const labelsHtml = Array.from(custMap.entries())
      .map(([name, address]) => {
        // a) Inject your dynamic fields
        let inner = savedTpl
          .replace(/{{customerName}}/g, name)
          .replace(/{{customerAddress}}/g, address);

        // b) Swap your QR placeholder DIV for an <img>
        inner = inner.replace(
          /<div id="qr-placeholder"[^>]*><\/div>/,
          `<div class="qr">
         <img
           src="https://chart.googleapis.com/chart?chs=60x60&cht=qr&chl=${encodeURIComponent(
             name
           )}"
           width="60" height="60"
         />
       </div>`
        );

        // c) **Wrap it** in Quill’s container classes so CSS applies:
        return `
      <div class="label">
        <div class="ql-container ql-snow">
          <div class="ql-editor">
            ${inner}
          </div>
        </div>
      </div>
    `;
      })
      .join("");

    // 4) Produce the final HTML document, including Quill’s CSS
    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <!-- Quill Snow Theme -->
  <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
  <style>
    @media print {
      @page { size: 4in 2in; margin: 0 }
      body { margin: 0 }
    }
    /* container for each 4×2″ label */
    .label {
      position: relative;
      width: 4in; height: 2in;
      padding: 0.2in;
      box-sizing: border-box;
      page-break-after: always;
      overflow: hidden;
    }
    /* ensure the Quill editor area fills the label */
    .ql-container {
      border: none !important;
      height: 100% !important;
      overflow: visible !important;
    }
    .qr {
      position: absolute;
      bottom: 10px;
      left: 10px;
    }
  </style>
</head>
<body>
  ${labelsHtml}
</body>
</html>`;

    // 5) Print it via a hidden iframe
    const iframe = document.createElement("iframe");
    Object.assign(iframe.style, {
      position: "fixed",
      width: "0",
      height: "0",
      border: "0",
      right: "0",
      bottom: "0",
    });
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    iframe.onload = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 500);
    };
  };
  // Rows to display: full list or just remaining
  const displayRows = packing ? remaining : rows;

  const columns = [
    { field: "plan", headerName: "Meal Plan", width: 200 },
    { field: "customer", headerName: "Customer", width: 180 },
    /*{ field: 'address',  headerName: 'Address',   width: 200 }, // optional*/
    { field: "qty", headerName: "Quantity", width: 100 },
  ];

  return (
    <Box sx={{ width: "100%", mt: 2 }}>
      <Typography variant="h6" mb={1}>
        Today's Tiffin Counts
      </Typography>

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
        onSelectionModelChange={(newSelection) =>
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

/*<div class="quill " style="width: 4in; height: 2in; margin: auto; overflow: hidden; pointer-events: none;"><div class="ql-container ql-snow ql-disabled"><div class="ql-editor" data-gramm="false" contenteditable="false"><p><img src=""></p><p class="ql-align-right"><span style="color: rgb(209, 105, 105);">Alice Smith</span></p><p><span style="color: rgb(209, 105, 105);">123 Main St, Springfield</span></p><p><em class="ql-size-huge" style="color: rgb(209, 105, 105);"><u>123 Main St, Springfield</u></em></p><p class="ql-align-center"><span style="color: rgb(209, 105, 105);">123 Main St, Springfield</span></p><p class="ql-align-right"><strong style="color: rgb(209, 105, 105);">123 Main St, Springfield</strong></p></div><div class="ql-clipboard" contenteditable="true" tabindex="-1"></div></div></div>*/
