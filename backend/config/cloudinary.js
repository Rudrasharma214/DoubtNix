const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const originalName = file.originalname.split('.')[0];

    console.log('📤 Cloudinary upload config for:', file.originalname);
    console.log('📋 MIME type:', file.mimetype);

    // Always use 'raw' resource type to avoid format restrictions
    const resourceType = 'raw';
    console.log('📁 Storing all files as raw (no format restrictions)');

    return {
      folder: 'ai-doubt-solver',
      resource_type: resourceType,
      public_id: `${timestamp}-${randomString}-${originalName}`,
      // No format restrictions at all
      use_filename: true,
      unique_filename: false
    };
  }
});

// Helper function to delete files from Cloudinary
const deleteFile = async (publicId) => {
  try {
    // Try deleting as raw first (since we store everything as raw now)
    let result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw'
    });

    // If not found as raw, try as auto (for backward compatibility)
    if (result.result === 'not found') {
      result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'auto'
      });
    }

    return result;
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    throw error;
  }
};

// Helper function to get file info
const getFileInfo = async (publicId) => {
  try {
    // Try getting info as raw first
    let result;
    try {
      result = await cloudinary.api.resource(publicId, {
        resource_type: 'raw'
      });
    } catch (rawError) {
      // If not found as raw, try as auto (for backward compatibility)
      result = await cloudinary.api.resource(publicId, {
        resource_type: 'auto'
      });
    }
    return result;
  } catch (error) {
    console.error('Error getting file info from Cloudinary:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  storage,
  deleteFile,
  getFileInfo
};
