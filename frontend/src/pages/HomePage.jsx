import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import FileUpload from '../components/FileUpload'
import DocumentList from '../components/DocumentList'
import { uploadAPI } from '../services/api'
import { FileText, Upload, MessageSquare, Brain } from 'lucide-react'

const HomePage = () => {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const response = await uploadAPI.getDocuments(1, 20)
      console.log('HomePage - loadDocuments response:', response.data)
      console.log('HomePage - documents array:', response.data.documents)
      setDocuments(response.data.documents)
    } catch (error) {
      console.error('Error loading documents:', error)
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file) => {
    try {
      setUploading(true)
      const response = await uploadAPI.uploadFile(file, (progress) => {
        // Progress is handled in FileUpload component
      })
      
      toast.success('File uploaded successfully!')
      
      // Refresh documents list
      await loadDocuments()
      
      // Navigate to document page after a short delay
      console.log('HomePage - Upload response:', response.data)
      console.log('HomePage - Navigating to document:', response.data.documentId)
      setTimeout(() => {
        navigate(`/document/${response.data.documentId}`)
      }, 1000)
      
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleDocumentClick = (documentId) => {
    console.log('HomePage - handleDocumentClick called with:', documentId, 'Type:', typeof documentId)
    navigate(`/document/${documentId}`)
  }

  const handleDeleteDocument = async (documentId) => {
    try {
      await uploadAPI.deleteDocument(documentId)
      toast.success('Document deleted successfully')
      await loadDocuments()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete document')
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero Section */}
      <div className="text-center px-4">
        <div className="flex justify-center mb-4">
          <Brain className="h-12 w-12 sm:h-16 sm:w-16 text-primary-600" />
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          DoubtNix - AI Doubt Solver
        </h1>
        <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto px-4">
          Upload your documents (PDF, DOC, or images) and get instant AI-powered answers
          to your questions. Powered by Google's Gemini AI.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="card text-center p-4 sm:p-6">
          <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600 mx-auto mb-3" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Easy Upload
          </h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
            Drag and drop or click to upload PDF, DOCX, or image files
          </p>
        </div>

        <div className="card text-center p-4 sm:p-6">
          <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600 mx-auto mb-3" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Smart Processing
          </h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
            Advanced text extraction from documents and OCR for images
          </p>
        </div>

        <div className="card text-center p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
          <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600 dark:text-primary-400 mx-auto mb-3" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
            AI Conversations
          </h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
            Ask questions and get detailed answers about your document content
          </p>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="card p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
          Upload a Document
        </h2>
        <FileUpload
          onFileUpload={handleFileUpload}
          uploading={uploading}
        />
      </div>

      {/* Recent Documents */}
      <div className="card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 space-y-2 sm:space-y-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Recent Documents
          </h2>
          {documents.length > 0 && (
            <button
              onClick={loadDocuments}
              className="btn-secondary text-sm self-start sm:self-auto"
              disabled={loading}
            >
              Refresh
            </button>
          )}
        </div>

        <DocumentList
          documents={documents}
          loading={loading}
          onDocumentClick={handleDocumentClick}
          onDeleteDocument={handleDeleteDocument}
        />
      </div>
    </div>
  )
}

export default HomePage
