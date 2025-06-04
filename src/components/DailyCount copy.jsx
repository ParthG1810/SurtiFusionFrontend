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
  TextField,
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
  const [rows, setRows] = useState([]); // full list
  const [remaining, setRemaining] = useState([]); // still to pack
  const [packing, setPacking] = useState(false); // are we “in packing mode”?
  const [selectionModel, setSelectionModel] = useState([]); // IDs of rows manually checked

  // template + preview
  const [templateHtml, setTemplateHtml] = useState("");
  const [previewCustomer, setPreviewCustomer] = useState(null);

  // scanner input
  const [scanValue, setScanValue] = useState("");
  const scanInputRef = useRef(null);

  // ─── 1) On mount: load today’s tiffins + saved label template ─────────────
  useEffect(() => {
    // 1a) fetch daily tiffins
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
        if (data.length) setPreviewCustomer(data[0]);
      })
      .catch((err) => notify({ message: err.message, severity: "error" }));

    // 1b) fetch saved label template
    api
      .get("/label-template")
      .then(({ data }) => setTemplateHtml(data.content || ""))
      .catch((err) => notify({ message: err.message, severity: "error" }));
  }, [notify]);

  // ─── 2) Packing handlers ─────────────────────────────────────────────────────────
  const handleStart = () => {
    // initialize remaining → all rows, clear any prior selection
    setRemaining(rows);
    setSelectionModel([]);
    setPacking(true);

    // focus the hidden scanner input so that a hardware‐scanner can auto‐type into it:
    setTimeout(() => {
      scanInputRef.current?.focus();
    }, 100);
  };

  const handleEnd = () => {
    // “packed” = whatever was checked via checkboxes (if any)
    const packedIds = new Set(selectionModel);
    // any rows still in `remaining` that are NOT in packedIds remain
    const leftover = remaining.filter((r) => !packedIds.has(r.id));

    if (leftover.length === 0) {
      notify({ message: "Done packing!", severity: "success" });
      setPacking(false);
      setSelectionModel([]);
    } else {
      notify({
        message: "These tiffins remain – please pack them and try again.",
        severity: "warning",
      });
      // keep only the unchecked rows as new remaining
      setRemaining(leftover);
      setSelectionModel([]);
      // keep focus on scanner input in case user wants to scan next
      setTimeout(() => scanInputRef.current?.focus(), 50);
    }
  };

  // ─── 3) Scanner “enter” handler ─────────────────────────────────────────────────
  const handleScanKeyDown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const text = scanValue.trim();
      if (!text) {
        setScanValue("");
        return;
      }
      console.log(text);
      // expected format: "CustomerName-MealPlan"
      // so split at first hyphen:
      const hyphenIndex = text.indexOf("-");
      if (hyphenIndex < 1) {
        notify({
          message: `Invalid scan format: "${text}"`,
          severity: "error",
        });
        setScanValue("");
        return;
      }

      const custName = text.slice(0, hyphenIndex).trim();
      const mealPlan = text.slice(hyphenIndex + 1).trim();

      // find the matching row in `remaining`:
      const match = remaining.find(
        (r) => r.customer === custName && r.plan === mealPlan
      );
      if (!match) {
        notify({
          message: `No matching tiffin found for "${custName} – ${mealPlan}"`,
          severity: "error",
        });
        setScanValue("");
        return;
      }

      // 3a) check that ID → mark as packed (add to selectionModel)
      setSelectionModel((prev) => {
        if (!prev.includes(match.id)) {
          return [...prev, match.id];
        }
        return prev;
      });

      // 3b) remove it from remaining so it disappears immediately
      setRemaining((prevRem) => prevRem.filter((r) => r.id !== match.id));

      notify({
        message: `Packed: ${custName} – ${mealPlan}`,
        severity: "success",
      });
      setScanValue("");

      // keep focus on input for next scan
      setTimeout(() => scanInputRef.current?.focus(), 50);
    }
  };

  // ─── 4) Print‐to‐label logic (unchanged, except QR now uses name+plan) ────────────
  const triggerPrint = useReactToPrint({
    content: () => printRef.current,
    pageStyle: `
      @page { size: 4in 2in; margin: 0mm }
      body { margin: 0mm; padding: 0mm }
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
    if (!rows.length) {
      notify({ message: "No labels to print", severity: "warning" });
      return;
    }

    // build a map of distinct customer → { address, plan }
    const custMap = new Map();
    rows.forEach((r) => {
      if (!custMap.has(r.customer)) {
        custMap.set(r.customer, {
          address: r.address || "",
          plan: r.plan || "",
        });
      }
    });

    // generate HTML for each unique pair
    const html = Array.from(custMap.entries())
      .map(([name, info]) => {
        const { address, plan } = info;

        // fill in placeholders
        let filled = tpl
          .replace(/{{customerName}}/g, name)
          .replace(/{{customerAddress}}/g, address);

        const qrText = `${name}-${plan}`;
        const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(
          qrText
        )}&size=5`;

        // Only replace <img id="qr-placeholder" ...> (not all images)
        filled = filled.replace(
          /<img\s+[^>]*id=["']qr-placeholder["'][^>]*>/i,
          `<img
            src="${qrUrl}"
            style="
              position:absolute;
              bottom:2mm;
              left:2mm;
              width:5mm;
              height:5mm;
            "
            alt="QR code"
          />`
        );

        return `
          <div class="label">
            <div class="ql-container ql-snow">
              <div class="ql-editor">${filled}</div>
            </div>
          </div>
        `;
      })
      .join("\n");

    // inject into hidden container and fire print
    if (printRef.current) {
      printRef.current.innerHTML = html;
      triggerPrint();
    }
  };

  // ─── 5) Grid + “Label Preview” under the DataGrid ────────────────────────────────
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

      {/* ── Hidden “scanner” input; auto–focused when packing starts ────────────── */}
      {packing && (
        <TextField
          inputRef={scanInputRef}
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
          onKeyDown={handleScanKeyDown}
          placeholder='Scan QR → "Name-Plan"'
          variant="outlined"
          size="small"
          sx={{
            mt: 2,
            mb: 2,
            width: 0,
            height: 0,
            padding: 0,
            overflow: "hidden",
            border: 0,
          }}
        />
      )}

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

      {/* ── Label Preview (only shown when NOT packing and a customer is selected) ── */}
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
                setPreviewCustomer(c);
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
              <QRCodeSVG
                value={`${previewCustomer.customer} - ${previewCustomer.plan}`}
                size={60}
              />
            </Box>
          </Paper>
        </Paper>
      )}

      {/* ── Hidden print‐container ─────────────────────────────────────────────── */}
      <div style={{ display: "none" }}>
        <div ref={printRef} />
      </div>
    </Box>
  );
}
