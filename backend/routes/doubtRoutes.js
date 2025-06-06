const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const doubtController = require('../controllers/doubtController');
const { authenticate } = require('../middleware/auth');

// Validation middleware for asking doubts
const validateDoubtRequest = [
  body('documentId')
    .notEmpty()
    .withMessage('Document ID is required')
    .isMongoId()
    .withMessage('Invalid document ID'),
  body('question')
    .notEmpty()
    .withMessage('Question is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Question must be between 1 and 2000 characters'),
  body('sessionId')
    .notEmpty()
    .withMessage('Session ID is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Session ID must be between 1 and 100 characters')
];

// Ask a doubt about a document (requires authentication)
router.post('/ask', authenticate, validateDoubtRequest, doubtController.askDoubt);

// Get conversation history (requires authentication)
router.get('/conversation/:documentId/:sessionId', authenticate, doubtController.getConversationHistory);

// Get all conversations for a document (requires authentication)
router.get('/conversations/:documentId', authenticate, doubtController.getDocumentConversations);

// Clear conversation (requires authentication)
router.delete('/conversation/:conversationId', authenticate, doubtController.clearConversation);

// Get suggested questions for a document (requires authentication)
router.get('/suggestions/:documentId', authenticate, doubtController.getSuggestedQuestions);

module.exports = router;
