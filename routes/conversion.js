const express = require('express');
const router = express.Router();
const path = require('path');
const upload = require('../middlewares/upload');
const { validateFiles } = require('../middlewares/validation');
const { 
  pdfToWord, 
  wordToPdf, 
  excelToPdf, 
  pdfToJpg, 
  jpgToPdf 
} = require('../utils/converters');

// PDF to Word
router.post('/pdf-to-word', upload.single('file'), validateFiles, async (req, res) => {
  try {
    console.log('PDF to Word conversion started...');
    const filePath = req.file.path;
    const outputPath = path.join(__dirname, '../../processed', `converted-${Date.now()}.txt`);
    
    console.log('Input file:', filePath);
    console.log('Output path:', outputPath);
    
    const resultPath = await pdfToWord(filePath, outputPath);
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="converted.txt"');
    res.sendFile(resultPath);
  } catch (error) {
    console.error('PDF to Word error:', error);
    res.status(500).json({ error: error.message });
  }
});

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

// PDF to Excel
router.post('/pdf-to-excel', upload.single('file'), validateFiles, async (req, res) => {
  try {
    console.log('PDF to Excel conversion requested...');
    // For now, we'll create a simple CSV file with the PDF content
    // In a real implementation, you would use libraries like pdf2excel or similar
    const filePath = req.file.path;
    const outputPath = path.join(__dirname, '../../processed', `converted-${Date.now()}.csv`);
    
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    
    let csvContent = 'Page,Content\n';
    
    for (let i = 0; i < pages.length; i++) {
      csvContent += `${i + 1},"Content from PDF page ${i + 1}"\n`;
    }
    
    fs.writeFileSync(outputPath, csvContent);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="converted.csv"');
    res.sendFile(outputPath);
  } catch (error) {
    console.error('PDF to Excel error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PDF to PowerPoint
router.post('/pdf-to-powerpoint', upload.single('file'), validateFiles, async (req, res) => {
  try {
    console.log('PDF to PowerPoint conversion requested...');
    // For now, we'll create a simple text file with the PDF content
    // In a real implementation, you would use libraries like pdf2pptx or similar
    const filePath = req.file.path;
    const outputPath = path.join(__dirname, '../../processed', `converted-${Date.now()}.txt`);
    
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    
    let extractedText = 'PDF to PowerPoint Conversion\n';
    extractedText += '============================\n\n';
    extractedText += 'Note: This is a simplified conversion. For full PowerPoint conversion, use specialized tools.\n\n';
    
    for (let i = 0; i < pages.length; i++) {
      extractedText += `Slide ${i + 1}:\n`;
      extractedText += `Content from PDF page ${i + 1}\n\n`;
    }
    
    fs.writeFileSync(outputPath, extractedText);
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="converted-to-pptx.txt"');
    res.sendFile(outputPath);
  } catch (error) {
    console.error('PDF to PowerPoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

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

module.exports = router;
