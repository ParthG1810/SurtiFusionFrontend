// src/components/DailyCount.jsx

import React, { useState, useEffect, useRef } from "react";
import "../css/DailyCount.css";
import printJS from "print-js";
import ReactQuill, { Quill } from "react-quill";
import { DataGrid } from "@mui/x-data-grid";
import {
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
} from "@mui/material";
import { daily } from "../services/orders";
import { useNotification } from "../context/NotificationContext";
import { QRCodeSVG } from "qrcode.react";
import api from "../services/api";

export default function DailyCount() {
  const notify = useNotification();
  const [printHtml, setPrintHtml] = useState("");
  // All tiffins for today
  const [rows, setRows] = useState([]);
  // Subset remaining to pack
  const [remaining, setRemaining] = useState([]);
  // Are we in “packing” mode?
  const [packing, setPacking] = useState(false);
  // IDs of rows that user has checked as “packed”
  const [selectionModel, setSelectionModel] = useState([]);
  const [templateHtml, setTemplateHtml] = useState("");
  const [previewCustomer, setPreviewCustomer] = useState(null);
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
        // set default preview customer to first in list
        if (data.length) setPreviewCustomer(data[0]);
      })
      .catch((err) => notify({ message: err.message, severity: "error" }));
    // fetch saved label template
    api
      .get("/label-template")
      .then(({ data }) => {
        setTemplateHtml(data.content || "");
      })
      .catch((err) => {
        console.error(err);
        notify({ message: "Failed to load template", severity: "error" });
      });
  }, [notify]);
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
  const handlePrintLabels = async () => {
    // 1. Fetch the saved template HTML
    let tpl = "";
    try {
      const { data } = await api.get("/label-template");
      tpl = data.content || "";
    } catch (err) {
      return notify({ message: "Failed to load template", severity: "error" });
    }
    if (!tpl) {
      return notify({
        message: "No saved template to print",
        severity: "warning",
      });
    }

    // 2. Build distinct customer → address map
    const custMap = rows.reduce((m, r) => {
      if (!m.has(r.customer)) m.set(r.customer, r.address || "");
      return m;
    }, new Map());

    // 3. Generate each label’s inner HTML
    const labelsHtml = Array.from(custMap.entries())
      .map(([name, address]) => {
        // inject fields
        let inner = tpl
          .replace(/{{customerName}}/g, name)
          .replace(/{{customerAddress}}/g, address);
        console.log(inner);
        // b) swap QR placeholder for <img>
        inner = inner.replace(
          /<div id="qr-placeholder"[^>]*><\/div>/,
          `<div class="qr"><img
            src="https://chart.googleapis.com/chart?chs=60x60&cht=qr&chl=${encodeURIComponent(
              name
            )}"
            width="60" height="60" alt="QR Code"/></div>`
        );
        // c) wrap in Quill containers
        return `
       <div class="label" style="width: 4.5in; height: 2.5in;  overflow: hidden; pointer-events: none;" >
          <div class="ql-container ql-snow ">
           <div class="ql-editor" style="width: 4in; height: 2in;  overflow: hidden; pointer-events: none;">
             ${inner}
           </div>
         </div>
       </div>
     `;
      })
      .join("\n");
    setPrintHtml(labelsHtml);

    // 4) Wrap all labels in a printable container
    const printableHtml = `<div>${labelsHtml}</div>`;
    // 4. Build the full HTML for printing
    const fullHtml = `
     <!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
 <link href="https://cdn.quilljs.com/1.3.6/quill.core.css" rel="stylesheet">
  <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
  <link rel="stylesheet" href="../css/DailyCount.css">
  <style>
  </style>
</head>
<body  >
  ${labelsHtml}
    <script>
    // Wait for styles and images to load, then trigger print
    window.onload = () => {
      window.focus();
      window.print();
      // Optionally, close this window after printing:
      window.onafterprint = () => window.close();
    };
  </script>
</body>
</html>`;

    //------------------------
    // 5) open a new window and write the HTML
    const w = window.open("", "_blank", "width=800,height=600");
    if (!w) {
      return notify({
        message: "Popup blocked. Please allow popups.",
        severity: "error",
      });
    }
    w.document.open();
    w.document.write(fullHtml);
    w.document.close();
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
      {/* — Hidden container for Print-JS — */}
      <div
        id="print-area"
        style={{ display: "none" }}
        dangerouslySetInnerHTML={{
          __html: printHtml,
        }}
      />
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

      {/* Label Preview Section */}
      {!packing && (
        <Paper sx={{ mt: 4, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Label Preview
          </Typography>

          <FormControl fullWidth sx={{ mb: 2, maxWidth: 300 }}>
            <InputLabel id="preview-customer-label">Customer</InputLabel>
            <Select
              labelId="preview-customer-label"
              label="Customer"
              value={previewCustomer?.id || ""}
              onChange={(e) => {
                const cust = rows.find((r) => r.id === e.target.value);
                setPreviewCustomer(cust);
              }}
            >
              {rows.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.customer}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Paper
            sx={{
              width: "6in",
              height: "3in",
              position: "relative",
              p: 1,
              margin: "auto",
              overflow: "hidden",
            }}
          >
            <ReactQuill
              theme="snow"
              value={templateHtml
                .replace(/{{customerName}}/g, previewCustomer?.customer || "")
                .replace(
                  /{{customerAddress}}/g,
                  previewCustomer?.address || ""
                )}
              readOnly
              modules={{ toolbar: false }}
              formats={{}}
              style={{
                width: "4in",
                height: "2in",
                margin: "auto",
                overflow: "hidden",
                pointerEvents: "none", // prevent text selection
              }}
            />
          </Paper>
          <Paper
            elevation={3}
            sx={{
              width: "6in",
              height: "3in",
              position: "relative",
              overflow: "hidden",
              p: "0.2in",
              boxSizing: "border-box",
              backgroundColor: "#fff",
            }}
          >
            {/* Render the template HTML with placeholders replaced */}
            <div
              style={{
                width: "4in",
                height: "2in",
                margin: "auto",
                borderStyle: "groove",
                overflow: "hidden",
              }}
              dangerouslySetInnerHTML={{
                __html: templateHtml
                  .replace(/{{customerName}}/g, previewCustomer?.customer || "")
                  .replace(
                    /{{customerAddress}}/g,
                    previewCustomer?.address || ""
                  ),
              }}
            />

            {/* Overlay the QR code in the placeholder location */}
            <Box
              sx={{
                position: "absolute",
                bottom: "10px",
                left: "10px",
              }}
            >
              {previewCustomer && (
                <QRCodeSVG value={previewCustomer.customer} size={60} />
              )}
            </Box>
          </Paper>
        </Paper>
      )}
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
/*
// 5. Create a hidden iframe and print
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
doc.write(fullHtml);
doc.close();

iframe.onload = () => {
  iframe.contentWindow.focus();
  iframe.contentWindow.print();
  setTimeout(() => document.body.removeChild(iframe), 500);
};
*/
/*// 5) Print with print-js in raw-html mode
    printJS({
      printable: printableHtml,
      type: "raw-html",
      css: [
        "https://cdn.quilljs.com/1.3.6/quill.core.css",
        "https://cdn.quilljs.com/1.3.6/quill.snow.css",
      ],
      targetStyles: ["*"], // bring along inline styles (image resize etc)
      honorMarginPadding: true,
      style: `
@media print {
  @page { size: 4in 2in; margin: 0; }
  body { margin: 0; }
}
.label {
  position: relative;
  width: 4in; height: 2in;
  padding: 0.2in; box-sizing: border-box;
  page-break-after: always;
  overflow: hidden;
}
.ql-container {
  border: none !important;
  height: 100% !important;
}
.ql-editor {
  margin: 0; padding: 0;
}
.qr {
  position: absolute;
  bottom: 10px; left: 10px;
}
    `,
    });
    */
