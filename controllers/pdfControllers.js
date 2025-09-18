const { PDFDocument, rgb, degrees } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { spawn } = require('child_process');
const { cleanupFiles } = require('../utils/fileCleanup');
const { parsePageSelection, validatePdf } = require('../utils/pdfUtils');

// Ensure processed directory exists
const outputDir = path.join(__dirname, '../../processed');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// --- Helpers for compression ---
const GHOSTSCRIPT_CANDIDATES = ['gswin64c', 'gswin32c', 'gs'];

const resolveCompressionPreset = (levelRaw) => {
  const level = (levelRaw || '').toString().trim().toLowerCase();
  // Low = best quality, less reduction; Medium = balanced; High = smallest size
  if (level === 'low') {
    return { dpi: 150, jpegQuality: 85, pdfSettings: '/ebook' };
  }
  if (level === 'high') {
    return { dpi: 96, jpegQuality: 50, pdfSettings: '/screen' };
  }
  // default medium
  return { dpi: 120, jpegQuality: 65, pdfSettings: '/printer' };
};

const runGhostscriptCompression = (inputPath, outputPath, { dpi, jpegQuality, pdfSettings }) => {
  return new Promise((resolve, reject) => {
    const args = [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      '-dNOPAUSE',
      '-dBATCH',
      '-dQUIET',
      `-dPDFSETTINGS=${pdfSettings}`,
      // Remove metadata and unused objects
      '-dDetectDuplicateImages=true',
      '-dCompressFonts=true',
      '-dSubsetFonts=true',
      // Enable image downsampling/encoding
      '-dDownsampleColorImages=true',
      '-dColorImageDownsampleType=/Average',
      `-dColorImageResolution=${dpi}`,
      '-dDownsampleGrayImages=true',
      '-dGrayImageDownsampleType=/Average',
      `-dGrayImageResolution=${dpi}`,  
      '-dDownsampleMonoImages=true',
      '-dMonoImageDownsampleType=/Subsample',
      `-dMonoImageResolution=${dpi}`,
      '-dEncodeColorImages=true',
      '-dEncodeGrayImages=true',
      '-dEncodeMonoImages=true',
      `-dJPEGQ=${jpegQuality}`,
      '-dAutoRotatePages=/None',
      // Output
      `-sOutputFile=${outputPath}`,
      inputPath
    ];

    let lastError = null;
    const tryNext = (index) => {
      if (index >= GHOSTSCRIPT_CANDIDATES.length) {
        return reject(lastError || new Error('Ghostscript not found'));
      }

      const cmd = GHOSTSCRIPT_CANDIDATES[index];
      const child = spawn(cmd, args, { windowsHide: true });

      child.on('error', (err) => {
        lastError = err;
        tryNext(index + 1);
      });

      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          lastError = new Error(`Ghostscript exited with code ${code}`);
          tryNext(index + 1);
        }
      });
    };

    tryNext(0);
  });
};

const isPdfFile = (filePath) => {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(1024);
    const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
    fs.closeSync(fd);
    const headerSlice = buffer.slice(0, bytesRead).toString('utf8');
    // Accept if %PDF appears near the start (some generators add a small preamble)
    return headerSlice.includes('%PDF');
  } catch (e) {
    return false;
  }
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = (bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2);
  return `${value} ${sizes[i]}`;
};

const verifyOutputPdf = async (filePath) => {
  try {
    if (!fs.existsSync(filePath)) return false;
    const stat = fs.statSync(filePath);
    if (!stat.size) return false;
    if (!isPdfFile(filePath)) return false;
    // Deep check by parsing
    const bytes = fs.readFileSync(filePath);
    await PDFDocument.load(bytes);
    return true;
  } catch (_) {
    return false;
  }
};

