const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');
const upload = require('../middlewares/upload');
const { validateFiles } = require('../middlewares/validation');
const { 
  wordToPdf, 
  excelToPdf 
} = require('../utils/converters');

// Word to PDF
router.post('/word-to-pdf', upload.single('file'), validateFiles, async (req, res) => {
  try {
    const filePath = req.file.path;
    const outputPath = path.join(__dirname, '../../processed', `converted-${Date.now()}.pdf`);
    
    await wordToPdf(filePath, outputPath);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="converted.pdf"');
    res.sendFile(outputPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Excel to PDF
router.post('/excel-to-pdf', upload.single('file'), validateFiles, async (req, res) => {
  try {
    const filePath = req.file.path;
    const outputPath = path.join(__dirname, '../../processed', `converted-${Date.now()}.pdf`);
    
    await excelToPdf(filePath, outputPath);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="converted.pdf"');
    res.sendFile(outputPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PowerPoint to PDF (placeholder - requires additional libraries)
router.post('/powerpoint-to-pdf', upload.single('file'), validateFiles, async (req, res) => {
  try {
    console.log('PowerPoint to PDF conversion requested...');
    // For now, we'll create a simple PDF with a message
    // In a real implementation, you would use libraries like officegen or similar
    const filePath = req.file.path;
    const outputPath = path.join(__dirname, '../../processed', `converted-${Date.now()}.pdf`);
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    
    page.drawText('PowerPoint to PDF Conversion', {
      x: 50,
      y: 750,
      size: 20,
      color: rgb(0, 0, 0),
    });
    
    page.drawText('Note: This is a placeholder conversion.', {
      x: 50,
      y: 700,
      size: 12,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    page.drawText('For full PowerPoint to PDF conversion, please use specialized tools.', {
      x: 50,
      y: 650,
      size: 12,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="converted.pdf"');
    res.sendFile(outputPath);
  } catch (error) {
    console.error('PowerPoint to PDF error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;