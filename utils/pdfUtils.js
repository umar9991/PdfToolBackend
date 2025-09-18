const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { cleanupFiles } = require('./fileCleanup');

// Merge PDFs
const mergePDFs = async (filePaths, outputPath) => {
  try {
    const mergedPdf = await PDFDocument.create();

    for (const filePath of filePaths) {
      const pdfBytes = fs.readFileSync(filePath);
      const pdf = await PDFDocument.load(pdfBytes);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(page => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();
    fs.writeFileSync(outputPath, mergedPdfBytes);
    
    return outputPath;
  } catch (error) {
    throw new Error(`Failed to merge PDFs: ${error.message}`);
  }
};

// Split PDF
const splitPDF = async (filePath, outputDir, pages) => {
  try {
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();
    
    const results = [];
    
    if (pages && pages.length > 0) {
      // Extract specific pages
      const newPdf = await PDFDocument.create();
      for (const pageNum of pages) {
        if (pageNum > 0 && pageNum <= totalPages) {
          const [page] = await newPdf.copyPages(pdfDoc, [pageNum - 1]);
          newPdf.addPage(page);
        }
      }
      
      const outputPath = path.join(outputDir, `split-${Date.now()}.pdf`);
      const newPdfBytes = await newPdf.save();
      fs.writeFileSync(outputPath, newPdfBytes);
      results.push(outputPath);
    } else {
      // Extract all pages as individual PDFs
      for (let i = 0; i < totalPages; i++) {
        const newPdf = await PDFDocument.create();
        const [page] = await newPdf.copyPages(pdfDoc, [i]);
        newPdf.addPage(page);
        
        const outputPath = path.join(outputDir, `page-${i + 1}-${Date.now()}.pdf`);
        const newPdfBytes = await newPdf.save();
        fs.writeFileSync(outputPath, newPdfBytes);
        results.push(outputPath);
      }
    }
    
    return results;
  } catch (error) {
    throw new Error(`Failed to split PDF: ${error.message}`);
  }
};

// Compress PDF (simplified - in production you might use more advanced tools like ghostscript)
const compressPDF = async (filePath, outputPath) => {
  try {
    // This is a basic implementation - consider using ghostscript for better compression
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // You can add more compression logic here
    const compressedPdfBytes = await pdfDoc.save({
      useObjectStreams: false,
      compress: true
    });
    
    fs.writeFileSync(outputPath, compressedPdfBytes);
    return outputPath;
  } catch (error) {
    throw new Error(`Failed to compress PDF: ${error.message}`);
  }
};

// Rotate PDF
const rotatePDF = async (filePath, outputPath, rotation) => {
  try {
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    
    pages.forEach(page => {
      page.setRotation((page.getRotation().angle + rotation) % 360);
    });
    
    const rotatedPdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, rotatedPdfBytes);
    return outputPath;
  } catch (error) {
    throw new Error(`Failed to rotate PDF: ${error.message}`);
  }
};

// Validate PDF file
const validatePdf = (filePath) => {
  try {
    const pdfBytes = fs.readFileSync(filePath);
    // Basic validation - check if it's a valid PDF by looking for PDF header
    const header = pdfBytes.toString('ascii', 0, 4);
    return header === '%PDF';
  } catch (error) {
    return false;
  }
};

module.exports = {
  mergePDFs,
  splitPDF,
  compressPDF,
  rotatePDF,
  validatePdf
};