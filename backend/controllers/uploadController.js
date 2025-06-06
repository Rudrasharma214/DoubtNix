const Document = require('../models/Document');
const fileProcessor = require('../utils/fileProcessor');
const { deleteFile } = require('../config/cloudinary');
const FileTypeDetector = require('../utils/fileTypeDetector');
const path = require('path');

/**
 * Upload and process a file
 */
const uploadFile = async (req, res) => {
  try {
    // console.log('📤 Upload request received');

    // Log all request details for debugging
    // console.log('📋 Request details:', {
    //   hasFile: !!req.file,
    //   fileInfo: req.file ? {
    //     filename: req.file.filename,
    //     originalname: req.file.originalname,
    //     size: req.file.size,
    //     path: req.file.path,
    //     mimetype: req.file.mimetype,
    //     fieldname: req.file.fieldname
    //   } : 'No file'
    // });

    if (!req.file) {
      // console.log('❌ No file in request');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { filename, originalname, size, mimetype } = req.file;
    const fileUrl = req.file.path; // Cloudinary URL
    const publicId = req.file.filename; // Cloudinary public ID

    // Robust file type detection
    const detectedFileType = FileTypeDetector.detectFileType(originalname, mimetype, fileUrl);

    // console.log('📋 File details:', {
    //   originalname,
    //   mimetype,
    //   detectedFileType,
    //   fileUrl
    // });

    if (!FileTypeDetector.validateFileType(detectedFileType)) {
      // Delete uploaded file from Cloudinary if type not allowed
      if (publicId) {
        await deleteFile(publicId);
      }
      return res.status(400).json({
        success: false,
        message: 'File type not supported. Allowed types: PDF, DOC, DOCX, JPG, JPEG, PNG, GIF'
      });
    }

    // Create document record with Cloudinary URL and user association
    const document = new Document({
      userId: req.user.id, // Associate document with the logged-in user
      filename,
      originalName: originalname,
      fileType: detectedFileType,
      fileUrl: fileUrl, // Cloudinary URL for file access
      cloudinaryPublicId: publicId, // Cloudinary public ID for deletion
      fileSize: size,
      extractedText: '', // Will be populated after processing
      processingStatus: 'pending'
    });

    // console.log('💾 Saving document to database...');
    await document.save();
    // console.log('✅ Document saved with ID:', document._id);

    // Start file processing asynchronously to extract text
    // console.log('🔄 Starting text extraction...');
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
    // console.error('Upload error:', error);

    // Clean up uploaded file from Cloudinary on error
    if (req.file && req.file.filename) {
      try {
        await deleteFile(req.file.filename);
      } catch (deleteError) {
        // console.error('Error deleting file from Cloudinary:', deleteError);
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

    // Only get document if it belongs to the authenticated user
    const document = await Document.findOne({
      _id: documentId,
      userId: req.user.id
    });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found or access denied'
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
    // console.error('Get document status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get document status',
      error: error.message
    });
  }
};

/**
 * Get user's uploaded documents only
 */
const getDocuments = async (req, res) => {
  try {
    // console.log('📄 Fetching documents for user:', req.user.id);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Only get documents belonging to the authenticated user
    const documents = await Document.find({ userId: req.user.id })
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-extractedText'); // Exclude large text field

    const total = await Document.countDocuments({ userId: req.user.id });

    // console.log(`✅ Found ${documents.length} documents for user (total: ${total})`);

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
    // console.error('Get documents error:', error);
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

    // Only delete document if it belongs to the authenticated user
    const document = await Document.findOne({
      _id: documentId,
      userId: req.user.id
    });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Delete file from Cloudinary
    try {
      await deleteFile(document.cloudinaryPublicId);
    } catch (fileError) {
      // console.error('Error deleting file from Cloudinary:', fileError);
    }

    // Delete document from database
    await Document.findByIdAndDelete(documentId);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    // console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: error.message
    });
  }
};

/**
 * Process file asynchronously to extract text and store in database
 */
const processFileAsync = async (documentId) => {
  try {
    // console.log('🔄 Processing document:', documentId);

    const document = await Document.findById(documentId);
    if (!document) {
      // console.log('❌ Document not found:', documentId);
      return;
    }

    // console.log('📄 Processing file:', document.originalName);
    // console.log('🔗 File URL:', document.fileUrl);
    // console.log('📋 Stored file type:', document.fileType);

    // Double-check file type from URL as fallback
    const urlFileType = document.fileUrl.split('.').pop().toLowerCase();
    const actualFileType = document.fileType || urlFileType;

    // console.log('🔍 URL file type:', urlFileType);
    // console.log('✅ Using file type:', actualFileType);

    // Additional debugging
    // console.log('🔬 Debug info:', {
    //   originalName: document.originalName,
    //   storedFileType: document.fileType,
    //   urlFileType: urlFileType,
    //   actualFileType: actualFileType,
    //   fileUrl: document.fileUrl
    // });

    // Update status to processing
    document.processingStatus = 'processing';
    await document.save();

    // Extract text based on file type using Cloudinary URL
    let extractedText = '';

    // console.log('🔍 Extracting text from', actualFileType, 'file...');

    if (['pdf'].includes(actualFileType)) {
      extractedText = await fileProcessor.extractTextFromPDFUrl(document.fileUrl);
    } else if (['doc', 'docx'].includes(actualFileType)) {
      extractedText = await fileProcessor.extractTextFromDocUrl(document.fileUrl);
    } else if (['jpg', 'jpeg', 'png', 'gif'].includes(actualFileType)) {
      extractedText = await fileProcessor.extractTextFromImageUrl(document.fileUrl);
    } else {
      // console.log('⚠️ Unsupported file type for text extraction:', actualFileType);
      extractedText = 'Text extraction not supported for this file type.';
    }

    // console.log('📝 Extracted text length:', extractedText.length, 'characters');

    // Update document with BOTH Cloudinary URL and extracted text
    document.extractedText = extractedText; // Store extracted text in DB
    document.fileType = actualFileType; // Fix file type if it was wrong
    document.processingStatus = 'completed';
    document.processedAt = new Date();
    await document.save();

    // console.log('✅ Document processing completed:', documentId);
    // console.log('💾 Stored in DB: URL + extracted text (' + extractedText.length + ' chars)');

  } catch (error) {
    // console.error('File processing error:', error);
    
    // Update document with error status
    try {
      await Document.findByIdAndUpdate(documentId, {
        processingStatus: 'failed',
        processingError: error.message
      });
    } catch (updateError) {
      // console.error('Error updating document status:', updateError);
    }
  }
};

module.exports = {
  uploadFile,
  getDocumentStatus,
  getDocuments,
  deleteDocument
};
