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

// Register image-resize against the real Quill constructor
Quill.register("modules/imageResize", ImageResize);
const SAMPLE_NAME = "Alice Smith";
const SAMPLE_ADDRESS = "123 Main St, Springfield";

export default function LabelFormat() {
  const notify = useNotification();
  const quillRef = useRef(null);

  const [dynamicHtml, setDynamicHtml] = useState("");
  const [editorHtml, setEditorHtml] = useState("");
  const [savedHtml, setSavedHtml] = useState("");

  // Load saved template on mount
  useEffect(() => {
    api
      .get("/label-template")
      .then(({ data }) => {
        setSavedHtml(data.content || "");
        setEditorHtml(data.content || "");
        setDynamicHtml(data.content || "");
        if (quillRef.current) {
          quillRef.current.getEditor().root.innerHTML = data.content;
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
        setSavedHtml(data.content);
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
        setSavedHtml(data.content);
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

  // External Insert QR button handler
  const insertQR = () => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const text = prompt("Enter text for QR code:");
    if (!text) return;

    // QuickChart API for a 5×5 px QR
    const url = `https://quickchart.io/qr?text=${encodeURIComponent(
      text
    )}&size=5`;

    // Determine insertion index (append if no selection)
    let range = editor.getSelection(true);
    if (!range) {
      range = { index: editor.getLength(), length: 0 };
    }

    // Insert as an image embed
    //editor.insertEmbed(range.index, "image", url, Quill.sources.USER);
    const imgHtml = `
      <img
        src="${url}"
        style="
          position:absolute;
          bottom:2mm;
          left:2mm;
          width:5mm;
          height:5mm;
          z-index:10;
        "
        alt="QR code"
      />
    `;
    // Move cursor after embed
    //editor.setSelection(range.index + 1, Quill.sources.SILENT);
    editor.clipboard.dangerouslyPasteHTML(range.index, imgHtml);
    editor.setSelection(range.index + 1, Quill.sources.SILENT);
  };

  // Quill modules (toolbar unchanged + imageResize)
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ size: ["small", false, "large", "huge"] }], // font sizes
      ["bold", "italic", "underline", "strike"],
      ["blockquote", "code-block"],
      ["link", "image", "video", "formula"],
      [{ script: "sub" }, { script: "super" }], // superscript/subscript
      [{ indent: "-1" }, { indent: "+1" }], // outdent/indent
      [{ direction: "rtl" }], // text direction
      [{ color: [] }, { background: [] }],
      [{ font: [] }], // font families
      [{ align: [] }], // alignment options
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
  ];

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", mt: 4, display: "grid", gap: 4 }}>
      <Typography variant="h5">Label Template Editor (4″×2″)</Typography>

      {/* Action Buttons */}
      <Stack direction="row" spacing={2}>
        <Button variant="outlined" onClick={insertQR}>
          Insert QR (5×5px)
        </Button>
        <Button variant="contained" onClick={handleSave}>
          Save Template
        </Button>
        <Button variant="outlined" onClick={handleCancelLoad}>
          Cancel & Load Saved
        </Button>
      </Stack>

      {/* Rich Text Editor */}
      {/*<Paper>*/}
      <Paper sx={{ overflow: "hidden", position: "relative" }}>
        <Box sx={{}}>
          <div className="custom-quill">
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
        </Box>
      </Paper>
      {/* ---Dynamic Live Editor Preview --- */}
      <Box>
        <Typography variant="h6">Dynamic Live Editor Preview</Typography>
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
              pointerEvents: "none", // prevent text selection
            }}
          />
        </Paper>
      </Box>
    </Box>
  );
}
