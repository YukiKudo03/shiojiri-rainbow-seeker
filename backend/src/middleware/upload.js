const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { securityLogger, logger } = require('../utils/logger');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Enhanced file filter with security checks
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedMimes.includes(file.mimetype.toLowerCase());
  
  // Check file name for suspicious patterns
  const suspiciousPatterns = /[<>:"|?*\\\/]|\.php$|\.js$|\.html?$/i;
  if (suspiciousPatterns.test(file.originalname)) {
    securityLogger.logSuspiciousActivity(req, `Suspicious filename: ${file.originalname}`);
    return cb(new Error('Invalid filename detected'));
  }

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    securityLogger.logSuspiciousActivity(req, `Invalid file type: ${file.mimetype}`);
    cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'));
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (will be compressed)
    files: 1, // Only one file at a time
    fieldNameSize: 100, // Field name size limit
    fieldSize: 1024 * 1024 // Field value size limit
  },
  fileFilter: fileFilter
});

// Image processing middleware
const processImage = async (req, res, next) => {
  if (!req.file) return next();
  
  const startTime = Date.now();
  
  try {
    const originalPath = req.file.path;
    const processedFilename = `processed_${req.file.filename.replace(/\.[^.]+$/, '.webp')}`;
    const processedPath = path.join(uploadsDir, processedFilename);
    
    // Process image with sharp
    const metadata = await sharp(originalPath).metadata();
    
    // Security check: verify it's actually an image
    if (!metadata.format || !['jpeg', 'png', 'webp', 'gif'].includes(metadata.format)) {
      fs.unlinkSync(originalPath);
      securityLogger.logSuspiciousActivity(req, 'File is not a valid image format');
      return next(new Error('Invalid image file'));
    }
    
    // Process and optimize image
    await sharp(originalPath)
      .resize(1920, 1080, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .webp({ 
        quality: 85,
        effort: 6
      })
      .toFile(processedPath);
    
    // Remove original file
    fs.unlinkSync(originalPath);
    
    // Update file info
    req.file.path = processedPath;
    req.file.filename = processedFilename;
    req.file.mimetype = 'image/webp';
    
    const duration = Date.now() - startTime;
    logger.info('Image processed successfully', {
      originalSize: req.file.size,
      processedPath: processedFilename,
      duration: `${duration}ms`,
      userId: req.user?.id
    });
    
    next();
  } catch (error) {
    // Clean up files on error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    logger.error('Image processing failed', {
      error: error.message,
      filename: req.file?.filename,
      userId: req.user?.id
    });
    
    next(new Error('Image processing failed'));
  }
};

// File validation middleware
const validateImageFile = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: { message: 'No image file provided' }
    });
  }

  try {
    // Additional validation using sharp
    const metadata = await sharp(req.file.path).metadata();
    
    // Check image dimensions
    if (metadata.width > 5000 || metadata.height > 5000) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: { message: 'Image dimensions too large (max 5000x5000)' }
      });
    }
    
    // Check if image has suspicious metadata
    if (metadata.exif && Buffer.byteLength(JSON.stringify(metadata.exif)) > 10000) {
      logger.warn('Large EXIF data detected', {
        filename: req.file.filename,
        exifSize: Buffer.byteLength(JSON.stringify(metadata.exif)),
        userId: req.user?.id
      });
    }
    
    next();
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    logger.error('Image validation failed', {
      error: error.message,
      filename: req.file?.filename,
      userId: req.user?.id
    });
    
    res.status(400).json({
      success: false,
      error: { message: 'Invalid image file' }
    });
  }
};

module.exports = {
  upload,
  processImage,
  validateImageFile
};