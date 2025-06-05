#!/usr/bin/env node

/**
 * Test Cloudinary Connection
 * Run this to verify your Cloudinary credentials are working
 */

require('dotenv').config();
const { cloudinary } = require('./config/cloudinary');

const testCloudinary = async () => {
  try {
    console.log('🌤️  Testing Cloudinary connection...\n');
    
    // Check environment variables
    console.log('📋 Environment Variables:');
    console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing');
    console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing');
    
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.log('\n❌ Missing Cloudinary credentials in .env file');
      return;
    }
    
    // Test API connection
    console.log('\n🔗 Testing API connection...');
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary API connection successful!');
    console.log('📊 Response:', result);
    
    // Test folder access
    console.log('\n📁 Testing folder access...');
    try {
      const folderResult = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'ai-doubt-solver/',
        max_results: 1
      });
      console.log('✅ Folder access successful!');
      console.log('📂 Files in ai-doubt-solver folder:', folderResult.resources.length);
    } catch (folderError) {
      console.log('⚠️  Folder not found (this is normal for new accounts)');
    }
    
    console.log('\n🎉 Cloudinary is properly configured!');
    
  } catch (error) {
    console.error('\n❌ Cloudinary test failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('Invalid API key')) {
      console.log('\n💡 Fix: Check your CLOUDINARY_API_KEY in .env file');
    } else if (error.message.includes('Invalid cloud name')) {
      console.log('\n💡 Fix: Check your CLOUDINARY_CLOUD_NAME in .env file');
    } else if (error.message.includes('Invalid API secret')) {
      console.log('\n💡 Fix: Check your CLOUDINARY_API_SECRET in .env file');
    }
  }
};

// Run test
testCloudinary();
