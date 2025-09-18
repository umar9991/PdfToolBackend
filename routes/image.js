const express = require('express');
const router = express.Router();
const path = require('path');
const upload = require('../middlewares/upload');
const { validateFiles } = require('../middlewares/validation');
const { 
  jpgToPdf, 
  pdfToJpg 
} = require('../utils/converters');

// JPG to PDF
router.post('/jpg-to-pdf', upload.array('files', 10), validateFiles, async (req, res) => {
  try {
    const filePaths = req.files.map(file => file.path);
    const outputPath = path.join(__dirname, '../../processed', `converted-${Date.now()}.pdf`);
    
    await jpgToPdf(filePaths, outputPath);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="converted.pdf"');
    res.sendFile(outputPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PNG to PDF (same as JPG)
router.post('/png-to-pdf', upload.array('files', 10), validateFiles, async (req, res) => {
  try {
    const filePaths = req.files.map(file => file.path);
    const outputPath = path.join(__dirname, '../../processed', `converted-${Date.now()}.pdf`);
    
    await jpgToPdf(filePaths, outputPath);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="converted.pdf"');
    res.sendFile(outputPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PDF to JPG
router.post('/pdf-to-jpg', upload.single('file'), validateFiles, async (req, res) => {
  try {
    const filePath = req.file.path;
    const outputDir = path.join(__dirname, '../../processed');
    
    const results = await pdfToJpg(filePath, outputDir);
    
    res.status(200).json({ 
      message: 'PDF converted to JPG successfully', 
      files: results.length,
      downloadUrls: results.map(p => `/processed/${path.basename(p)}`)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;