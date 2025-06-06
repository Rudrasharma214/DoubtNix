const Conversation = require('../models/Conversation');
const Document = require('../models/Document');

/**
 * Get user's conversations only (filtered by document ownership)
 */
const getAllConversations = async (req, res) => {
  try {
    // console.log('📄 Fetching conversations for user:', req.user.id);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // First, get user's documents
    const userDocuments = await Document.find({ userId: req.user.id }).select('_id');
    const userDocumentIds = userDocuments.map(doc => doc._id);

    // console.log(`📄 User has ${userDocumentIds.length} documents`);

    // Then get conversations for those documents only
    const conversations = await Conversation.find({
      isActive: true,
      documentId: { $in: userDocumentIds }
    })
      .populate('documentId', 'originalName fileType uploadedAt')
      .sort({ lastActivity: -1 })
      .skip(skip)
      .limit(limit)
      .select('sessionId title lastActivity messages documentId');

    const total = await Conversation.countDocuments({
      isActive: true,
      documentId: { $in: userDocumentIds }
    });

    // console.log(`✅ Found ${conversations.length} conversations for user (total: ${total})`);

    // Add message count and last message preview
    const conversationsWithDetails = conversations.map(conv => {
      const lastMessage = conv.messages[conv.messages.length - 1];
      return {
        ...conv.toObject(),
        messageCount: conv.messages.length,
        lastMessage: lastMessage ? {
          type: lastMessage.type,
          content: lastMessage.content.length > 100 
            ? lastMessage.content.substring(0, 100) + '...' 
            : lastMessage.content,
          timestamp: lastMessage.timestamp
        } : null
      };
    });

    res.json({
      success: true,
      data: {
        conversations: conversationsWithDetails,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    // console.error('Get all conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversations',
      error: error.message
    });
  }
};

/**
 * Get conversation by ID (only if user owns the document)
 */
const getConversationById = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId)
      .populate('documentId', 'originalName fileType uploadedAt extractedText userId');

    if (!conversation || !conversation.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Check if the document belongs to the current user
    if (conversation.documentId.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - conversation not found'
      });
    }

    res.json({
      success: true,
      data: {
        conversation: {
          id: conversation._id,
          sessionId: conversation.sessionId,
          title: conversation.title,
          messages: conversation.messages,
          lastActivity: conversation.lastActivity,
          documentInfo: {
            id: conversation.documentId._id,
            name: conversation.documentId.originalName,
            type: conversation.documentId.fileType,
            uploadedAt: conversation.documentId.uploadedAt,
            hasExtractedText: !!conversation.documentId.extractedText
          }
        }
      }
    });

  } catch (error) {
    // console.error('Get conversation by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversation',
      error: error.message
    });
  }
};

/**
 * Update conversation title
 */
const updateConversationTitle = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { title } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    const conversation = await Conversation.findById(conversationId)
      .populate('documentId', 'userId');

    if (!conversation || !conversation.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Check if the document belongs to the current user
    if (conversation.documentId.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - conversation not found'
      });
    }

    conversation.title = title.trim();
    await conversation.save();

    res.json({
      success: true,
      message: 'Conversation title updated successfully',
      data: {
        conversationId: conversation._id,
        title: conversation.title
      }
    });

  } catch (error) {
    // console.error('Update conversation title error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update conversation title',
      error: error.message
    });
  }
};

/**
 * Delete conversation
 */
const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId)
      .populate('documentId', 'userId');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Check if the document belongs to the current user
    if (conversation.documentId.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - conversation not found'
      });
    }

    // Mark as inactive instead of deleting
    conversation.isActive = false;
    await conversation.save();

    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });

  } catch (error) {
    // console.error('Delete conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete conversation',
      error: error.message
    });
  }
};

/**
 * Search conversations
 */
const searchConversations = async (req, res) => {
  try {
    const { query } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Get user's documents first
    const userDocuments = await Document.find({ userId: req.user.id }).select('_id');
    const userDocumentIds = userDocuments.map(doc => doc._id);

    // Search in conversation titles and message content (only user's conversations)
    const searchRegex = new RegExp(query.trim(), 'i');

    const conversations = await Conversation.find({
      isActive: true,
      documentId: { $in: userDocumentIds },
      $or: [
        { title: searchRegex },
        { 'messages.content': searchRegex }
      ]
    })
    .populate('documentId', 'originalName fileType')
    .sort({ lastActivity: -1 })
    .skip(skip)
    .limit(limit)
    .select('sessionId title lastActivity messages documentId');

    const total = await Conversation.countDocuments({
      isActive: true,
      documentId: { $in: userDocumentIds },
      $or: [
        { title: searchRegex },
        { 'messages.content': searchRegex }
      ]
    });

    // Highlight search matches in results
    const conversationsWithHighlights = conversations.map(conv => {
      const matchingMessages = conv.messages.filter(msg => 
        searchRegex.test(msg.content)
      ).slice(0, 3); // Show up to 3 matching messages

      return {
        ...conv.toObject(),
        messageCount: conv.messages.length,
        matchingMessages: matchingMessages.map(msg => ({
          type: msg.type,
          content: msg.content.length > 150 
            ? msg.content.substring(0, 150) + '...' 
            : msg.content,
          timestamp: msg.timestamp
        }))
      };
    });

    res.json({
      success: true,
      data: {
        query,
        conversations: conversationsWithHighlights,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    // console.error('Search conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search conversations',
      error: error.message
    });
  }
};

/**
 * Get user's conversation statistics only
 */
const getConversationStats = async (req, res) => {
  try {
    // Get user's documents first
    const userDocuments = await Document.find({ userId: req.user.id }).select('_id');
    const userDocumentIds = userDocuments.map(doc => doc._id);

    const totalConversations = await Conversation.countDocuments({
      isActive: true,
      documentId: { $in: userDocumentIds }
    });
    const totalDocuments = userDocuments.length;
    
    // Get conversations from last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recentConversations = await Conversation.countDocuments({
      isActive: true,
      documentId: { $in: userDocumentIds },
      lastActivity: { $gte: weekAgo }
    });

    // Get most active documents (user's documents only)
    const activeDocuments = await Conversation.aggregate([
      { $match: {
        isActive: true,
        documentId: { $in: userDocumentIds }
      }},
      { $group: { 
        _id: '$documentId', 
        conversationCount: { $sum: 1 },
        lastActivity: { $max: '$lastActivity' }
      }},
      { $sort: { conversationCount: -1 } },
      { $limit: 5 },
      { $lookup: {
        from: 'documents',
        localField: '_id',
        foreignField: '_id',
        as: 'document'
      }},
      { $unwind: '$document' },
      { $project: {
        documentName: '$document.originalName',
        fileType: '$document.fileType',
        conversationCount: 1,
        lastActivity: 1
      }}
    ]);

    res.json({
      success: true,
      data: {
        totalConversations,
        totalDocuments,
        recentConversations,
        activeDocuments
      }
    });

  } catch (error) {
    // console.error('Get conversation stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversation statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllConversations,
  getConversationById,
  updateConversationTitle,
  deleteConversation,
  searchConversations,
  getConversationStats
};
