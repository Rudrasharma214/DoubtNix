#!/usr/bin/env node

/**
 * Add User ID to Documents Migration
 * This script adds userId field to existing documents
 */

const mongoose = require('mongoose');
const Document = require('../models/Document');
const User = require('../models/User');
require('dotenv').config();

const addUserIdToDocuments = async () => {
  try {
    console.log('🔧 Starting document migration to add userId...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find documents without userId
    const documentsWithoutUserId = await Document.find({ 
      userId: { $exists: false } 
    });

    console.log(`📄 Found ${documentsWithoutUserId.length} documents without userId\n`);

    if (documentsWithoutUserId.length === 0) {
      console.log('✅ All documents already have userId field');
      return;
    }

    // Get the first user (or create a default user)
    let defaultUser = await User.findOne();
    
    if (!defaultUser) {
      console.log('⚠️ No users found. Creating a default user...');
      defaultUser = new User({
        email: 'admin@example.com',
        password: 'temppassword123',
        firstName: 'Admin',
        lastName: 'User'
      });
      await defaultUser.save();
      console.log('✅ Default user created');
    }

    console.log(`📋 Assigning documents to user: ${defaultUser.email}\n`);

    let migratedCount = 0;

    for (const document of documentsWithoutUserId) {
      console.log(`📄 Migrating document: ${document.originalName}`);
      
      // Add userId to the document
      await Document.updateOne(
        { _id: document._id },
        { userId: defaultUser._id }
      );
      
      migratedCount++;
      console.log('  ✅ Migrated!\n');
    }

    console.log(`🎉 Migration completed! Updated ${migratedCount} documents`);
    console.log('\n💡 Important Notes:');
    console.log('- All existing documents have been assigned to the first user');
    console.log('- New documents will be automatically assigned to their uploaders');
    console.log('- Users can now only see their own documents');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

// Run migration
if (require.main === module) {
  addUserIdToDocuments()
    .then(() => {
      console.log('\n✅ Document migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Document migration failed:', error);
      process.exit(1);
    });
}

module.exports = addUserIdToDocuments;
