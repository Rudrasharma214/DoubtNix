import React from 'react'
import { FileText, Image, Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react'

const DocumentInfo = ({ document }) => {
  const getFileIcon = (fileType) => {
    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileType)) {
      return <Image className="h-6 w-6 text-green-600" />
    }
    return <FileText className="h-6 w-6 text-blue-600" />
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'processing':
        return <Loader className="h-5 w-5 text-blue-600 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Processing Complete - Ready for Questions'
      case 'processing':
        return 'Processing Document...'
      case 'failed':
        return 'Processing Failed'
      default:
        return 'Pending Processing'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'processing':
        return 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      case 'failed':
        return 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      default:
        return 'text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
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
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="card">
      <div className="flex items-start space-x-4">
        {/* File Icon */}
        <div className="flex-shrink-0">
          {getFileIcon(document.fileType)}
        </div>

        {/* Document Details */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
            {document.filename}
          </h1>

          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-300">
            <div>
              <span className="font-medium">File Type:</span>
              <span className="ml-2 uppercase font-mono">
                {document.fileType}
              </span>
            </div>
            
            <div>
              <span className="font-medium">Size:</span>
              <span className="ml-2">
                {formatFileSize(document.fileSize)}
              </span>
            </div>
            
            <div>
              <span className="font-medium">Uploaded:</span>
              <span className="ml-2">
                {formatDate(document.uploadedAt)}
              </span>
            </div>
            
            {document.processedAt && (
              <div>
                <span className="font-medium">Processed:</span>
                <span className="ml-2">
                  {formatDate(document.processedAt)}
                </span>
              </div>
            )}
          </div>

          {/* Processing Status */}
          <div className={`mt-4 inline-flex items-center space-x-2 px-3 py-2 rounded-lg border ${getStatusColor(document.processingStatus)}`}>
            {getStatusIcon(document.processingStatus)}
            <span className="font-medium">
              {getStatusText(document.processingStatus)}
            </span>
          </div>

          {/* Processing Error */}
          {document.processingStatus === 'failed' && document.processingError && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800 dark:text-red-300">Processing Error</h4>
                  <p className="text-red-700 dark:text-red-300 mt-1">{document.processingError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Processing Info */}
          {document.processingStatus === 'processing' && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start space-x-2">
                <Loader className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-300">Processing Document</h4>
                  <p className="text-blue-700 dark:text-blue-300 mt-1">
                    We're extracting text from your document. This may take a few moments
                    depending on the file size and complexity.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Extracted Text Preview */}
          {document.processingStatus === 'completed' && document.extractedText && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Document Preview</h4>
              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 max-h-32 overflow-y-auto custom-scrollbar">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {document.extractedText.substring(0, 500)}
                  {document.extractedText.length > 500 && '...'}
                </p>
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                📄 Text extracted and stored ({document.extractedText.length} characters)
                {document.fileUrl && (
                  <span className="ml-2">
                    • 🌤️ File stored in cloud
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DocumentInfo
