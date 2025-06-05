#!/usr/bin/env node

/**
 * Fix Users Script
 * This script fixes users that are missing firstName/lastName fields
 */

const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const fixUsers = async () => {
  try {
    console.log('🔧 Starting user data fix...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find users missing firstName or lastName
    const usersToFix = await User.find({
      $or: [
        { firstName: { $exists: false } },
        { lastName: { $exists: false } },
        { firstName: null },
        { lastName: null },
        { firstName: '' },
        { lastName: '' }
      ]
    });

    console.log(`📄 Found ${usersToFix.length} users to fix\n`);

    let fixedCount = 0;

    for (const user of usersToFix) {
      console.log(`📋 Fixing user: ${user.email}`);
      
      // Set default values if missing
      if (!user.firstName) {
        user.firstName = 'User';
        console.log('  ✅ Set firstName to "User"');
      }
      
      if (!user.lastName) {
        user.lastName = user.email.split('@')[0] || 'Unknown';
        console.log(`  ✅ Set lastName to "${user.lastName}"`);
      }
      
      // Save without triggering validation for required fields
      await User.updateOne(
        { _id: user._id },
        { 
          firstName: user.firstName,
          lastName: user.lastName
        }
      );
      
      fixedCount++;
      console.log('  ✅ Fixed!\n');
    }

    console.log(`🎉 Completed! Fixed ${fixedCount} users`);

  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

// Run fix
if (require.main === module) {
  fixUsers()
    .then(() => {
      console.log('\n✅ User fix completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ User fix failed:', error);
      process.exit(1);
    });
}

module.exports = fixUsers;
