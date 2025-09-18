const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
  
    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'File too large' });
    }
  
    if (err.message === 'Invalid file type') {
      return res.status(415).json({ message: 'Invalid file type' });
    }
  
    // Default error
    res.status(500).json({ 
      message: process.env.NODE_ENV === 'production' 
        ? 'Something went wrong' 
        : err.message 
    });
  };
  
  module.exports = errorHandler;