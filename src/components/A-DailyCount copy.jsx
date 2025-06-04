// src/components/DailyCount.jsx

import React, { useState, useEffect, useRef } from "react";
import { DataGrid } from "@mui/x-data-grid";
import {
  Box,
  Typography,
  Button,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useReactToPrint } from "react-to-print";
import { QRCodeSVG } from "qrcode.react";
import { daily } from "../services/orders";
import api from "../services/api";
import { useNotification } from "../context/NotificationContext";

export default function DailyCount() {
  const notify = useNotification();
  const printRef = useRef();

  // packing workflow
  const [rows, setRows] = useState([]);
  const [remaining, setRemaining] = useState([]);
  const [packing, setPacking] = useState(false);
  const [selectionModel, setSelectionModel] = useState([]);
  const [templateHtml, setTemplateHtml] = useState("");
  const previewCustomerRef = useRef(null);
  const [previewCustomer, setPreviewCustomer] = useState(null);

  // load tiffins & saved template
  useEffect(() => {
    let pc = null;
    daily()
      .then((res) => {
        const data = res.data.map((item, idx) => {
          const o = item.order;
          const p = item.meal_plan;
          const c = o.customer || {};
          return {
            id: idx + 1,
            plan: p?.name || p?.planname,
            customer: c.name,
            address: c.address,
            qty: item.quantity,
          };
        });
        setRows(data);
        if (data.length) {
          setPreviewCustomer(data[0]);
          pc = data[0];
          console.log(pc);
        }
        api
          .get("/label-template")
          .then(({ data }) => {
            const content = data.content || "";
            setTemplateHtml(data.content || "");
            // Also build the initial “live preview”
            if (previewCustomerRef.current) {
              previewCustomerRef.current.innerHTML = builPreviewCustomerHtml(
                content,
                pc
              );
              console.log(content);
              console.log(pc);
            }
          })
          .catch((err) => {
            console.error(err);
            notify({ message: "Failed to load template", severity: "error" });
          });
      })
      .catch((err) => notify({ message: err.message, severity: "error" }));
  }, [notify]);

  function builPreviewCustomerHtml(html, previewCustomer) {
    // 1) Substitute “SAMPLE_NAME”, “SAMPLE_ADDRESS”, and “SAMPLE_PLAN”
    let filled = html
      .replace(/{{customerName}}/g, previewCustomer.customer)
      .replace(/{{customerAddress}}/g, previewCustomer.address)
      .replace(/{{mealPlan}}/g, previewCustomer.plan);

    // 2) Compute the QR payload & URL (5mm × 5mm)
    const qrPayload = `${previewCustomer.customer}-${previewCustomer.plan}`;
    const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(
      qrPayload
    )}&size=10&margin=3`;

    // 3) Replace only the <img id="qr-placeholder" …> node with actual QR
    const placeholderRegex =
      /<img[^>]*src=(["'])(?:https:\/\/quickchart\.io\/)[^>]*>/gi;
    filled = filled.replace(
      placeholderRegex,
      `<img
        id="qr-placeholder"
        src="${qrUrl}"
        style="
          position:absolute;
          bottom:2mm;
          left:2mm;
          width:10mm;
          height:10mm;
        "
        alt="QR code"
      />`
    );
    return `
      <div class="label" >
  <div class="ql-container ql-snow">
    <div class="ql-editor">${filled}</div>
  </div>
</div>
    `;
  }
  // packing handlers
  const handleStart = () => {
    setRemaining(rows);
    setSelectionModel([]);
    setPacking(true);
  };
  const handleEnd = () => {
    const packed = new Set(selectionModel);
    const leftover = remaining.filter((r) => !packed.has(r.id));
    if (leftover.length === 0) {
      notify({ message: "Done packing!", severity: "success" });
      setPacking(false);
    } else {
      notify({
        message: "These tiffins remain – please pack them and try again.",
        severity: "warning",
      });
      setRemaining(leftover);
      setSelectionModel([]);
    }
  };

  const triggerPrint = useReactToPrint({
    content: () => printRef.current,
    contentRef: printRef,
    pageStyle: `
    @page {size: 4in 2in;margin: 0mm }
    body { margin:0mm; padding: 0mm }
   
    .label {
      border: none !important;
      width: 4in; height: 2in;
      box-shadow: none !important;
      overflow: hidden;
    }
    .ql-container {
      border: none !important;
      box-shadow: none !important;
      overflow: hidden;
    }
    .ql-editor {
      margin: 0;
      border: none !important;
      padding: 0 !important;
    }
  `,
  });
  // build & print
  const handlePrintLabels = async () => {
    // fetch latest template
    let tpl = "";
    try {
      const { data } = await api.get("/label-template");
      tpl = data.content || "";
    } catch (err) {
      return notify({ message: "Failed to load template", severity: "error" });
    }
    if (!tpl) {
      return notify({
        message: "Save your label template first.",
        severity: "warning",
      });
    }
    if (!rows || rows.length === 0) {
      notify({ message: "No labels to print", severity: "warning" });
      return "";
    }
    // distinct customer→address
    const custMap = new Map();
    rows.forEach((r) => {
      if (!custMap.has(r.customer)) {
        custMap.set(r.customer, {
          address: r.address || "",
          plan: r.plan || "",
        });
      }
    });

    // generate HTML
    const html = Array.from(custMap.entries())
      .map(([name, info]) => {
        const { address, plan } = info;
        let filled = tpl
          .replace(/{{customerName}}/g, name)
          .replace(/{{customerAddress}}/g, address)
          .replace(/{{mealPlan}}/g, plan);
        let qrText = `${name}-${plan}`;
        // qrText = qrText.replace(/ /g, "%20");
        console.log(qrText);
        const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(
          qrText
        )}&size=1&margin=3`;

        filled = filled.replace(
          /<img[^>]*src=(["'])(?:https:\/\/quickchart\.io\/)[^>]*>/i,
          `<img id="qr-placeholder" 
            src="${qrUrl}"
            style="
              position:absolute;
              bottom:2mm;
              left:2mm;
              width:10mm;
              height:10mm;
            "
            alt="QR code"
          />`
        );
        console.log(filled);
        return `
<div class="label" >
  <div class="ql-container ql-snow">
    <div class="ql-editor">${filled}</div>
  </div>
</div>`;
      })
      .join("\n");

    // inject & fire
    if (printRef.current) {
      printRef.current.innerHTML = html;
      triggerPrint();
    }
  };
  const handleCustomerChange = (c) => {
    setPreviewCustomer(c);
    if (previewCustomerRef.current) {
      previewCustomerRef.current.innerHTML = builPreviewCustomerHtml(
        templateHtml,
        c
      );
    }
  };
  // grid + preview
  const displayRows = packing ? remaining : rows;
  const columns = [
    { field: "plan", headerName: "Meal Plan", width: 200 },
    { field: "customer", headerName: "Customer", width: 180 },
    { field: "qty", headerName: "Quantity", width: 100 },
  ];

  return (
    <Box sx={{ width: "100%", mt: 2 }}>
      <Typography variant="h6" mb={1}>
        Today's Tiffin Counts
      </Typography>

      {!packing ? (
        <Button variant="contained" onClick={handleStart} sx={{ mr: 1 }}>
          Start Packing
        </Button>
      ) : (
        <Button
          variant="contained"
          color="secondary"
          onClick={handleEnd}
          sx={{ mr: 1 }}
        >
          End Packing
        </Button>
      )}
      <Button variant="outlined" onClick={handlePrintLabels}>
        Print Labels
      </Button>

      {/* Hidden container */}
      <div style={{ display: "none" }}>
        <div ref={printRef} />
      </div>

      <Box sx={{ height: 400, mt: 2 }}>
        <DataGrid
          rows={displayRows}
          columns={columns}
          pageSize={5}
          rowsPerPageOptions={[5]}
          checkboxSelection={packing}
          disableSelectionOnClick
          selectionModel={selectionModel}
          onSelectionModelChange={(sel) => setSelectionModel(sel)}
        />
      </Box>

      {/* Label Preview */}
      {!packing && previewCustomer && (
        <Paper sx={{ mt: 4, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Label Preview
          </Typography>

          <FormControl fullWidth sx={{ mb: 2, maxWidth: 300 }}>
            <InputLabel id="preview-customer-label">Customer</InputLabel>
            <Select
              labelId="preview-customer-label"
              label="Customer"
              value={previewCustomer.id}
              onChange={(e) => {
                const c = rows.find((r) => r.id === e.target.value);
                handleCustomerChange(c);
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
            elevation={3}
            sx={{
              width: "4in",
              height: "2in",
              position: "relative",
              margin: "auto",
              overflow: "hidden",
            }}
          >
            <div style={{ width: "4in", height: "2in" }}>
              <div ref={previewCustomerRef} />
            </div>
          </Paper>
        </Paper>
      )}
    </Box>
  );
}

/* <Paper
            elevation={3}
            sx={{
              width: "4in",
              height: "2in",
              position: "relative",
              overflow: "hidden",
              p: "0.2in",
              boxSizing: "border-box",
              backgroundColor: "#fff",
            }}
          >
            <ReactQuill
              theme="bubble"
              value={templateHtml
                .replace(/{{customerName}}/g, previewCustomer.customer)
                .replace(/{{customerAddress}}/g, previewCustomer.address)}
              readOnly
              modules={{ toolbar: false }}
              formats={[
                "header",
                "bold",
                "italic",
                "underline",
                "strike",
                "color",
                "background",
                "size",
                "align",
                "link",
                "image",
              ]}
              style={{ height: "100%", pointerEvents: "none" }}
            />
            <Box sx={{ position: "absolute", bottom: 10, left: 10 }}>
              <QRCodeSVG value={previewCustomer.customer} size={60} />
            </Box>
          </Paper> */

/* const triggerPrint = useReactToPrint({
    content: () => printRef.current,
    contentRef: printRef, // legacy fallback
    pageStyle: `
    @page {
      size: auto;   
      margin: 0mm;  
    }
    body {
      margin: 0mm;
    }
      @page { size: 4in 2in;}
      
      body { padding: 0mm; }
      .label {
      border: none !important;
      box-shadow: none !important;
        width: 4in; height: 2in;
        border: none;
        overflow: hidden;
        border-color: white;
      }
    `,
  });
  */
