const Document = require('../models/Document');
const Conversation = require('../models/Conversation');
const geminiService = require('../services/geminiService');
const { validationResult } = require('express-validator');

/**
 * Ask a question about a document
 */
const askDoubt = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      console.log('Request body:', req.body);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { documentId, question, sessionId, language = 'english' } = req.body;

    // Find the document (only if it belongs to the user)
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

    // Check if document processing is complete
    if (document.processingStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        message: `Document is still ${document.processingStatus}. Please wait for processing to complete.`
      });
    }

    // Find or create conversation
    let conversation = await Conversation.findOne({ 
      documentId, 
      sessionId,
      isActive: true 
    });

    if (!conversation) {
      conversation = new Conversation({
        documentId,
        sessionId,
        title: question.length > 50 ? question.substring(0, 50) + '...' : question,
        messages: []
      });
    }

    // Add user message
    conversation.messages.push({
      type: 'user',
      content: question
    });

    // Get AI response using Gemini
    const context = {
      documentText: document.extractedText,
      conversationHistory: conversation.messages.slice(-10) // Last 10 messages for context
    };

    const aiResponse = await geminiService.generateResponse(question, context, language);

    // Add AI response
    conversation.messages.push({
      type: 'ai',
      content: aiResponse
    });

    // Save conversation
    await conversation.save();

    res.json({
      success: true,
      data: {
        conversationId: conversation._id,
        sessionId: conversation.sessionId,
        question,
        answer: aiResponse,
        timestamp: new Date()
      }
    });

  } catch (error) {
    // console.error('Ask doubt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process your question',
      error: error.message
    });
  }
};

/**
 * Get conversation history
 */
const getConversationHistory = async (req, res) => {
  try {
    const { documentId, sessionId } = req.params;

    const conversation = await Conversation.findOne({
      documentId,
      sessionId,
      isActive: true
    }).populate('documentId', 'originalName fileType');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      data: {
        conversationId: conversation._id,
        documentInfo: {
          id: conversation.documentId._id,
          name: conversation.documentId.originalName,
          type: conversation.documentId.fileType
        },
        title: conversation.title,
        messages: conversation.messages,
        lastActivity: conversation.lastActivity
      }
    });

  } catch (error) {
    // console.error('Get conversation history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversation history',
      error: error.message
    });
  }
};

/**
 * Get all conversations for a document
 */
const getDocumentConversations = async (req, res) => {
  try {
    const { documentId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check if document exists and belongs to user
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

    const conversations = await Conversation.find({
      documentId,
      isActive: true
    })
    .sort({ lastActivity: -1 })
    .skip(skip)
    .limit(limit)
    .select('sessionId title lastActivity messages');

    const total = await Conversation.countDocuments({
      documentId,
      isActive: true
    });

    // Add message count to each conversation
    const conversationsWithCount = conversations.map(conv => ({
      ...conv.toObject(),
      messageCount: conv.messages.length
    }));

    res.json({
      success: true,
      data: {
        documentInfo: {
          id: document._id,
          name: document.originalName,
          type: document.fileType
        },
        conversations: conversationsWithCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    // console.error('Get document conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversations',
      error: error.message
    });
  }
};

/**
 * Clear conversation history
 */
const clearConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Mark conversation as inactive instead of deleting
    conversation.isActive = false;
    await conversation.save();

    res.json({
      success: true,
      message: 'Conversation cleared successfully'
    });

  } catch (error) {
    // console.error('Clear conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear conversation',
      error: error.message
    });
  }
};

/**
 * Get suggested questions based on document content
 */
const getSuggestedQuestions = async (req, res) => {
  try {
    const { documentId } = req.params;

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

    if (document.processingStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Document is still processing'
      });
    }

    // Generate suggested questions using Gemini
    const suggestions = await geminiService.generateSuggestedQuestions(document.extractedText);

    res.json({
      success: true,
      data: {
        documentId: document._id,
        suggestions
      }
    });

  } catch (error) {
    // console.error('Get suggested questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate suggested questions',
      error: error.message
    });
  }
};

module.exports = {
  askDoubt,
  getConversationHistory,
  getDocumentConversations,
  clearConversation,
  getSuggestedQuestions
};
