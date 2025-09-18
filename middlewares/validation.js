const validateFiles = (req, res, next) => {
    // Check for multiple files (req.files) or single file (req.file)
    if ((!req.files || req.files.length === 0) && !req.file) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    next();
  };
  
  const validateTool = (req, res, next) => {
    const validTools = [
      'merge-pdf', 'split-pdf', 'compress-pdf', 'pdf-to-word', 
      'pdf-to-powerpoint', 'pdf-to-excel', 'word-to-pdf', 
      'powerpoint-to-pdf', 'excel-to-pdf', 'edit-pdf', 
      'pdf-to-jpg', 'jpg-to-pdf', 'sign-pdf', 'watermark', 'rotate-pdf'
    ];
  
    if (!validTools.includes(req.body.tool)) {
      return res.status(400).json({ message: 'Invalid tool specified' });
    }
    next();
  };
  
  module.exports = { validateFiles, validateTool };