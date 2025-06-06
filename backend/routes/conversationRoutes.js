const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const conversationController = require('../controllers/conversationController');
const { authenticate } = require('../middleware/auth');

// Validation middleware for updating conversation title
const validateTitleUpdate = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
];

// Get user's conversations (requires authentication)
router.get('/', authenticate, conversationController.getAllConversations);

// Get conversation by ID (requires authentication)
router.get('/:conversationId', authenticate, conversationController.getConversationById);

// Update conversation title (requires authentication)
router.put('/:conversationId/title', authenticate, validateTitleUpdate, conversationController.updateConversationTitle);

// Delete conversation (requires authentication)
router.delete('/:conversationId', authenticate, conversationController.deleteConversation);

// Search conversations (requires authentication)
router.get('/search/query', authenticate, conversationController.searchConversations);

// Get conversation statistics (requires authentication)
router.get('/stats/overview', authenticate, conversationController.getConversationStats);

module.exports = router;
