const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Generate random string
exports.generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Calculate distance between two coordinates
exports.calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Format response object
exports.formatResponse = (success, data = null, error = null) => {
  const response = { success };
  
  if (success && data) {
    response.data = data;
  }
  
  if (!success && error) {
    response.error = error;
  }
  
  return response;
};

// Pagination helper
exports.getPaginationData = (page = 1, limit = 20) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;
  
  return {
    page: pageNum,
    limit: limitNum,
    offset
  };
};

// Generate pagination metadata
exports.generatePaginationMeta = (page, limit, totalItems) => {
  const totalPages = Math.ceil(totalItems / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return {
    currentPage: page,
    totalPages,
    totalItems,
    itemsPerPage: limit,
    hasNext,
    hasPrev
  };
};

// Validate image file
exports.validateImageFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(file.mimetype)) {
    return {
      isValid: false,
      error: 'Invalid file type. Only JPEG, PNG, and GIF are allowed.'
    };
  }
  
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size too large. Maximum 5MB allowed.'
    };
  }
  
  return { isValid: true };
};

// Clean up old files
exports.cleanupOldFiles = async (directory, maxAge = 30 * 24 * 60 * 60 * 1000) => {
  try {
    const files = await fs.promises.readdir(directory);
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = await fs.promises.stat(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        await fs.promises.unlink(filePath);
        console.log(`Deleted old file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old files:', error);
  }
};

// Format date for database
exports.formatDateForDB = (date) => {
  if (!date) return null;
  return new Date(date).toISOString();
};

// Generate thumbnail path
exports.generateThumbnailPath = (originalPath) => {
  const ext = path.extname(originalPath);
  const basename = path.basename(originalPath, ext);
  const dirname = path.dirname(originalPath);
  
  return path.join(dirname, `${basename}_thumb${ext}`);
};

// Check if point is within Shiojiri area
exports.isWithinShiojiriArea = (latitude, longitude) => {
  const shiojiriLat = 36.1127;
  const shiojiriLon = 137.9545;
  const maxDistance = 50; // 50km radius
  
  const distance = exports.calculateDistance(latitude, longitude, shiojiriLat, shiojiriLon);
  return distance <= maxDistance;
};

// Generate notification message
exports.generateNotificationMessage = (type, data = {}) => {
  const messages = {
    rainbow_alert: {
      title: '🌈 Rainbow Alert!',
      body: data.message || 'A rainbow has been spotted near you!'
    },
    prediction: {
      title: '🌈 Rainbow Prediction',
      body: data.message || 'High chance of rainbow in your area!'
    },
    welcome: {
      title: 'Welcome to Rainbow Seeker!',
      body: 'Thank you for joining the Shiojiri Rainbow community!'
    }
  };
  
  return messages[type] || messages.rainbow_alert;
};

// Sanitize filename
exports.sanitizeFilename = (filename) => {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
};

// Generate unique filename
exports.generateUniqueFilename = (originalName) => {
  const ext = path.extname(originalName);
  const basename = path.basename(originalName, ext);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  return `${exports.sanitizeFilename(basename)}_${timestamp}_${random}${ext}`;
};

// Validate coordinates
exports.validateCoordinates = (latitude, longitude) => {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  
  if (isNaN(lat) || isNaN(lon)) {
    return { isValid: false, error: 'Invalid coordinates format' };
  }
  
  if (lat < -90 || lat > 90) {
    return { isValid: false, error: 'Latitude must be between -90 and 90' };
  }
  
  if (lon < -180 || lon > 180) {
    return { isValid: false, error: 'Longitude must be between -180 and 180' };
  }
  
  return { isValid: true };
};

// Rate limiting helper
exports.createRateLimitMessage = (windowMs, max) => {
  const minutes = Math.floor(windowMs / 60000);
  return `Too many requests. Maximum ${max} requests per ${minutes} minutes allowed.`;
};