// Merge PDFs
const mergePdf = async (req, res) => {
  try {
    const filePaths = req.files.map(file => file.path);
    const outputPath = path.join(outputDir, `merged-${Date.now()}.pdf`);
    
    const mergedPdf = await PDFDocument.create();
    
    for (const filePath of filePaths) {
      const pdfBytes = fs.readFileSync(filePath);
      const pdf = await PDFDocument.load(pdfBytes);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(page => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();
    fs.writeFileSync(outputPath, mergedPdfBytes);
    
    cleanupFiles(filePaths);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="merged.pdf"');
    res.send(Buffer.from(mergedPdfBytes));
    
    setTimeout(() => cleanupFiles(outputPath), 30000);
  } catch (error) {
    cleanupFiles(req.files.map(file => file.path));
    res.status(500).json({ error: error.message });
  }
};

// Split PDF
// Add these helper functions to your existing pdfControllers.js file
// DO NOT add parsePageSelection - use your existing one

// Split by equal parts
const splitByEqualParts = async (pdfDoc, totalPages, parts) => {
  if (parts < 2 || parts > totalPages) {
    throw new Error(`Invalid number of parts: ${parts}. Must be between 2 and ${totalPages}`);
  }
  
  const results = [];
  const pagesPerPart = Math.ceil(totalPages / parts);
  
  for (let partIndex = 0; partIndex < parts; partIndex++) {
    const startPage = partIndex * pagesPerPart;
    const endPage = Math.min(startPage + pagesPerPart, totalPages);
    
    if (startPage >= totalPages) break;
    
    const newPdf = await PDFDocument.create();
    const pagesToCopy = [];
    
    for (let i = startPage; i < endPage; i++) {
      pagesToCopy.push(i);
    }
    
    const pages = await newPdf.copyPages(pdfDoc, pagesToCopy);
    pages.forEach(page => newPdf.addPage(page));
    
    const filename = `part-${partIndex + 1}-pages-${startPage + 1}-${endPage}-${Date.now()}.pdf`;
    const outputPath = path.join(outputDir, filename);
    const newPdfBytes = await newPdf.save();
    fs.writeFileSync(outputPath, newPdfBytes);
    
    results.push({ 
      path: outputPath, 
      filename,
      pageRange: `${startPage + 1}-${endPage}`,
      partNumber: partIndex + 1
    });
  }
  
  return results;
};

// Split by custom chunk size
const splitByChunkSize = async (pdfDoc, totalPages, chunkSize) => {
  if (chunkSize < 1 || chunkSize >= totalPages) {
    throw new Error(`Invalid chunk size: ${chunkSize}. Must be between 1 and ${totalPages - 1}`);
  }
  
  const results = [];
  let chunkIndex = 1;
  
  for (let i = 0; i < totalPages; i += chunkSize) {
    const endPage = Math.min(i + chunkSize, totalPages);
    const newPdf = await PDFDocument.create();
    const pagesToCopy = [];
    
    for (let j = i; j < endPage; j++) {
      pagesToCopy.push(j);
    }
    
    const pages = await newPdf.copyPages(pdfDoc, pagesToCopy);
    pages.forEach(page => newPdf.addPage(page));
    
    const filename = `chunk-${chunkIndex}-pages-${i + 1}-${endPage}-${Date.now()}.pdf`;
    const outputPath = path.join(outputDir, filename);
    const newPdfBytes = await newPdf.save();
    fs.writeFileSync(outputPath, newPdfBytes);
    
    results.push({ 
      path: outputPath, 
      filename,
      pageRange: `${i + 1}-${endPage}`,
      chunkNumber: chunkIndex
    });
    
    chunkIndex++;
  }
  
  return results;
};

// REPLACE your existing splitPdf function with this enhanced version
const splitPdf = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;
  let results = [];

  try {
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();
    
    // Prevent splitting if PDF has only 1 page
    if (totalPages === 1) {
      cleanupFiles(filePath);
      return res.status(400).json({ 
        error: 'Cannot split PDF with only 1 page',
        totalPages: totalPages 
      });
    }
    
    // Get split type and parameters from request body
    const { 
      splitType = 'individual', 
      pages, 
      parts = 2, 
      chunkSize = 2 
    } = req.body;
    
    console.log('Split request:', { splitType, pages, parts, chunkSize, totalPages });
    
    // Handle different split types
    if (splitType === 'selected' && pages && pages.trim() !== '') {
      // Selected pages - use your existing parsePageSelection function
      const selectedPages = parsePageSelection(pages, totalPages);
      
      if (selectedPages.length === 0) {
        throw new Error('No valid pages selected');
      }
      
      // Extract specific pages into a single PDF
      const newPdf = await PDFDocument.create();
      for (const pageNum of selectedPages) {
        const [page] = await newPdf.copyPages(pdfDoc, [pageNum - 1]);
        newPdf.addPage(page);
      }
      
      const filename = `split-pages-${selectedPages.join('-')}-${Date.now()}.pdf`;
      const outputPath = path.join(outputDir, filename);
      const newPdfBytes = await newPdf.save();
      fs.writeFileSync(outputPath, newPdfBytes);
      results.push({ 
        path: outputPath, 
        filename, 
        pageRange: selectedPages.join(', ') 
      });
      
    } else if (splitType === 'equal') {
      // Split into equal parts
      const numParts = parseInt(parts);
      if (isNaN(numParts) || numParts < 2) {
        throw new Error('Invalid number of parts. Must be at least 2.');
      }
      results = await splitByEqualParts(pdfDoc, totalPages, numParts);
      
    } else if (splitType === 'chunk') {
      // Split by chunk size
      const size = parseInt(chunkSize);
      if (isNaN(size) || size < 1) {
        throw new Error('Invalid chunk size. Must be at least 1.');
      }
      results = await splitByChunkSize(pdfDoc, totalPages, size);
      
    } else {
      // Default: Split all pages into individual PDF files (your existing logic)
      for (let i = 0; i < totalPages; i++) {
        const newPdf = await PDFDocument.create();
        const [page] = await newPdf.copyPages(pdfDoc, [i]);
        newPdf.addPage(page);
        
        const filename = `page-${i + 1}-${Date.now()}.pdf`;
        const outputPath = path.join(outputDir, filename);
        const newPdfBytes = await newPdf.save();
        fs.writeFileSync(outputPath, newPdfBytes);
        results.push({ path: outputPath, filename });
      }
    }
    
    // Clean up uploaded file
    cleanupFiles(filePath);
    
    console.log(`Generated ${results.length} files`);
    
    // Your existing response logic
    if (results.length === 1) {
      // Single file - return as download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${results[0].filename}"`);
      res.sendFile(results[0].path, (err) => {
        if (err) {
          console.error('Error sending file:', err);
          return res.status(500).json({ error: 'Failed to send file' });
        }
        // Clean up processed file after sending
        setTimeout(() => cleanupFiles(results[0].path), 5000);
      });
    } else {
      // Multiple files - create zip archive
      const zipFilename = `split-pdf-${Date.now()}.zip`;
      const zipPath = path.join(outputDir, zipFilename);
      
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });
      
      output.on('close', () => {
        // Send zip file
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
        res.sendFile(zipPath, (err) => {
          if (err) {
            console.error('Error sending zip file:', err);
            return res.status(500).json({ error: 'Failed to send zip file' });
          }
          // Clean up all files after sending
          setTimeout(() => {
            cleanupFiles(results.map(r => r.path));
            cleanupFiles(zipPath);
          }, 5000);
        });
      });
      
      archive.on('error', (err) => {
        throw new Error(`Failed to create zip archive: ${err.message}`);
      });
      
      archive.pipe(output);
      
      // Add all PDF files to the zip
      results.forEach(file => {
        archive.file(file.path, { name: file.filename });
      });
      
      archive.finalize();
    }
  } catch (error) {
    // Clean up any created files in case of error
    cleanupFiles(filePath);
    if (results.length > 0) {
      cleanupFiles(results.map(r => r.path));
    }
    
    console.error('Error processing PDF:', error);
    res.status(500).json({ 
      error: 'Failed to process PDF',
      message: error.message 
    });
  }
};

