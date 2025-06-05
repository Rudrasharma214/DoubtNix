#!/usr/bin/env node

/**
 * Fix File Types Script
 * This script corrects file types in the database based on file URLs
 */

const mongoose = require('mongoose');
const Document = require('../models/Document');
const FileTypeDetector = require('../utils/fileTypeDetector');
require('dotenv').config();

const fixFileTypes = async () => {
  try {
    console.log('🔧 Starting file type correction...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all documents
    const documents = await Document.find({});
    console.log(`📄 Found ${documents.length} documents to check\n`);

    let fixedCount = 0;

    for (const document of documents) {
      console.log(`\n📋 Checking: ${document.originalName}`);
      console.log(`🔗 URL: ${document.fileUrl}`);
      console.log(`📂 Current type: ${document.fileType}`);

      // Detect correct file type from URL
      const correctType = FileTypeDetector.getExtensionFromUrl(document.fileUrl);
      
      if (correctType && correctType !== document.fileType) {
        console.log(`🔄 Correcting: ${document.fileType} → ${correctType}`);
        
        await Document.findByIdAndUpdate(document._id, {
          fileType: correctType
        });
        
        fixedCount++;
        console.log(`✅ Fixed!`);
      } else {
        console.log(`✅ Type is correct`);
      }
    }

    console.log(`\n🎉 Completed! Fixed ${fixedCount} documents`);

  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

// Run fix
if (require.main === module) {
  fixFileTypes()
    .then(() => {
      console.log('\n✅ File type correction completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ File type correction failed:', error);
      process.exit(1);
    });
}

module.exports = fixFileTypes;
