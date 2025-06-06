const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true,
    enum: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif']
  },
  fileUrl: {
    type: String,
    required: true
  },
  cloudinaryPublicId: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  extractedText: {
    type: String,
    default: ''
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingError: {
    type: String,
    default: null
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
documentSchema.index({ userId: 1, uploadedAt: -1 }); // User's documents by upload date
documentSchema.index({ userId: 1, processingStatus: 1 }); // User's documents by status
documentSchema.index({ uploadedAt: -1 });
documentSchema.index({ processingStatus: 1 });

module.exports = mongoose.model('Document', documentSchema);
