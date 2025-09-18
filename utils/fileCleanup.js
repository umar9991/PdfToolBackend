const fs = require('fs');
const path = require('path');

const cleanupFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`Cleaned up file: ${filePath}`);
    } catch (err) {
      console.error(`Error cleaning up file ${filePath}:`, err);
    }
  }
};

const cleanupFiles = (filePaths) => {
  if (Array.isArray(filePaths)) {
    filePaths.forEach(cleanupFile);
  } else {
    cleanupFile(filePaths);
  }
};

// Clean up old files periodically (files older than 1 hour)
const cleanupOldFiles = () => {
  const directories = [
    path.join(__dirname, '../../uploads'),
    path.join(__dirname, '../../processed')
  ];

  directories.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.readdir(dir, (err, files) => {
        if (err) {
          console.error('Error reading directory:', err);
          return;
        }

        const now = Date.now();
        const oneHour = 60 * 60 * 1000;

        files.forEach(file => {
          const filePath = path.join(dir, file);
          fs.stat(filePath, (err, stats) => {
            if (err) {
              console.error('Error getting file stats:', err);
              return;
            }

            if (now - stats.mtimeMs > oneHour) {
              cleanupFile(filePath);
            }
          });
        });
      });
    }
  });
};

// Run cleanup every hour
setInterval(cleanupOldFiles, 60 * 60 * 1000);

module.exports = { cleanupFile, cleanupFiles, cleanupOldFiles };