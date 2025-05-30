import React, { useState, useRef, useEffect } from "react";
import ReactQuill, { Quill } from "react-quill";
import ImageResize from "quill-image-resize-module-react";
import "react-quill/dist/quill.snow.css";
import { Box, Button, Typography, Paper, Stack } from "@mui/material";
import { QRCodeSVG as QRCode } from "qrcode.react";
import api from "../services/api";
import { useNotification } from "../context/NotificationContext";
import "../css/LabelFormat.css";
// register image-resize
Quill.register("modules/imageResize", ImageResize);

const quillModules = {
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
const quillFormats = [
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

const SAMPLE_NAME = "Alice Smith";
const SAMPLE_ADDRESS = "123 Main St, Springfield";

export default function LabelFormat() {
  const notify = useNotification();
  const editorRef = useRef();
  const [editorHtml, setEditorHtml] = useState("");
  const [dynamicHtml, setDynamicHtml] = useState("");
  const [savedHtml, setSavedHtml] = useState("");
  const quillRef = useRef(null);
  // 1) On mount, load from backend
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
  // 2) Save: grab the *live* DOM HTML (including inline image sizes), POST it,
  //    then update both savedHtml & editorHtml from the response.
  const handleSave = async () => {
    if (!quillRef.current) return;
    const editor = quillRef.current.getEditor();

    // 2) Wait one tick so the Image-Resize module can finish applying inline styles
    setTimeout(async () => {
      const currentHtml = editor.root.innerHTML;
      try {
        const { data } = await api.post("/label-template", {
          content: currentHtml,
        });
        // 3) Update both editor state and saved state from the response
        setEditorHtml(data.content);
        setSavedHtml(data.content);
        notify({ message: "Template saved!", severity: "success" });
      } catch (err) {
        notify({ message: "Save failed", severity: "error" });
      }
    }, 0);
  };
  // 3) Load Saved: re-fetch from backend and overwrite editorHtml
  const handleCancelLoad = async () => {
    try {
      const { data } = await api.get("/label-template");
      setSavedHtml(data.content);
      setEditorHtml(data.content);
      notify({
        message: "Cancelled changes and Loaded saved template",
        severity: "info",
      });
    } catch (err) {
      console.error(err);
      notify({ message: "Load failed", severity: "error" });
    }
  };
  return (
    <Box sx={{ maxWidth: 800, mx: "auto", mt: 4, display: "grid", gap: 4 }}>
      <Typography variant="h5">Label Template Editor (4″×2″)</Typography>

      {/* --- Rich Text Editor --- */}
      <Paper sx={{ overflow: "hidden", position: "relative" }}>
        <Box sx={{}}>
          <div className="custom-quill">
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={editorHtml}
              onChange={setEditorHtml}
              modules={quillModules}
              formats={quillFormats}
              style={{ backgroundColor: "#fff" }}
            />
          </div>
        </Box>
      </Paper>
      {/* --- Action Buttons --- */}
      <Stack direction="row" spacing={2}>
        <Button variant="contained" onClick={handleSave}>
          Save Template
        </Button>
        <Button variant="outlined" onClick={handleCancelLoad}>
          Cancel & Load Saved
        </Button>
      </Stack>

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
            formats={quillFormats}
            style={{
              width: "4in",
              height: "2in",
              margin: "auto",
              overflow: "hidden",
              pointerEvents: "none", // prevent text selection
            }}
          />

          <Box sx={{ position: "absolute", bottom: 10, left: 10 }}>
            <QRCode value={SAMPLE_NAME} size={60} />
          </Box>
        </Paper>
      </Box>

      {/* --- Live Editor Preview --- */}
      <Box>
        <Typography variant="h6">Live Editor Preview</Typography>
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
          <div
            style={{
              width: "4in",
              height: "2in",
              margin: "auto",
              borderStyle: "groove",
              overflow: "hidden",
            }}
            dangerouslySetInnerHTML={{
              __html: editorHtml
                .replace(/{{customerName}}/g, SAMPLE_NAME)
                .replace(/{{customerAddress}}/g, SAMPLE_ADDRESS),
            }}
          />
          <Box sx={{ position: "absolute", bottom: 10, left: 10 }}>
            <QRCode value={SAMPLE_NAME} size={60} />
          </Box>
        </Paper>
      </Box>

      {/* --- Saved Template Preview for Printing --- */}
      <Box>
        <Typography variant="h6">
          Formatted Label Preview (for printing)
        </Typography>
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
          <div
            style={{
              width: "4in",
              height: "2in",
              margin: "auto",
              borderStyle: "groove",
              overflow: "hidden",
            }}
            dangerouslySetInnerHTML={{
              __html: savedHtml
                .replace(/{{customerName}}/g, SAMPLE_NAME)
                .replace(/{{customerAddress}}/g, SAMPLE_ADDRESS)
                // replace QR placeholder if you used one:
                .replace(
                  /<div id="qr-placeholder"[^>]*><\/div>/,
                  `<div style="position:absolute;bottom:10px;left:10px;">
                  <img src="https://chart.googleapis.com/chart?chs=60x60&cht=qr&chl=${encodeURIComponent(
                    SAMPLE_NAME
                  )}"
                       width="60" height="60"/>
                 </div>`
                ),
            }}
          />
        </Paper>
      </Box>
    </Box>
  );
}
