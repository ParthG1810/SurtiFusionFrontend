// src/pages/LabelFormat.jsx

import React, { useState, useRef, useEffect } from "react";
import ReactQuill from "react-quill";
import Quill from "quill"; // core Quill
import ImageResize from "quill-image-resize-module-react";
import "react-quill/dist/quill.snow.css";
import { Box, Button, Typography, Paper, Stack } from "@mui/material";
import api from "../services/api";
import { useNotification } from "../context/NotificationContext";
import "../css/LabelFormat.css";

// 1) Register image-resize plugin against Quill
Quill.register("modules/imageResize", ImageResize);

// 2) Add a custom Attributor for changing font-size in px:
const Parchment = Quill.import("parchment");
const SizePx = new Parchment.Attributor.Style("sizePx", "font-size", {
  scope: Parchment.Scope.INLINE,
});
Quill.register(SizePx, true);

// Sample placeholder values for “live” preview (replace later with real props)
const SAMPLE_NAME = "Alice Smith";
const SAMPLE_ADDRESS = "123 Main St, Springfield";
const SAMPLE_PLAN = "Dal + Sabzi + Roti";

export default function LabelFormat() {
  const notify = useNotification();
  const quillRef = useRef(null);
  const liveRef = useRef(null);
  // tracks the raw HTML from Quill
  const [editorHtml, setEditorHtml] = useState("");

  // ----------------------------
  //  Load the saved template
  // ----------------------------
  useEffect(() => {
    api
      .get("/label-template")
      .then(({ data }) => {
        const content = data.content || "";
        setEditorHtml(content);

        // Check if Quill is ready, then inject HTML into the Quill editor
        if (quillRef.current) {
          quillRef.current.getEditor().root.innerHTML = content;
        }

        // Also build the initial “live preview”
        if (liveRef.current) {
          liveRef.current.innerHTML = buildLivePreviewHtml(content);
        }
      })
      .catch((err) => {
        console.error(err);
        notify({ message: "Failed to load template", severity: "error" });
      });
  }, [notify]);

  // ----------------------------
  //  Save handler
  // ----------------------------
  const handleSave = () => {
    if (!quillRef.current) return;
    // Give Quill a moment to flush any inline‐resize styles
    setTimeout(async () => {
      const content = quillRef.current.getEditor().root.innerHTML;
      try {
        const { data } = await api.post("/label-template", { content });
        setEditorHtml(data.content);
        notify({ message: "Template saved!", severity: "success" });

        // Update the live preview right after saving
        if (liveRef.current) {
          liveRef.current.innerHTML = buildLivePreviewHtml(data.content);
        }
      } catch (err) {
        console.error(err);
        notify({ message: "Save failed", severity: "error" });
      }
    }, 0);
  };

  // ----------------------------
  //  Cancel & reload handler
  // ----------------------------
  const handleCancelLoad = () => {
    api
      .get("/label-template")
      .then(({ data }) => {
        const content = data.content || "";
        setEditorHtml(content);
        if (quillRef.current) {
          quillRef.current.getEditor().root.innerHTML = content;
        }
        notify({
          message: "Cancelled changes and Loaded saved template",
          severity: "info",
        });

        // Refresh the live preview as well
        if (liveRef.current) {
          liveRef.current.innerHTML = buildLivePreviewHtml(content);
        }
      })
      .catch((err) => {
        console.error(err);
        notify({ message: "Load failed", severity: "error" });
      });
  };

  // ----------------------------
  //   Font‐size (A+/A–) handlers
  // ----------------------------
  const changeFont = (delta) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    const range = editor.getSelection();
    if (!range) return;

    // 1) Read any existing “sizePx” from the selection
    const formats = editor.getFormat(range);
    let currentPx;
    if (formats.sizePx) {
      currentPx = parseInt(formats.sizePx, 10);
    } else {
      // If no “sizePx” is set, read the computed font size on the DOM node:
      const [leaf] = editor.getLeaf(range.index);
      let node = leaf.domNode;
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentElement;
      }
      const computed = window.getComputedStyle(node).fontSize;
      currentPx = parseInt(computed, 10) || 12;
    }

    // 2) Compute the new size
    const newPx = Math.max(1, currentPx + delta);

    // 3) Apply it across the selection (or set as cursor format)
    if (range.length > 0) {
      editor.formatText(
        range.index,
        range.length,
        "sizePx",
        `${newPx}px`,
        Quill.sources.USER
      );
    } else {
      editor.format("sizePx", `${newPx}px`, Quill.sources.USER);
    }
  };

  // ----------------------------
  //   “Insert QR” button handler
  // ----------------------------
  const insertQR = () => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    // Use template placeholder instead of prompt
    const text = "{{customerName}}-{{mealPlan}}";

    // QuickChart API for a 5×5 px QR
    const url = `https://quickchart.io/qr?text=${encodeURIComponent(
      text
    )}&size=1&margin=3`;

    // Determine insertion index (append if no selection)
    let range = editor.getSelection(true);
    if (!range) {
      range = { index: editor.getLength(), length: 0 };
    }

    // Build an absolutely-positioned <img> tag
    const imgHtml = `
      <img id="qr-placeholder" 
        src="${url}"
        style="
          position:absolute;
          bottom:2mm;
          left:2mm;
          width:2mm;
          height:2mm;
          z-index:10;
        "
        alt="QR code"
      />
    `;
    // Paste the placeholder HTML
    editor.clipboard.dangerouslyPasteHTML(range.index, imgHtml);
    // Move cursor after the QR placeholder
    editor.setSelection(range.index + 1, Quill.sources.SILENT);
  };

  // ----------------------------
  //   Quill toolbar & modules
  // ----------------------------
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ size: ["small", false, "large", "huge"] }],
      ["bold", "italic", "underline", "strike"],
      ["blockquote", "code-block"],
      ["link", "image", "video", "formula"],
      [{ script: "sub" }, { script: "super" }],
      [{ indent: "-1" }, { indent: "+1" }],
      [{ direction: "rtl" }],
      [{ color: [] }, { background: [] }],
      [{ font: [] }],
      [{ align: [] }],
      [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
      ["clean"],
    ],
    imageResize: {
      parchment: Quill.import("parchment"),
      modules: ["Resize", "DisplaySize", "Toolbar"],
    },
  };

  const formats = [
    "header",
    "size",
    "font",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "align",
    "background",
    "list",
    "bullet",
    "link",
    "image",
    "sizePx", // so that our A+/A– handler works
  ];

  // ============================
  //   buildLivePreviewHtml()
  //   (identical to what the Print routine injects)
  // ============================
  function buildLivePreviewHtml(html) {
    // 1) Substitute “SAMPLE_NAME”, “SAMPLE_ADDRESS”, and “SAMPLE_PLAN”
    let filled = html
      .replace(/{{customerName}}/g, SAMPLE_NAME)
      .replace(/{{customerAddress}}/g, SAMPLE_ADDRESS)
      .replace(/{{mealPlan}}/g, SAMPLE_PLAN);

    // 2) Compute the QR payload & URL (5mm × 5mm)
    const qrPayload = `${SAMPLE_NAME}-${SAMPLE_PLAN}`;
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

    // 4) Wrap in Quill’s own containers (so that formatting from Quill is preserved)
    //    We explicitly zero out Quill’s container/editor borders & padding so that nothing “extra” appears.
    return `
      <div class="label" >
  <div class="ql-container ql-snow">
    <div class="ql-editor">${filled}</div>
  </div>
</div>
    `;
  }

  // ----------------------------
  //   When the user types in Quill, keep dynamicHtml in sync
  // ----------------------------
  const handleEditorChange = (html) => {
    setEditorHtml(html);

    // Immediately re-build the “live preview” every time Quill content changes:
    if (liveRef.current) {
      liveRef.current.innerHTML = buildLivePreviewHtml(html);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", mt: 4, display: "grid", gap: 4 }}>
      <Typography variant="h5">Label Template Editor (4″×2″)</Typography>

      {/* ─────────────
          Action Buttons
         ───────────── */}
      <Stack direction="row" spacing={1}>
        <Button variant="outlined" onClick={insertQR}>
          Insert QR
        </Button>
        <Button variant="contained" onClick={() => changeFont(+1)}>
          A+
        </Button>
        <Button variant="outlined" onClick={() => changeFont(-1)}>
          A–
        </Button>
        <Button variant="contained" onClick={handleSave}>
          Save Template
        </Button>
        <Button variant="outlined" onClick={handleCancelLoad}>
          Cancel & Load Saved
        </Button>
      </Stack>

      {/* ─────────────
          Rich Text Editor
         ───────────── */}
      <Paper sx={{ overflow: "hidden", position: "relative" }}>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={editorHtml}
          onChange={handleEditorChange}
          modules={modules}
          formats={formats}
          style={{ backgroundColor: "#fff" }}
        />
      </Paper>

      {/* ───────────────────────────────────────────────────
          LIVE PREVIEW (4″×2″) — EXACTLY what “Print Labels” uses
         ─────────────────────────────────────────────────── */}
      <Box>
        <Typography variant="h6">Live Preview (4″×2″)</Typography>
        <Paper
          sx={{
            width: "4in",
            height: "2in",
            position: "relative",
            margin: "auto",
            overflow: "hidden",
          }}
        >
          <div style={{ width: "4in", height: "2in" }}>
            <div ref={liveRef} />
          </div>
        </Paper>
      </Box>
    </Box>
  );
}

/* 
      <Box>
        <Typography variant="h6">Dynamic Live Editor Preview</Typography>
        <Paper
          sx={{
            width: "6in",
            height: "3in",
            position: "relative",
            margin: "auto",
            overflow: "hidden",
          }}
        >
          <ReactQuill
            theme="snow"
            value={dynamicHtml
              .replace(/{{customerName}}/g, SAMPLE_NAME)
              .replace(/{{customerAddress}}/g, SAMPLE_ADDRESS)}
            readOnly
            modules={{ toolbar: false }}
            formats={formats}
            style={{
              width: "4in",
              height: "2in",
              margin: "auto",
              overflow: "hidden",
              pointerEvents: "none",
            }}
          />
        </Paper>
      </Box> */
