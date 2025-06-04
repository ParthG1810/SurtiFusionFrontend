// src/pages/LabelFormat.jsx

import React, { useState, useRef, useEffect } from "react";
import ReactQuill from "react-quill";
import Quill from "quill"; // core Quill
import ImageResize from "quill-image-resize-module-react";
import "react-quill/dist/quill.snow.css";
import interact from "interactjs";
import { Box, Button, Typography, Paper, Stack } from "@mui/material";
import api from "../services/api";
import { useNotification } from "../context/NotificationContext";
import "../css/LabelFormat.css";
// Register image-resize against the real Quill constructor
Quill.register("modules/imageResize", ImageResize);
const Parchment = Quill.import("parchment");
const SizePx = new Parchment.Attributor.Style("sizePx", "font-size", {
  scope: Parchment.Scope.INLINE,
});
Quill.register(SizePx, true);

const SAMPLE_NAME = "Alice Smith";
const SAMPLE_ADDRESS = "123 Main St, Springfield";

export default function LabelFormat() {
  const notify = useNotification();
  const quillRef = useRef(null);

  const [dynamicHtml, setDynamicHtml] = useState("");
  const [editorHtml, setEditorHtml] = useState("");

  // Load saved template on mount
  useEffect(() => {
    api
      .get("/label-template")
      .then(({ data }) => {
        const content = data.content || "";
        setEditorHtml(content);
        setDynamicHtml(content);
        if (quillRef.current) {
          quillRef.current.getEditor().root.innerHTML = content;
        }
      })
      .catch((err) => {
        console.error(err);
        notify({ message: "Failed to load template", severity: "error" });
      });
  }, [notify]);

  // Save handler
  const handleSave = () => {
    if (!quillRef.current) return;
    // allow any inline resize styles to settle
    setTimeout(async () => {
      const content = quillRef.current.getEditor().root.innerHTML;
      try {
        const { data } = await api.post("/label-template", { content });
        setEditorHtml(data.content);
        setDynamicHtml(data.content);
        notify({ message: "Template saved!", severity: "success" });
      } catch (err) {
        console.error(err);
        notify({ message: "Save failed", severity: "error" });
      }
    }, 0);
  };

  // Cancel & reload handler
  const handleCancelLoad = () => {
    api
      .get("/label-template")
      .then(({ data }) => {
        setEditorHtml(data.content);
        setDynamicHtml(data.content);
        if (quillRef.current) {
          quillRef.current.getEditor().root.innerHTML = data.content;
        }
        notify({
          message: "Cancelled changes and Loaded saved template",
          severity: "info",
        });
      })
      .catch((err) => {
        console.error(err);
        notify({ message: "Load failed", severity: "error" });
      });
  };
  // — Font size handlers —
  const changeFont = (delta) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    const range = editor.getSelection();
    if (!range) return;

    // 1) Read any existing sizePx from the current selection
    const formats = editor.getFormat(range);

    let currentPx;
    if (formats.sizePx) {
      currentPx = parseInt(formats.sizePx, 10);
    } else {
      // find the DOM node at the start of the selection
      const [leaf] = editor.getLeaf(range.index);
      let node = leaf.domNode;
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentElement;
      }
      const computed = window.getComputedStyle(node).fontSize;
      currentPx = parseInt(computed, 10) || 12;
    }

    // 2) Compute new size
    const newPx = Math.max(1, currentPx + delta);

    // 3) Apply it over the whole selection
    if (range.length > 0) {
      editor.formatText(
        range.index,
        range.length,
        "sizePx",
        `${newPx}px`,
        Quill.sources.USER
      );
    } else {
      // collapsed cursor: set format for future typing
      editor.format("sizePx", `${newPx}px`, Quill.sources.USER);
    }
  };

  // External Insert QR button handler
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
    // Inject into the editor
    editor.clipboard.dangerouslyPasteHTML(range.index, imgHtml);
    editor.setSelection(range.index + 1, Quill.sources.SILENT);
  };

  // Quill modules
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

  // Formats must include image
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
    "sizePx",
  ];
  // Constrain editor to 4″×2″ (approx 384×192px @96dpi)
  const editorStyle = {
    width: "4in",
    height: "2in",
    position: "relative",
    border: "1px solid #ccc",
  };
  return (
    <Box sx={{ maxWidth: 800, mx: "auto", mt: 4, display: "grid", gap: 4 }}>
      <Typography variant="h5">Label Template Editor (4″×2″)</Typography>

      {/* Action Buttons */}
      <Stack direction="row" spacing={1}>
        <Button variant="outlined" onClick={insertQR}>
          Insert QR (5×5px)
        </Button>
        <Button variant="outlined" onClick={() => changeFont(+1)}>
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

      {/* Rich Text Editor */}
      <Paper sx={{ overflow: "hidden", position: "relative" }}>
        <div>
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={editorHtml}
            onChange={setEditorHtml}
            modules={modules}
            formats={formats}
            style={{ backgroundColor: "#fff" }}
          />
        </div>
      </Paper>

      {/* Dynamic Live Editor Preview */}
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
      </Box>
    </Box>
  );
}
