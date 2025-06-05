#!/usr/bin/env node

/**
 * Debug Upload Script
 * This script helps debug file upload issues by showing supported MIME types
 */

console.log('🔍 Upload Debug Information\n');

console.log('✅ Supported File Types:');
console.log('📄 PDF Files:');
console.log('  - MIME: application/pdf');
console.log('  - Extensions: .pdf');

console.log('\n📝 Word Documents:');
console.log('  - MIME: application/msword (.doc)');
console.log('  - MIME: application/vnd.openxmlformats-officedocument.wordprocessingml.document (.docx)');
console.log('  - MIME: application/vnd.ms-word (.doc)');
console.log('  - MIME: application/word (.doc)');
console.log('  - MIME: application/x-msword (.doc)');
console.log('  - Extensions: .doc, .docx');

console.log('\n🖼️ Image Files:');
console.log('  - MIME: image/jpeg (.jpg, .jpeg)');
console.log('  - MIME: image/png (.png)');
console.log('  - MIME: image/gif (.gif)');
console.log('  - Extensions: .jpg, .jpeg, .png, .gif');

console.log('\n❌ Common Issues:');
console.log('1. File has unsupported MIME type');
console.log('2. File extension doesn\'t match content');
console.log('3. File is corrupted or empty');
console.log('4. File field name is not "file"');
console.log('5. File size exceeds 10MB limit');

console.log('\n🔧 Troubleshooting Steps:');
console.log('1. Check the exact error message in browser console');
console.log('2. Verify file extension matches file type');
console.log('3. Try with a different file');
console.log('4. Check file size (must be under 10MB)');
console.log('5. Ensure you\'re using the correct upload field name');

console.log('\n📋 To test a specific file:');
console.log('1. Open browser developer tools');
console.log('2. Go to Network tab');
console.log('3. Try uploading the file');
console.log('4. Check the request details and response');

console.log('\n💡 Quick Test Files:');
console.log('- Try uploading a simple .txt file renamed to .pdf (should fail)');
console.log('- Try uploading a real PDF file');
console.log('- Try uploading a JPG image');
console.log('- Check what error messages you get for each');

console.log('\n🚀 If still having issues:');
console.log('1. Share the exact error message');
console.log('2. Share the file type you\'re trying to upload');
console.log('3. Check backend console logs for detailed error info');
