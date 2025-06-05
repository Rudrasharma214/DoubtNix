import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react'

const FileUpload = ({ onFileUpload, uploading }) => {
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setDragActive(false)
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors[0]?.code === 'file-too-large') {
        alert('File is too large. Maximum size is 10MB.')
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        alert('Invalid file type. Please upload PDF, DOC, DOCX, JPG, JPEG, PNG, or GIF files.')
      }
      return
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      setSelectedFile(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false
  })

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      setUploadProgress(0)
      await onFileUpload(selectedFile)
      setSelectedFile(null)
      setUploadProgress(0)
    } catch (error) {
      setUploadProgress(0)
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setUploadProgress(0)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) {
      return '🖼️'
    } else if (fileType === 'application/pdf') {
      return '📄'
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return '📝'
    }
    return '📄'
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive || dragActive ? 'active' : ''} ${
          uploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center space-y-3 sm:space-y-4 p-4">
          <Upload className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 dark:text-gray-500" />
          <div className="text-center">
            <p className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
              {isDragActive || dragActive
                ? 'Drop the file here'
                : 'Drag and drop a file here, or click to select'}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">
              Supports PDF, DOCX, JPG, JPEG, PNG (max 10MB)
            </p>
          </div>
        </div>
      </div>

      {/* Selected File */}
      {selectedFile && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              <span className="text-xl sm:text-2xl flex-shrink-0">
                {getFileIcon(selectedFile.type)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>

            {!uploading && (
              <button
                onClick={removeFile}
                className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0 ml-2"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary-600 dark:bg-primary-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload Button */}
          {!uploading && (
            <div className="mt-3 sm:mt-4 flex justify-end">
              <button
                onClick={handleUpload}
                className="btn-primary text-sm sm:text-base px-3 sm:px-4 py-2"
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Upload File</span>
                <span className="sm:hidden">Upload</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium mb-1">Supported file types:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Documents:</strong> PDF, DOCX</li>
              <li><strong>Images:</strong> JPG, JPEG, PNG, (OCR will extract text)</li>
              <li><strong>Maximum file size:</strong> 10MB</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FileUpload
