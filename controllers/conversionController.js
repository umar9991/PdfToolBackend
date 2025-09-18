const path = require('path');
const { pdfToWord, wordToPdf, excelToPdf, pdfToJpg, jpgToPdf } = require('../utils/converters');
const { cleanupFiles } = require('../utils/fileCleanup');

// PDF to Word
const convertPdfToWord = async (req, res) => {
  try {
    const filePath = req.files[0].path;
    const outputPath = path.join(__dirname, '../../processed', `converted-${Date.now()}.docx`);
    
    const resultPath = await pdfToWord(filePath, outputPath);
    
    // Clean up uploaded file
    cleanupFiles(filePath);
    
    res.download(resultPath, 'converted.docx', (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      setTimeout(() => cleanupFiles(resultPath), 5000);
    });
  } catch (error) {
    cleanupFiles(req.files.map(file => file.path));
    res.status(500).json({ message: error.message });
  }
};

// Word to PDF
const convertWordToPdf = async (req, res) => {
  try {
    const filePath = req.files[0].path;
    const outputPath = path.join(__dirname, '../../processed', `converted-${Date.now()}.pdf`);
    
    const resultPath = await wordToPdf(filePath, outputPath);
    
    // Clean up uploaded file
    cleanupFiles(filePath);
    
    res.download(resultPath, 'converted.pdf', (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      setTimeout(() => cleanupFiles(resultPath), 5000);
    });
  } catch (error) {
    cleanupFiles(req.files.map(file => file.path));
    res.status(500).json({ message: error.message });
  }
};

// Excel to PDF
const convertExcelToPdf = async (req, res) => {
  try {
    const filePath = req.files[0].path;
    const outputPath = path.join(__dirname, '../../processed', `converted-${Date.now()}.pdf`);
    
    const resultPath = await excelToPdf(filePath, outputPath);
    
    // Clean up uploaded file
    cleanupFiles(filePath);
    
    res.download(resultPath, 'converted.pdf', (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      setTimeout(() => cleanupFiles(resultPath), 5000);
    });
  } catch (error) {
    cleanupFiles(req.files.map(file => file.path));
    res.status(500).json({ message: error.message });
  }
};

// PDF to JPG
const convertPdfToJpg = async (req, res) => {
  try {
    const filePath = req.files[0].path;
    const outputDir = path.join(__dirname, '../../processed');
    
    const resultPaths = await pdfToJpg(filePath, outputDir);
    
    // Clean up uploaded file
    cleanupFiles(filePath);
    
    if (resultPaths.length === 1) {
      res.download(resultPaths[0], 'converted.jpg', (err) => {
        if (err) {
          console.error('Download error:', err);
        }
        setTimeout(() => cleanupFiles(resultPaths), 5000);
      });
    } else {
      // For multiple files, create a zip
      res.status(200).json({ 
        message: 'PDF converted to JPG successfully', 
        files: resultPaths.map(p => path.basename(p)),
        downloadUrls: resultPaths.map(p => `/processed/${path.basename(p)}`)
      });
    }
  } catch (error) {
    cleanupFiles(req.files.map(file => file.path));
    res.status(500).json({ message: error.message });
  }
};

// JPG to PDF
const convertJpgToPdf = async (req, res) => {
  try {
    const filePaths = req.files.map(file => file.path);
    const outputPath = path.join(__dirname, '../../processed', `converted-${Date.now()}.pdf`);
    
    const resultPath = await jpgToPdf(filePaths, outputPath);
    
    // Clean up uploaded files
    cleanupFiles(filePaths);
    
    res.download(resultPath, 'converted.pdf', (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      setTimeout(() => cleanupFiles(resultPath), 5000);
    });
  } catch (error) {
    cleanupFiles(req.files.map(file => file.path));
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  convertPdfToWord,
  convertWordToPdf,
  convertExcelToPdf,
  convertPdfToJpg,
  convertJpgToPdf
};