const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Import routes
const pdfRoutes = require('./routes/pdf');
const conversionRoutes = require('./routes/conversion');
const officeRoutes = require('./routes/office');
const imageRoutes = require('./routes/image');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/processed', express.static(path.join(__dirname, '../processed')));

// Routes
app.use('/api/pdf', pdfRoutes);
app.use('/api/convert', conversionRoutes);
app.use('/api/office', officeRoutes);
app.use('/api/image', imageRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'PDF Tools API is running',
    version: '1.0.0'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ 
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message 
  });
});

module.exports = app;