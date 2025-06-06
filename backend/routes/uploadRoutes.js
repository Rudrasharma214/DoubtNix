const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const uploadMiddleware = require('../middleware/uploadMiddleware');
const { authenticate } = require('../middleware/auth');

// Upload file with authentication and error handling
router.post('/', authenticate, (req, res, next) => {
  console.log('📤 Upload route hit');
  console.log('📋 Request info:', {
    contentType: req.headers['content-type'],
    hasBody: !!req.body,
    bodyKeys: Object.keys(req.body || {}),
    hasFiles: !!req.files
  });

  // Use multer middleware
  uploadMiddleware.single('file')(req, res, (err) => {
    if (err) {
      console.log('❌ Upload error:', err.message);
      console.log('📋 Error details:', err);

      // Handle multer errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 10MB.'
        });
      }

      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field. Please use "file" as the field name.'
        });
      }

      if (err.message.includes('Invalid file type') || err.message.includes('not allowed')) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      // Handle Cloudinary-specific errors
      if (err.message.includes('unknown file format') || err.http_code === 400) {
        return res.status(400).json({
          success: false,
          message: 'File format not supported by storage service. Please try a different file or format.'
        });
      }

      return res.status(400).json({
        success: false,
        message: `Upload failed: ${err.message}`
      });
    }

    console.log('✅ Upload successful, proceeding to controller');
    next();
  });
}, uploadController.uploadFile);

// Get document processing status (requires authentication)
router.get('/status/:documentId', authenticate, uploadController.getDocumentStatus);

// Get user's documents (requires authentication)
router.get('/documents', authenticate, uploadController.getDocuments);

// Delete document (requires authentication)
router.delete('/documents/:documentId', authenticate, uploadController.deleteDocument);

module.exports = router;
