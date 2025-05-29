import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import ReactQuill, { Quill } from 'react-quill';
import './LabelFormat.css';
import 'react-quill/dist/quill.snow.css';
// Image resize module for Quill
import ImageResize from 'quill-image-resize-module-react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { useNotification } from '../context/NotificationContext';

// Register the image resize module
Quill.register('modules/imageResize', ImageResize);
const STORAGE_KEY = 'labelTemplateHTML';
const SAMPLE_NAME = 'Alice Smith';
const SAMPLE_ADDRESS = '123 Main St, Springfield';

export default function LabelFormat() {
  const notify = useNotification();
  const defaultTplHtml = localStorage.getItem(STORAGE_KEY) || '';
  const [html, setHtml] = useState(
   () => localStorage.getItem(STORAGE_KEY) || defaultTplHtml
 );
 const editorRef = useRef(null);
  const quillRef = useRef(null);
  const previewRef = useRef(null);

  

  // Render preview and inject QR
  useEffect(() => {
    if (previewRef.current) {
      // Render template with sample data
      previewRef.current.innerHTML = html
        .replace(/{{customerName}}/g, SAMPLE_NAME)
        .replace(/{{customerAddress}}/g, SAMPLE_ADDRESS);
      // Inject QR code
      const qrEl = previewRef.current.querySelector('#qr-placeholder');
      if (qrEl) {
        ReactDOM.render(<QRCode value={SAMPLE_NAME} size={60} />, qrEl);
      }
    }
  }, [html]);

  const handleSave = () => {
     try {
       const editor = editorRef.current.getEditor();
      const currentHtml = editor.root.innerHTML;
      // Save current template HTML from state
      localStorage.setItem(STORAGE_KEY, currentHtml);
       setHtml(currentHtml);
      notify({ message: 'Template saved!', severity: 'success' });
    } catch (err) {
      console.error('Save template error:', err);
      notify({ message: 'Failed to save template', severity: 'error' });
    }
    //const template = quillRef.current.getEditor().root.innerHTML;
    //localStorage.setItem(STORAGE_KEY, template);
    //setHtml(template);
   // notify({ message: 'Template saved!', severity: 'success' });
  };

  return (
    <Box sx={{   }}>
      <Typography variant="h5" gutterBottom>
        Label Template Editor (4″×2″)
      </Typography>

      <Paper sx={{   overflow: 'hidden', position: 'relative' }}>
        <Box sx={{ width: '100%', height: '100%', '& .ql-container': { height: '100%', width: '100%' }, '& .ql-editor': { minHeight: '0', height: '100%' } }}>
        <div className="custom-quill">
        <ReactQuill
          ref={editorRef}
          theme="snow"
          value={html}
          onChange={(value) => setHtml(value)} 
          modules={{
            toolbar: [
              [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
              [{ size: ['small', false, 'large', 'huge'] }],  // font sizes
              ['bold', 'italic', 'underline', 'strike'],
              ['blockquote', 'code-block'],
              ['link', 'image', 'video', 'formula'],
              [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
  [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
  [{ 'direction': 'rtl' }],                         // text direction
              [{ color: [] }, { background: [] }],
              [{ font: [] }],                              // font families
              [{ align: [] }],                             // alignment options
              [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'list': 'check' }],
              ['clean']
            ],
            imageResize: {
              parchment: Quill.import('parchment'),modules: [ 'Resize', 'DisplaySize', 'Toolbar' ]
            }
          }}
          formats={['header', 'size', 'font',
            'bold', 'italic', 'underline', 'strike',
            'color','align', 'background',
            'list', 'bullet',
            'link', 'image']}
          style={{  }}
          placeholder="Design your 4x2 label here..."
        />
        </div>
        </Box>
        <Button variant="contained" onClick={handleSave} sx={{ mt: 2 }}>
          Save Template
        </Button>
      </Paper>

      <Typography variant="h6" gutterBottom>
        Live Preview (Sample)
      </Typography>
      <Paper sx={{ width: '6in', height: '2.5in', margin: 'auto',  boxSizing: 'border-box', overflow: 'hidden', backgroundColor: '#fff',borderStyle:'groove' }}>

       
 <div className="quill-preview"
          style={{  overflow: 'auto' }}
          dangerouslySetInnerHTML={{ __html: html
            .replace(/{{customerName}}/g, SAMPLE_NAME)
            .replace(/{{customerAddress}}/g, SAMPLE_ADDRESS)
          }}  
        />
      </Paper>
       <Paper
        sx={{
           width: '6in', height: '3in', margin: 'auto', p: '0.2in', boxSizing: 'border-box', overflow: 'hidden', backgroundColor: '#fff'
        }}
      >
        {/* Read-only Quill preview to preserve styles, sizes, alignment */}
        <ReactQuill
          value={html
            .replace(/{{customerName}}/g, SAMPLE_NAME)
            .replace(/{{customerAddress}}/g, SAMPLE_ADDRESS)
          }
          readOnly
          theme="bubble"
          modules={{ toolbar: false }}
          formats={[
            'header','size','font','bold','italic','underline','strike',
            'color','background','align','list','bullet','link','image'
          ]}
          style={{width: '4in', height: '2in', borderStyle:'groove',margin: 'auto' }}
        />
        {/* QR Code */}
        <Box
          sx={{ position: 'absolute', bottom: 10, left: 10 }}
        >
          <QRCode value={SAMPLE_NAME} size={60} />
        </Box>
      </Paper>
    </Box>
);
}
//<div className="quill-preview" ref={previewRef} />
/*//Always render QR via React 
  <Box
    sx={{
      position: 'absolute',
      bottom: '10px',
      left: '10px'
    }}
  >
    <QRCode value={SAMPLE_NAME} size={60} />
  </Box>*/