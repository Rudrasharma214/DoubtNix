const path = require('path');

/**
 * Robust file type detection utility
 */
class FileTypeDetector {
  
  /**
   * Get file type from multiple sources
   */
  static detectFileType(originalName, mimeType, cloudinaryUrl) {
    console.log('🔍 Starting file type detection...');
    console.log('📋 Input data:', { originalName, mimeType, cloudinaryUrl });

    // Priority: MIME type (most reliable) > Original filename > URL extension

    // 1. Try MIME type first (most reliable for PDFs)
    if (mimeType) {
      const mimeExtension = this.getExtensionFromMimeType(mimeType);
      if (this.isValidExtension(mimeExtension)) {
        console.log('✅ File type from MIME type:', mimeExtension);
        return mimeExtension;
      }
    }

    // 2. Try original filename extension
    if (originalName) {
      const extension = path.extname(originalName).toLowerCase().slice(1);
      if (this.isValidExtension(extension)) {
        console.log('✅ File type from original name:', extension);
        return extension;
      }
    }

    // 3. Try URL extension (least reliable)
    if (cloudinaryUrl) {
      const urlExtension = this.getExtensionFromUrl(cloudinaryUrl);
      if (this.isValidExtension(urlExtension)) {
        console.log('✅ File type from URL:', urlExtension);
        return urlExtension;
      }
    }

    console.log('⚠️ Could not detect file type, defaulting to unknown');
    return 'unknown';
  }
  
  /**
   * Extract extension from Cloudinary URL
   */
  static getExtensionFromUrl(url) {
    try {
      console.log('🔍 Analyzing URL:', url);

      // Remove query parameters and get the last part
      const cleanUrl = url.split('?')[0];
      console.log('🧹 Clean URL:', cleanUrl);

      // For Cloudinary URLs, the extension might be in the path before transformations
      // Example: /image/upload/v123/folder/file.pdf
      const pathParts = cleanUrl.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      console.log('📄 Last part:', lastPart);

      // Check if the last part has an extension
      if (lastPart.includes('.')) {
        const extension = path.extname(lastPart).toLowerCase().slice(1);
        console.log('✅ Found extension:', extension);
        return extension;
      }

      // If no extension in last part, check the original filename in the URL
      // Cloudinary sometimes encodes the original filename
      const decodedUrl = decodeURIComponent(cleanUrl);
      console.log('🔓 Decoded URL:', decodedUrl);

      const decodedParts = decodedUrl.split('/');
      const decodedLastPart = decodedParts[decodedParts.length - 1];

      if (decodedLastPart.includes('.')) {
        const extension = path.extname(decodedLastPart).toLowerCase().slice(1);
        console.log('✅ Found extension from decoded URL:', extension);
        return extension;
      }

      console.log('❌ No extension found in URL');
      return null;
    } catch (error) {
      console.error('Error extracting extension from URL:', error);
      return null;
    }
  }
  
  /**
   * Get extension from MIME type
   */
  static getExtensionFromMimeType(mimeType) {
    console.log('🔍 Checking MIME type:', mimeType);

    const mimeMap = {
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-word': 'doc',
      'application/word': 'doc',
      'application/x-msword': 'doc',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif'
    };

    const result = mimeMap[mimeType.toLowerCase()] || null;
    console.log('📋 MIME type result:', result);
    return result;
  }
  
  /**
   * Check if extension is valid/supported
   */
  static isValidExtension(extension) {
    const supportedTypes = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif'];
    return extension && supportedTypes.includes(extension.toLowerCase());
  }
  
  /**
   * Get processing category for file type
   */
  static getProcessingCategory(fileType) {
    if (['pdf'].includes(fileType)) {
      return 'pdf';
    } else if (['doc', 'docx'].includes(fileType)) {
      return 'document';
    } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileType)) {
      return 'image';
    } else {
      return 'unknown';
    }
  }
  
  /**
   * Validate file type for upload
   */
  static validateFileType(fileType) {
    return this.isValidExtension(fileType);
  }
}

module.exports = FileTypeDetector;