// Compress PDF (enhanced)
const compressPdf = async (req, res) => {
  const uploadedPath = req.file && req.file.path;
  if (!uploadedPath) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    if (!isPdfFile(uploadedPath)) {
      // Fallback validation: attempt to parse with pdf-lib
      try {
        const bytes = fs.readFileSync(uploadedPath);
        await PDFDocument.load(bytes);
      } catch (e) {
        cleanupFiles(uploadedPath);
        return res.status(400).json({ error: 'Uploaded file is not a valid PDF' });
      }
    }

    const originalStats = fs.statSync(uploadedPath);
    const originalSize = originalStats.size;

    const { compressionLevel } = { ...req.body, ...req.query };
    const preset = resolveCompressionPreset(compressionLevel);

    const outputPath = path.join(outputDir, `compressed-${Date.now()}.pdf`);
    const tmpOutputPath = path.join(outputDir, `tmp-compressed-${Date.now()}.pdf`);

    // Try Ghostscript first for real image downsampling + metadata cleanup
    let usedGhostscript = true;
    try {
      await runGhostscriptCompression(uploadedPath, tmpOutputPath, preset);
      // Verify and move into place atomically
      const ok = await verifyOutputPdf(tmpOutputPath);
      if (!ok) throw new Error('Invalid PDF produced by Ghostscript');
      fs.renameSync(tmpOutputPath, outputPath);
    } catch (gsErr) {
      usedGhostscript = false;
      // Cleanup tmp if exists
      if (fs.existsSync(tmpOutputPath)) {
        try { fs.unlinkSync(tmpOutputPath); } catch (_) {}
      }
      // Fallback: pdf-lib minimal save/cleanup
      const pdfBytes = fs.readFileSync(uploadedPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const fallbackBytes = await pdfDoc.save({
        useObjectStreams: false,
        compress: true,
      });
      fs.writeFileSync(outputPath, fallbackBytes);
    }

    // Compute sizes
    const compressedStats = fs.statSync(outputPath);
    const compressedSize = compressedStats.size;
    const reduced = Math.max(0, originalSize - compressedSize);
    const reductionPercent = originalSize > 0 ? +(reduced * 100 / originalSize).toFixed(2) : 0;

    // Cleanup uploaded file immediately
    cleanupFiles(uploadedPath);

    // Schedule compressed file for cleanup shortly after response
    setTimeout(() => cleanupFiles(outputPath), 30000);

    return res.status(200).json({
      success: true,
      usedGhostscript,
      compressionLevel: (compressionLevel || 'medium').toString().toLowerCase(),
      originalSizeBytes: originalSize,
      originalSizeFormatted: formatBytes(originalSize),
      compressedSizeBytes: compressedSize,
      compressedSizeFormatted: formatBytes(compressedSize),
      reductionPercent
    });
  } catch (error) {
    console.error('PDF compression error:', error);
    cleanupFiles(uploadedPath);
    return res.status(500).json({ error: 'Failed to compress PDF', message: error.message });
  }
};

