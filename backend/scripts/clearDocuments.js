#!/usr/bin/env node

/**
 * Clear Documents Script
 * This script removes all documents from database and Cloudinary
 */

const mongoose = require('mongoose');
const Document = require('../models/Document');
const { deleteFile } = require('../config/cloudinary');
require('dotenv').config();

const clearDocuments = async () => {
  try {
    console.log('🗑️  Starting document cleanup...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all documents
    const documents = await Document.find({});
    console.log(`📄 Found ${documents.length} documents to delete\n`);

    for (const document of documents) {
      console.log(`🗑️  Deleting: ${document.originalName}`);
      
      // Delete from Cloudinary
      try {
        if (document.cloudinaryPublicId) {
          await deleteFile(document.cloudinaryPublicId);
          console.log('✅ Deleted from Cloudinary');
        }
      } catch (cloudinaryError) {
        console.log('⚠️  Cloudinary deletion failed:', cloudinaryError.message);
      }
      
      // Delete from database
      await Document.findByIdAndDelete(document._id);
      console.log('✅ Deleted from database\n');
    }

    console.log('🎉 All documents cleared!');
    console.log('💡 You can now test with fresh PDF uploads');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

// Run cleanup
if (require.main === module) {
  clearDocuments()
    .then(() => {
      console.log('\n✅ Document cleanup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Document cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = clearDocuments;
