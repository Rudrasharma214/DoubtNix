import React from 'react'
import { FileText, Image, Clock, CheckCircle, AlertCircle, Loader, Trash2 } from 'lucide-react'

const DocumentList = ({ documents, loading, onDocumentClick, onDeleteDocument }) => {
  const getFileIcon = (fileType) => {
    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileType)) {
      return <Image className="h-5 w-5 text-green-600" />
    }
    return <FileText className="h-5 w-5 text-blue-600" />
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'processing':
        return <Loader className="h-4 w-4 text-blue-600 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Ready'
      case 'processing':
        return 'Processing...'
      case 'failed':
        return 'Failed'
      default:
        return 'Pending'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50'
      case 'processing':
        return 'text-blue-600 bg-blue-50'
      case 'failed':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-yellow-600 bg-yellow-50'
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const handleDelete = (e, documentId) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to delete this document?')) {
      onDeleteDocument(documentId)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-20"></div>
          </div>
        ))}
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No documents uploaded yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Upload your first document to get started with AI-powered doubt solving
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {documents.map((document) => (
        <div
          key={document._id}
          onClick={() => {
            console.log('DocumentList - document object:', document);
            console.log('DocumentList - document._id:', document._id, 'Type:', typeof document._id);
            onDocumentClick(document._id);
          }}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-start sm:items-center justify-between">
            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
              {/* File Icon */}
              <div className="flex-shrink-0 mt-1 sm:mt-0">
                {getFileIcon(document.fileType)}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white truncate">
                  {document.originalName}
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 space-y-1 sm:space-y-0">
                  <span className="uppercase font-medium">
                    {document.fileType}
                  </span>
                  <span>{formatFileSize(document.fileSize)}</span>
                  <span className="hidden sm:inline">{formatDate(document.uploadedAt)}</span>
                  <span className="sm:hidden">{new Date(document.uploadedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Status and Actions */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 flex-shrink-0">
              {/* Status */}
              <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(document.processingStatus)}`}>
                {getStatusIcon(document.processingStatus)}
                <span className="hidden sm:inline">{getStatusText(document.processingStatus)}</span>
              </div>

              {/* Actions */}
              <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleDelete(e, document._id)}
                  className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1"
                  title="Delete document"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Processing Error */}
          {document.processingStatus === 'failed' && document.processingError && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-sm text-red-800 dark:text-red-300">
                  Processing failed: {document.processingError}
                </span>
              </div>
            </div>
          )}

          {/* Processing Status */}
          {document.processingStatus === 'processing' && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <div className="flex items-center space-x-2">
                <Loader className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
                <span className="text-sm text-blue-800 dark:text-blue-300">
                  Processing document... This may take a few moments.
                </span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default DocumentList
