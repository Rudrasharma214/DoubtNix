const multer = require('multer');
const { storage } = require('../config/cloudinary');

// File filter function
const fileFilter = (req, file, cb) => {
  console.log('🔍 Validating file:', file.originalname);
  console.log('📋 MIME type:', file.mimetype);

  // Allowed file types (comprehensive list)
  const allowedMimeTypes = [
    // PDF files
    'application/pdf',

    // Word documents
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-word',
    'application/word',
    'application/x-msword',

    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',

    // Additional common variations
    'application/x-pdf',
    'text/pdf',
    'image/pjpeg' // IE JPEG variant
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    console.log('✅ File type accepted');
    cb(null, true);
  } else {
    console.log('❌ File type rejected:', file.mimetype);
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, JPEG, PNG, and GIF files are allowed.'), false);
  }
};

// Configure multer with Cloudinary storage
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 1 // Only allow one file at a time
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size allowed is 10MB.'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files. Only one file is allowed.'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected field name. Use "file" as the field name.'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'File upload error: ' + err.message
        });
    }
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

// Export configured upload middleware
module.exports = upload;