// Edit PDF (add text)
const editPdf = async (req, res) => {
  try {
    const filePath = req.file.path;
    const outputPath = path.join(outputDir, `edited-${Date.now()}.pdf`);
    const { text, x, y, pageNumber = 0 } = req.body;
    
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    
    if (pageNumber >= 0 && pageNumber < pages.length) {
      const page = pages[pageNumber];
      page.drawText(text, {
        x: x || 50,
        y: y || 500,
        size: 12,
        color: rgb(0, 0, 0),
      });
    }
    
    const editedPdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, editedPdfBytes);
    cleanupFiles(filePath);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="edited.pdf"');
    res.send(Buffer.from(editedPdfBytes));
    
    setTimeout(() => cleanupFiles(outputPath), 30000);
  } catch (error) {
    cleanupFiles(req.file.path);
    res.status(500).json({ error: error.message });
  }
};

// Sign PDF (basic implementation)
const signPdf = async (req, res) => {
  try {
    const filePath = req.file.path;
    const outputPath = path.join(outputDir, `signed-${Date.now()}.pdf`);
    const { signatureText, x, y, pageNumber = 0 } = req.body;
    
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    
    if (pageNumber >= 0 && pageNumber < pages.length) {
      const page = pages[pageNumber];
      page.drawText(signatureText || 'Signed', {
        x: x || 50,
        y: y || 50,
        size: 16,
        color: rgb(1, 0, 0),
      });
    }
    
    const signedPdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, signedPdfBytes);
    cleanupFiles(filePath);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="signed.pdf"');
    res.send(Buffer.from(signedPdfBytes));
    
    setTimeout(() => cleanupFiles(outputPath), 30000);
  } catch (error) {
    cleanupFiles(req.file.path);
    res.status(500).json({ error: error.message });
  }
};

// Watermark PDF
const watermarkPdf = async (req, res) => {
  try {
    const filePath = req.file.path;
    const outputPath = path.join(outputDir, `watermarked-${Date.now()}.pdf`);
    const { watermarkText } = req.body;
    
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    
    pages.forEach(page => {
      const { width, height } = page.getSize();
      page.drawText(watermarkText || 'CONFIDENTIAL', {
        x: width / 2 - 50,
        y: height / 2,
        size: 48,
        color: rgb(0.5, 0.5, 0.5),
        opacity: 0.3,
        rotate: degrees(45),
      });
    });
    
    const watermarkedPdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, watermarkedPdfBytes);
    cleanupFiles(filePath);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="watermarked.pdf"');
    res.send(Buffer.from(watermarkedPdfBytes));
    
    setTimeout(() => cleanupFiles(outputPath), 30000);
  } catch (error) {
    cleanupFiles(req.file.path);
    res.status(500).json({ error: error.message });
  }
};

// Rotate PDF
const rotatePdf = async (req, res) => {
  try {
    const filePath = req.file.path;
    const outputPath = path.join(outputDir, `rotated-${Date.now()}.pdf`);
    const { rotation = 90 } = req.body;
    
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    
    pages.forEach(page => {
      page.setRotation((page.getRotation().angle + rotation) % 360);
    });
    
    const rotatedPdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, rotatedPdfBytes);
    cleanupFiles(filePath);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="rotated.pdf"');
    res.send(Buffer.from(rotatedPdfBytes));
    
    setTimeout(() => cleanupFiles(outputPath), 30000);
  } catch (error) {
    cleanupFiles(req.file.path);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  mergePdf,
  splitPdf,
  compressPdf,
  editPdf,
  signPdf,
  watermarkPdf,
  rotatePdf
};