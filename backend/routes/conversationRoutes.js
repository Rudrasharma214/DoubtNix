const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const conversationController = require('../controllers/conversationController');

// Validation middleware for updating conversation title
const validateTitleUpdate = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
];

// Get all conversations
router.get('/', conversationController.getAllConversations);

// Get conversation by ID
router.get('/:conversationId', conversationController.getConversationById);

// Update conversation title
router.put('/:conversationId/title', validateTitleUpdate, conversationController.updateConversationTitle);

// Delete conversation
router.delete('/:conversationId', conversationController.deleteConversation);

// Search conversations
router.get('/search/query', conversationController.searchConversations);

// Get conversation statistics
router.get('/stats/overview', conversationController.getConversationStats);

module.exports = router;
