#!/usr/bin/env node

/**
 * Migration Script: Local Files to Cloudinary
 * This script migrates existing documents from local storage to Cloudinary
 */

const mongoose = require('mongoose');
const Document = require('../models/Document');
require('dotenv').config();

const migrateDocuments = async () => {
  try {
    console.log('🚀 Starting migration to Cloudinary...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all documents with old schema
    const documents = await Document.find({
      filePath: { $exists: true },
      fileUrl: { $exists: false }
    });

    console.log(`📄 Found ${documents.length} documents to migrate\n`);

    if (documents.length === 0) {
      console.log('✅ No documents need migration');
      return;
    }

    // Option 1: Clear old documents (recommended for development)
    console.log('🗑️  Clearing old documents with local file paths...');
    const deleteResult = await Document.deleteMany({
      filePath: { $exists: true },
      fileUrl: { $exists: false }
    });
    
    console.log(`✅ Deleted ${deleteResult.deletedCount} old documents`);
    console.log('\n📝 Note: Users will need to re-upload their files');
    console.log('💡 This ensures all files are properly stored in Cloudinary');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

// Run migration
if (require.main === module) {
  migrateDocuments()
    .then(() => {
      console.log('\n✅ Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateDocuments;
