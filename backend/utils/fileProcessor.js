const fs = require('fs');
const fsPromises = require('fs').promises;
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const axios = require('axios');
const path = require('path');
const os = require('os');

/**
 * Extract text from PDF files
 */
const extractTextFromPDF = async (filePath) => {
  try {
    console.log('📄 Reading PDF file:', filePath);
    const dataBuffer = await fsPromises.readFile(filePath);
    console.log('📊 PDF file size:', dataBuffer.length, 'bytes');

    // Check if file is actually a PDF
    const fileHeader = dataBuffer.slice(0, 4).toString();
    console.log('🔍 File header:', fileHeader);

    if (!fileHeader.includes('%PDF')) {
      throw new Error('File is not a valid PDF (missing PDF header)');
    }

    console.log('✅ Valid PDF detected, extracting text...');
    const data = await pdf(dataBuffer);
    console.log('📝 Extracted text length:', data.text.length, 'characters');

    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);

    // If PDF parsing fails, suggest it might be an image
    if (error.message.includes('Invalid PDF structure') || error.message.includes('PDF header')) {
      throw new Error('File appears to be corrupted or not a valid PDF. If this is an image of a document, please upload it as JPG/PNG for OCR processing.');
    }

    throw new Error('Failed to extract text from PDF: ' + error.message);
  }
};

/**
 * Extract text from DOC/DOCX files
 */
const extractTextFromDoc = async (filePath) => {
  try {
    console.log('📝 Reading DOCX/DOC file:', filePath);

    // Check if file exists and get size
    const stats = await fsPromises.stat(filePath);
    console.log('📊 Document file size:', stats.size, 'bytes');

    if (stats.size === 0) {
      throw new Error('Document file is empty');
    }

    console.log('✅ Valid document detected, extracting text...');
    const result = await mammoth.extractRawText({ path: filePath });

    console.log('📝 Extracted text length:', result.value.length, 'characters');

    if (result.messages && result.messages.length > 0) {
      console.log('⚠️ Document processing warnings:', result.messages);
    }

    return result.value;
  } catch (error) {
    console.error('DOC extraction error:', error);

    // Provide helpful error messages
    if (error.message.includes('ENOENT')) {
      throw new Error('Document file not found or corrupted during download');
    } else if (error.message.includes('password') || error.message.includes('encrypted')) {
      throw new Error('Document is password protected. Please remove password protection and try again.');
    } else if (error.message.includes('format')) {
      throw new Error('Document format not supported or file is corrupted');
    }

    throw new Error('Failed to extract text from document: ' + error.message);
  }
};

/**
 * Extract text from images using OCR
 */
const extractTextFromImage = async (filePath) => {
  try {
    // First, optimize the image for better OCR results
    const optimizedImagePath = await optimizeImageForOCR(filePath);
    
    // Perform OCR
    const { data: { text } } = await Tesseract.recognize(optimizedImagePath, 'eng', {
      logger: m => console.log(m) // Optional: log OCR progress
    });

    // Clean up optimized image if it's different from original
    if (optimizedImagePath !== filePath) {
      try {
        await fsPromises.unlink(optimizedImagePath);
      } catch (cleanupError) {
        console.error('Error cleaning up optimized image:', cleanupError);
      }
    }

    return text.trim();
  } catch (error) {
    console.error('OCR extraction error:', error);
    throw new Error('Failed to extract text from image: ' + error.message);
  }
};

/**
 * Optimize image for better OCR results
 */
const optimizeImageForOCR = async (filePath) => {
  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();
    
    // Only optimize if image needs it
    const needsOptimization = metadata.width < 1000 || metadata.density < 150;
    
    if (!needsOptimization) {
      return filePath;
    }

    // Create optimized version
    const optimizedPath = filePath.replace(/\.[^/.]+$/, '_optimized.png');
    
    await image
      .resize({ 
        width: Math.max(metadata.width * 2, 1500),
        height: Math.max(metadata.height * 2, 1500),
        fit: 'inside',
        withoutEnlargement: false
      })
      .sharpen()
      .normalize()
      .png({ quality: 100 })
      .toFile(optimizedPath);

    return optimizedPath;
  } catch (error) {
    console.error('Image optimization error:', error);
    // Return original path if optimization fails
    return filePath;
  }
};

/**
 * Get file type from file path
 */
