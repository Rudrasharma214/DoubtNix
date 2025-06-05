const Document = require('../models/Document');
const fileProcessor = require('../utils/fileProcessor');
const path = require('path');
const fs = require('fs').promises;

/**
 * Upload and process a file
 */
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { filename, originalname, mimetype, size, path: filePath } = req.file;
    
    // Determine file type
    const fileExtension = path.extname(originalname).toLowerCase().slice(1);
    const allowedTypes = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif'];
    
    if (!allowedTypes.includes(fileExtension)) {
      // Delete uploaded file if type not allowed
      await fs.unlink(filePath);
      return res.status(400).json({
        success: false,
        message: 'File type not supported. Allowed types: PDF, DOC, DOCX, JPG, JPEG, PNG, GIF'
      });
    }

    // Create document record
    const document = new Document({
      filename,
      originalName: originalname,
      fileType: fileExtension,
      filePath,
      fileSize: size,
      processingStatus: 'pending'
    });

    await document.save();

    // Start file processing asynchronously
    processFileAsync(document._id);

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        documentId: document._id,
        filename: document.originalName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        processingStatus: document.processingStatus
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: error.message
    });
  }
};

/**
 * Get document processing status
 */
const getDocumentStatus = async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.json({
      success: true,
      data: {
        documentId: document._id,
        filename: document.originalName,
        fileType: document.fileType,
        processingStatus: document.processingStatus,
        processingError: document.processingError,
        extractedText: document.extractedText ? document.extractedText.substring(0, 500) + '...' : '',
        uploadedAt: document.uploadedAt,
        processedAt: document.processedAt
      }
    });

  } catch (error) {
    console.error('Get document status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get document status',
      error: error.message
    });
  }
};

/**
 * Get all uploaded documents
 */
const getDocuments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const documents = await Document.find()
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-extractedText'); // Exclude large text field

    const total = await Document.countDocuments();

    res.json({
      success: true,
      data: {
        documents,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get documents',
      error: error.message
    });
  }
};

/**
 * Delete a document
 */
const deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Delete file from filesystem
    try {
      await fs.unlink(document.filePath);
    } catch (fileError) {
      console.error('Error deleting file:', fileError);
    }

    // Delete document from database
    await Document.findByIdAndDelete(documentId);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: error.message
    });
  }
};

/**
 * Process file asynchronously
 */
const processFileAsync = async (documentId) => {
  try {
    const document = await Document.findById(documentId);
    if (!document) return;

    // Update status to processing
    document.processingStatus = 'processing';
    await document.save();

    // Extract text based on file type
    let extractedText = '';
    
    if (['pdf'].includes(document.fileType)) {
      extractedText = await fileProcessor.extractTextFromPDF(document.filePath);
    } else if (['doc', 'docx'].includes(document.fileType)) {
      extractedText = await fileProcessor.extractTextFromDoc(document.filePath);
    } else if (['jpg', 'jpeg', 'png', 'gif'].includes(document.fileType)) {
      extractedText = await fileProcessor.extractTextFromImage(document.filePath);
    }

    // Update document with extracted text
    document.extractedText = extractedText;
    document.processingStatus = 'completed';
    document.processedAt = new Date();
    await document.save();

  } catch (error) {
    console.error('File processing error:', error);
    
    // Update document with error status
    try {
      await Document.findByIdAndUpdate(documentId, {
        processingStatus: 'failed',
        processingError: error.message
      });
    } catch (updateError) {
      console.error('Error updating document status:', updateError);
    }
  }
};

module.exports = {
  uploadFile,
  getDocumentStatus,
  getDocuments,
  deleteDocument
};
