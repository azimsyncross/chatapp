const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { 
  CLOUDINARY_CLOUD_NAME, 
  CLOUDINARY_API_KEY, 
  CLOUDINARY_API_SECRET 
} = require('../configs/variables');

// Configure Cloudinary
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET
});

class UploadService {
  constructor() {
    // Configure Cloudinary storage
    this.storage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'chat-images',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
        transformation: [{ 
          width: 1000, 
          height: 1000, 
          crop: 'limit' 
        }]
      }
    });

    // Configure multer with Cloudinary storage
    this.upload = multer({
      storage: this.storage,
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.mimetype)) {
          cb(new Error('Invalid file type'));
          return;
        }
        cb(null, true);
      }
    });
  }

  async uploadToCloudinary(file) {
    try {
      // Convert buffer to base64
      const base64Data = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(base64Data, {
        folder: 'chat-images',
        resource_type: 'auto'
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        resourceType: result.resource_type
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Image upload failed');
    }
  }

  async deleteFromCloudinary(publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
      return true;
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      return false;
    }
  }

  // Helper method to get upload middleware
  getUploadMiddleware() {
    return this.upload.single('image');
  }
}

module.exports = new UploadService(); 