const getFileType = (filePath) => {
  const extension = filePath.split('.').pop().toLowerCase();
  return extension;
};

/**
 * Validate file type
 */
const isValidFileType = (filePath) => {
  const allowedTypes = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif'];
  const fileType = getFileType(filePath);
  return allowedTypes.includes(fileType);
};

/**
 * Get file size in bytes
 */
const getFileSize = async (filePath) => {
  try {
    const stats = await fsPromises.stat(filePath);
    return stats.size;
  } catch (error) {
    console.error('Error getting file size:', error);
    return 0;
  }
};

/**
 * Clean extracted text (remove extra whitespace, special characters, etc.)
 */
const cleanExtractedText = (text) => {
  if (!text) return '';
  
  return text
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/\n\s*\n/g, '\n') // Remove empty lines
    .replace(/[^\w\s\n.,!?;:()\-"']/g, '') // Remove special characters except basic punctuation
    .trim();
};

/**
 * Extract text based on file type
 */
const extractText = async (filePath) => {
  if (!await isValidFileType(filePath)) {
    throw new Error('Unsupported file type');
  }

  const fileType = getFileType(filePath);
  let extractedText = '';

  switch (fileType) {
    case 'pdf':
      extractedText = await extractTextFromPDF(filePath);
      break;
    case 'doc':
    case 'docx':
      extractedText = await extractTextFromDoc(filePath);
      break;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      extractedText = await extractTextFromImage(filePath);
      break;
    default:
      throw new Error('Unsupported file type: ' + fileType);
  }

  return cleanExtractedText(extractedText);
};

/**
 * Download file from URL to temporary location
 */
const downloadFileFromUrl = async (url) => {
  try {
    console.log('📥 Downloading file from URL:', url);

    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    const tempDir = os.tmpdir();
    const fileName = `temp_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const tempFilePath = path.join(tempDir, fileName);

    console.log('💾 Saving to temp file:', tempFilePath);

    const writer = fs.createWriteStream(tempFilePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log('✅ File downloaded successfully');
        resolve(tempFilePath);
      });
      writer.on('error', (error) => {
        console.error('❌ Download error:', error);
        reject(error);
      });
    });
  } catch (error) {
    console.error('Error downloading file from URL:', error);
    throw new Error('Failed to download file: ' + error.message);
  }
};

/**
 * Extract text from PDF URL
 */
const extractTextFromPDFUrl = async (url) => {
  let tempFilePath = null;
  try {
    tempFilePath = await downloadFileFromUrl(url);
    const text = await extractTextFromPDF(tempFilePath);
    return text;
  } catch (error) {
    console.error('PDF URL extraction error:', error);
    throw new Error('Failed to extract text from PDF URL: ' + error.message);
  } finally {
    if (tempFilePath) {
      try {
        await fsPromises.unlink(tempFilePath);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }
  }
};

/**
 * Extract text from DOC/DOCX URL
 */
const extractTextFromDocUrl = async (url) => {
  let tempFilePath = null;
  try {
    tempFilePath = await downloadFileFromUrl(url);
    const text = await extractTextFromDoc(tempFilePath);
    return text;
  } catch (error) {
    console.error('DOC URL extraction error:', error);
    throw new Error('Failed to extract text from document URL: ' + error.message);
  } finally {
    if (tempFilePath) {
      try {
        await fsPromises.unlink(tempFilePath);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }
  }
};

/**
 * Extract text from Image URL
 */
const extractTextFromImageUrl = async (url) => {
  let tempFilePath = null;
  try {
    tempFilePath = await downloadFileFromUrl(url);
    const text = await extractTextFromImage(tempFilePath);
    return text;
  } catch (error) {
    console.error('Image URL extraction error:', error);
    throw new Error('Failed to extract text from image URL: ' + error.message);
  } finally {
    if (tempFilePath) {
      try {
        await fsPromises.unlink(tempFilePath);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }
  }
};

module.exports = {
  extractTextFromPDF,
  extractTextFromDoc,
  extractTextFromImage,
  extractTextFromPDFUrl,
  extractTextFromDocUrl,
  extractTextFromImageUrl,
  downloadFileFromUrl,
  optimizeImageForOCR,
  getFileType,
  isValidFileType,
  getFileSize,
  cleanExtractedText,
  extractText
};
