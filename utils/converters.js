const mammoth = require('mammoth');
// SECURITY WARNING: xlsx has known vulnerabilities (CVE-2023-30533, CVE-2023-30534)
// Consider replacing with a safer alternative like 'exceljs' or 'xlsx-populate' in production
const XLSX = require('xlsx');
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Convert PDF to Word (DOCX)
const pdfToWord = async (filePath, outputPath) => {
  try {
    // This is a simplified implementation - for production, consider using pdf2docx
    // For now, we'll create a basic Word document with text content
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    
    // Extract text from PDF (simplified - real implementation would need proper text extraction)
    let extractedText = '';
    for (let i = 0; i < pages.length; i++) {
      extractedText += `Page ${i + 1} content extracted from PDF\n\n`;
    }
    
    // Create a simple text file as placeholder for Word document
    // In a real implementation, you would use a library like docx to create proper .docx files
    const textPath = outputPath.replace('.docx', '.txt');
    fs.writeFileSync(textPath, extractedText);
    
    // For now, return the text file path
    return textPath;
  } catch (error) {
    throw new Error(`Failed to convert PDF to Word: ${error.message}`);
  }
};

// Convert Word to PDF
const wordToPdf = async (filePath, outputPath) => {
  try {
    // Convert DOCX to HTML first, then to PDF
    const result = await mammoth.convertToHtml({ path: filePath });
    const html = result.value;
    
    // Create a simple PDF from HTML (this is a simplified approach)
    // For production, consider using puppeteer or other HTML-to-PDF libraries
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    
    // This is a very basic implementation - real implementation would need to parse HTML
    page.drawText(html.substring(0, 1000), {
      x: 50,
      y: 750,
      size: 12,
      maxWidth: 500,
    });
    
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
    return outputPath;
  } catch (error) {
    throw new Error(`Failed to convert Word to PDF: ${error.message}`);
  }
};

// Convert Excel to PDF
const excelToPdf = async (filePath, outputPath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    
    // Draw the data as a simple table
    let y = 750;
    data.forEach((row, rowIndex) => {
      if (rowIndex < 30) { // Limit rows for demo
        page.drawText(row.join(' | '), {
          x: 50,
          y: y,
          size: 10,
          maxWidth: 500,
        });
        y -= 20;
      }
    });
    
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
    return outputPath;
  } catch (error) {
    throw new Error(`Failed to convert Excel to PDF: ${error.message}`);
  }
};

// Convert PDF to JPG
const pdfToJpg = async (filePath, outputDir) => {
  try {
    // This is a simplified implementation
    // For production, consider using libraries like pdf-poppler or ghostscript
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    
    const results = [];
    for (let i = 0; i < pages.length; i++) {
      // Create a simple image representation (not a real PDF to image conversion)
      const outputPath = path.join(outputDir, `page-${i + 1}-${Date.now()}.jpg`);
      
      // This is just a placeholder - real implementation would require proper rendering
      await sharp({
        create: {
          width: 600,
          height: 800,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
      .jpeg()
      .toFile(outputPath);
      
      results.push(outputPath);
    }
    
    return results;
  } catch (error) {
    throw new Error(`Failed to convert PDF to JPG: ${error.message}`);
  }
};

// Convert JPG to PDF
const jpgToPdf = async (filePaths, outputPath) => {
  try {
    const pdfDoc = await PDFDocument.create();
    
    for (const filePath of filePaths) {
      const imageBuffer = fs.readFileSync(filePath);
      const image = await pdfDoc.embedJpg(imageBuffer);
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }
    
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
    return outputPath;
  } catch (error) {
    throw new Error(`Failed to convert JPG to PDF: ${error.message}`);
  }
};

module.exports = {
  pdfToWord,
  wordToPdf,
  excelToPdf,
  pdfToJpg,
  jpgToPdf
};