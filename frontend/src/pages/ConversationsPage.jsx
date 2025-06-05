import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { conversationAPI } from '../services/api'
import { MessageSquare, Search, FileText, Clock, Trash2, User, Bot } from 'lucide-react'

const ConversationsPage = () => {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadConversations()
    loadStats()
  }, [])

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch()
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const loadConversations = async () => {
    try {
      setLoading(true)
      const response = await conversationAPI.getAllConversations(1, 20)
      setConversations(response.data.conversations)
    } catch (error) {
      console.error('Error loading conversations:', error)
      toast.error('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await conversationAPI.getConversationStats()
      setStats(response.data)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const performSearch = async () => {
    try {
      setSearching(true)
      const response = await conversationAPI.searchConversations(searchQuery.trim())
      setSearchResults(response.data.conversations)
    } catch (error) {
      console.error('Error searching conversations:', error)
      toast.error('Search failed')
    } finally {
      setSearching(false)
    }
  }

  const handleDeleteConversation = async (conversationId) => {
    if (!window.confirm('Are you sure you want to delete this conversation?')) {
      return
    }

    try {
      await conversationAPI.deleteConversation(conversationId)
      toast.success('Conversation deleted successfully')
      await loadConversations()
      await loadStats()
    } catch (error) {
      console.error('Error deleting conversation:', error)
      toast.error('Failed to delete conversation')
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      return 'Today'
    } else if (diffDays === 2) {
      return 'Yesterday'
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const ConversationCard = ({ conversation, showMatchingMessages = false }) => {
    // Safely access documentInfo with fallback values
    const documentInfo = conversation.documentInfo || {};

    // Debug logging to see what we're working with
    console.log('ConversationCard - conversation:', conversation);
    console.log('ConversationCard - documentInfo:', documentInfo);
    console.log('ConversationCard - conversation.documentId:', conversation.documentId);

    // Extract documentId with proper type checking
    let documentId = 'unknown';

    // Check if documentId is an object with _id property
    if (typeof conversation.documentId === 'object' && conversation.documentId && conversation.documentId._id) {
      documentId = conversation.documentId._id;
    } else if (typeof conversation.documentId === 'string' && conversation.documentId) {
      documentId = conversation.documentId;
    } else if (typeof documentInfo.id === 'string' && documentInfo.id) {
      documentId = documentInfo.id;
    } else if (typeof conversation.document === 'string' && conversation.document) {
      documentId = conversation.document;
    } else if (typeof conversation.document === 'object' && conversation.document && conversation.document._id) {
      documentId = conversation.document._id;
    }

    console.log('ConversationCard - extracted documentId:', documentId);

    const documentName = documentInfo.name || 'Unknown Document';

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <Link
              to={`/document/${documentId}`}
              className="block group"
            >
              <h3 className="text-lg font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                {conversation.title || 'Untitled Conversation'}
              </h3>

              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mt-2">
                <div className="flex items-center space-x-1">
                  <FileText className="h-4 w-4" />
                  <span>{documentName}</span>
                </div>
              <div className="flex items-center space-x-1">
                <MessageSquare className="h-4 w-4" />
                <span>{conversation.messageCount} messages</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{formatDate(conversation.lastActivity)}</span>
              </div>
            </div>

            {/* Last Message Preview */}
            {conversation.lastMessage && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-start space-x-2">
                  {conversation.lastMessage.type === 'user' ? (
                    <User className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  ) : (
                    <Bot className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {conversation.lastMessage.content}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Matching Messages (for search results) */}
            {showMatchingMessages && conversation.matchingMessages && conversation.matchingMessages.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-gray-600">Matching messages:</p>
                {conversation.matchingMessages.map((message, index) => (
                  <div key={index} className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    <div className="flex items-center space-x-1 mb-1">
                      {message.type === 'user' ? (
                        <User className="h-3 w-3 text-blue-600" />
                      ) : (
                        <Bot className="h-3 w-3 text-green-600" />
                      )}
                      <span className="text-xs font-medium capitalize">{message.type}</span>
                    </div>
                    <p className="text-gray-700">{message.content}</p>
                  </div>
                ))}
              </div>
            )}
          </Link>
        </div>

        <button
          onClick={() => handleDeleteConversation(conversation._id)}
          className="text-gray-400 hover:text-red-600 transition-colors p-1 ml-2"
          title="Delete conversation"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
    );
  };

  const displayConversations = searchQuery.trim() ? searchResults : conversations

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Conversations</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Browse and search through your document conversations
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <div className="text-2xl font-bold text-primary-600">
              {stats.totalConversations}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Conversations</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.totalDocuments}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Documents</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.recentConversations}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">This Week</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.activeDocuments?.length || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Active Documents</div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="card">
        <div className="flex items-center space-x-3">
          <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 border-0 focus:ring-0 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-transparent"
          />
          {searching && (
            <div className="loading-spinner" />
          )}
        </div>
      </div>

      {/* Conversations List */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-32"></div>
              </div>
            ))}
          </div>
        ) : displayConversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchQuery.trim() ? 'No conversations found' : 'No conversations yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {searchQuery.trim()
                ? 'Try adjusting your search terms'
                : 'Upload a document and start asking questions to create your first conversation'
              }
            </p>
          </div>
        ) : (
          displayConversations.map((conversation) => (
            <ConversationCard
              key={conversation._id}
              conversation={conversation}
              showMatchingMessages={!!searchQuery.trim()}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default ConversationsPage
