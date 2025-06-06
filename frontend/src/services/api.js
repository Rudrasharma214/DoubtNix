import axios from 'axios'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api',
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - Add authentication token
api.interceptors.request.use(
  (config) => {
    // Add JWT token to requests if available
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - Handle token refresh and errors
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  async (error) => {
    const originalRequest = error.config

    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          // Try to refresh the token
          const refreshResponse = await axios.post('/api/auth/refresh-token', {
            refreshToken,
          })

          const { token, refreshToken: newRefreshToken } = refreshResponse.data.data
          localStorage.setItem('authToken', token)
          localStorage.setItem('refreshToken', newRefreshToken)

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        } catch (refreshError) {
          // Refresh failed, clear auth data and redirect to login
          localStorage.removeItem('authToken')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('user')
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token, redirect to login
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }

    const message = error.response?.data?.message || error.message || 'An error occurred'
    return Promise.reject(new Error(message))
  }
)

// Upload API
export const uploadAPI = {
  uploadFile: (file, onProgress) => {
    const formData = new FormData()
    formData.append('file', file)
    
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          onProgress(percentCompleted)
        }
      },
    })
  },

  getDocumentStatus: (documentId) => {
    // Ensure documentId is a string and not an object
    let cleanDocumentId = documentId
    if (typeof documentId === 'object') {
      console.error('documentId is an object:', documentId)
      // Try to extract the actual ID if it's nested in an object
      cleanDocumentId = documentId.documentId || documentId.id || String(documentId)
    } else {
      cleanDocumentId = String(documentId)
    }

    return api.get(`/upload/status/${cleanDocumentId}`)
  },

  getDocuments: (page = 1, limit = 10) => {
    return api.get(`/upload/documents?page=${page}&limit=${limit}`)
  },

  deleteDocument: (documentId) => {
    return api.delete(`/upload/documents/${documentId}`)
  },
}

// Doubt API
export const doubtAPI = {
  askDoubt: (documentId, question, sessionId) => {
    return api.post('/doubt/ask', {
      documentId,
      question,
      sessionId,
    })
  },

  getConversationHistory: (documentId, sessionId) => {
    return api.get(`/doubt/conversation/${documentId}/${sessionId}`)
  },

  getDocumentConversations: (documentId, page = 1, limit = 10) => {
    return api.get(`/doubt/conversations/${documentId}?page=${page}&limit=${limit}`)
  },

  clearConversation: (conversationId) => {
    return api.delete(`/doubt/conversation/${conversationId}`)
  },

  getSuggestedQuestions: (documentId) => {
    return api.get(`/doubt/suggestions/${documentId}`)
  },
}

// Conversation API
export const conversationAPI = {
  getAllConversations: (page = 1, limit = 10) => {
    return api.get(`/conversations?page=${page}&limit=${limit}`)
  },

  getConversationById: (conversationId) => {
    return api.get(`/conversations/${conversationId}`)
  },

  updateConversationTitle: (conversationId, title) => {
    return api.put(`/conversations/${conversationId}/title`, { title })
  },

  deleteConversation: (conversationId) => {
    return api.delete(`/conversations/${conversationId}`)
  },

  searchConversations: (query, page = 1, limit = 10) => {
    return api.get(`/conversations/search/query?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`)
  },

  getConversationStats: () => {
    return api.get('/conversations/stats/overview')
  },
}

export default api
