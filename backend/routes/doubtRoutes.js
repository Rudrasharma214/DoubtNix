const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const doubtController = require('../controllers/doubtController');

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

// Ask a doubt about a document
router.post('/ask', validateDoubtRequest, doubtController.askDoubt);

// Get conversation history
router.get('/conversation/:documentId/:sessionId', doubtController.getConversationHistory);

// Get all conversations for a document
router.get('/conversations/:documentId', doubtController.getDocumentConversations);

// Clear conversation
router.delete('/conversation/:conversationId', doubtController.clearConversation);

// Get suggested questions for a document
router.get('/suggestions/:documentId', doubtController.getSuggestedQuestions);

module.exports = router;
