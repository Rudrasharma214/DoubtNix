#!/usr/bin/env node

/**
 * Test DOCX Processing
 * This script tests if DOCX processing is working correctly
 */

const fileProcessor = require('./utils/fileProcessor');
const FileTypeDetector = require('./utils/fileTypeDetector');

const testDOCXProcessing = async () => {
  try {
    console.log('🧪 Testing DOCX processing...\n');
    
    // Test file type detection for DOCX
    console.log('🔍 Testing DOCX file type detection:');
    
    const testCases = [
      {
        originalName: 'test.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        url: 'https://example.com/test.docx'
      },
      {
        originalName: 'test.doc',
        mimeType: 'application/msword',
        url: 'https://example.com/test.doc'
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n📋 Testing: ${testCase.originalName}`);
      console.log(`📄 MIME: ${testCase.mimeType}`);
      
      const detectedType = FileTypeDetector.detectFileType(
        testCase.originalName,
        testCase.mimeType,
        testCase.url
      );
      
      console.log(`✅ Detected type: ${detectedType}`);
      
      const category = FileTypeDetector.getProcessingCategory(detectedType);
      console.log(`📂 Processing category: ${category}`);
    }
    
    console.log('\n💡 Tips for DOCX upload issues:');
    console.log('1. Make sure the file is a valid DOCX/DOC document');
    console.log('2. Check if the document is password protected');
    console.log('3. Try saving the document in a different format');
    console.log('4. Ensure the file is not corrupted');
    console.log('5. Check file size (should be under 10MB)');
    
    console.log('\n🔧 Supported DOCX MIME types:');
    console.log('- application/vnd.openxmlformats-officedocument.wordprocessingml.document (DOCX)');
    console.log('- application/msword (DOC)');
    console.log('- application/vnd.ms-word (DOC)');
    console.log('- application/word (DOC)');
    console.log('- application/x-msword (DOC)');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run test
testDOCXProcessing();
