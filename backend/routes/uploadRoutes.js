const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const uploadMiddleware = require('../middleware/uploadMiddleware');

// Upload file
router.post('/', uploadMiddleware.single('file'), uploadController.uploadFile);

// Get document processing status
router.get('/status/:documentId', uploadController.getDocumentStatus);

// Get all documents
router.get('/documents', uploadController.getDocuments);

// Delete document
router.delete('/documents/:documentId', uploadController.deleteDocument);

module.exports = router;
