#!/usr/bin/env node

/**
 * Test PDF Processing
 * This script tests if PDF processing is working correctly
 */

const fileProcessor = require('./utils/fileProcessor');
const path = require('path');

const testPDFProcessing = async () => {
  try {
    console.log('🧪 Testing PDF processing...\n');
    
    // Test with a Cloudinary PDF URL (if you have one)
    const testUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    
    console.log('📥 Testing with sample PDF URL:', testUrl);
    
    try {
      const extractedText = await fileProcessor.extractTextFromPDFUrl(testUrl);
      console.log('✅ PDF processing successful!');
      console.log('📝 Extracted text preview:', extractedText.substring(0, 200) + '...');
    } catch (error) {
      console.log('❌ PDF processing failed:', error.message);
    }
    
    console.log('\n💡 Tips for PDF upload issues:');
    console.log('1. Make sure the file is a valid PDF');
    console.log('2. Check if the PDF is password protected');
    console.log('3. Try with a different PDF file');
    console.log('4. If it\'s a scanned document, upload as image (JPG/PNG) for OCR');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run test
testPDFProcessing();
