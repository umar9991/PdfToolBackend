const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const { validateFiles } = require('../middlewares/validation');
const {
  mergePdf,
  splitPdf,
  compressPdf,
  editPdf,
  signPdf,
  watermarkPdf,
  rotatePdf
} = require('../controllers/pdfControllers');

// Merge PDFs
router.post('/merge', upload.array('files', 10), validateFiles, mergePdf);

// Split PDF
router.post('/split', upload.single('file'), validateFiles, splitPdf);

// Compress PDF
router.post('/compress', upload.single('file'), validateFiles, compressPdf);

// Edit PDF (add text, images, shapes)
router.post('/edit', upload.single('file'), validateFiles, editPdf);

// Sign PDF
router.post('/sign', upload.single('file'), validateFiles, signPdf);

// Watermark PDF
router.post('/watermark', upload.single('file'), validateFiles, watermarkPdf);

// Rotate PDF
router.post('/rotate', upload.single('file'), validateFiles, rotatePdf);

module.exports = router;