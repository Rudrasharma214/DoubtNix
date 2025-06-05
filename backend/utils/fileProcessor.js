const fs = require('fs').promises;
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');

/**
 * Extract text from PDF files
 */
const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF: ' + error.message);
  }
};

/**
 * Extract text from DOC/DOCX files
 */
const extractTextFromDoc = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error('DOC extraction error:', error);
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
        await fs.unlink(optimizedImagePath);
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
    const stats = await fs.stat(filePath);
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

module.exports = {
  extractTextFromPDF,
  extractTextFromDoc,
  extractTextFromImage,
  optimizeImageForOCR,
  getFileType,
  isValidFileType,
  getFileSize,
  cleanExtractedText,
  extractText
};
