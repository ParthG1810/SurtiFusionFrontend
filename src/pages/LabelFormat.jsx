import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography,
  TextField, Button
} from '@mui/material';

const STORAGE_KEY = 'labelTemplate';

export default function LabelFormat() {
  // Default template
  const defaultTpl = {
    line1: 'Surti Fusion',
    line2: '{{customerName}}',
    line3: '{{customerAddress}}'
  };

  const [tpl, setTpl] = useState(defaultTpl);
  const [saved, setSaved] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setTpl(JSON.parse(stored));
  }, []);

  // Save to localStorage
  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tpl));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Label Format (4″×2″)
      </Typography>
      <Paper sx={{ p: 3, display: 'grid', gap: 2 }}>
        <TextField
          label="Line 1 (header)"
          value={tpl.line1}
          onChange={e => setTpl({ ...tpl, line1: e.target.value })}
        />
        <TextField
          label="Line 2 (customer name)"
          value={tpl.line2}
          onChange={e => setTpl({ ...tpl, line2: e.target.value })}
        />
        <TextField
          label="Line 3 (customer address)"
          value={tpl.line3}
          onChange={e => setTpl({ ...tpl, line3: e.target.value })}
        />
        <Button variant="contained" onClick={handleSave}>
          Save Template
        </Button>
        {saved && <Typography color="success.main">Template saved!</Typography>}
      </Paper>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6">Preview:</Typography>
        <paper style={{
          width: '4in', height: '2in', border: '1px solid #ccc',
          padding: '0.2in', boxSizing: 'border-box'
        }}>
          <div style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold' }}>
            {tpl.line1}
          </div>
          <div style={{ marginTop: '0.2in', fontSize: '20px' }}>
            {tpl.line2.replace('{{customerName}}', 'Alice Smith')}
          </div>
          <div style={{ marginTop: '0.1in', fontSize: '18px' }}>
            {tpl.line3.replace('{{customerAddress}}', '123 Main St')}
          </div>
        </paper>
      </Box>
    </Box>
  );
}
