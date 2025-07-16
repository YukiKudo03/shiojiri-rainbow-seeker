const Rainbow = require('../models/Rainbow');
const { validationResult } = require('express-validator');

// Get all rainbow sightings
exports.getAllRainbows = async (req, res, next) => {
  try {
    const rainbows = await Rainbow.findAll();
    res.json({
      success: true,
      data: rainbows
    });
  } catch (error) {
    next(error);
  }
};

// Get specific rainbow sighting
exports.getRainbowById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rainbow = await Rainbow.findById(id);
    
    if (!rainbow) {
      return res.status(404).json({
        success: false,
        error: { message: 'Rainbow sighting not found' }
      });
    }
    
    res.json({
      success: true,
      data: rainbow
    });
  } catch (error) {
    next(error);
  }
};

// Create new rainbow sighting
exports.createRainbow = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Validation failed', details: errors.array() }
      });
    }

    const { latitude, longitude, description } = req.body;
    const userId = req.user.id;
    const imageUrl = req.file ? req.file.path : null;

    const rainbow = await Rainbow.create({
      userId,
      latitude,
      longitude,
      description,
      imageUrl,
      timestamp: new Date()
    });

    // TODO: Trigger weather data collection
    // TODO: Send push notifications to nearby users

    res.status(201).json({
      success: true,
      data: rainbow
    });
  } catch (error) {
    next(error);
  }
};

// Update rainbow sighting
exports.updateRainbow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user.id;

    const rainbow = await Rainbow.findById(id);
    
    if (!rainbow) {
      return res.status(404).json({
        success: false,
        error: { message: 'Rainbow sighting not found' }
      });
    }

    // Check if user owns this rainbow sighting
    if (rainbow.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Not authorized to update this rainbow sighting' }
      });
    }

    const updatedRainbow = await Rainbow.update(id, updates);
    
    res.json({
      success: true,
      data: updatedRainbow
    });
  } catch (error) {
    next(error);
  }
};

// Delete rainbow sighting
exports.deleteRainbow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const rainbow = await Rainbow.findById(id);
    
    if (!rainbow) {
      return res.status(404).json({
        success: false,
        error: { message: 'Rainbow sighting not found' }
      });
    }

    // Check if user owns this rainbow sighting
    if (rainbow.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Not authorized to delete this rainbow sighting' }
      });
    }

    await Rainbow.delete(id);
    
    res.json({
      success: true,
      message: 'Rainbow sighting deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get nearby rainbow sightings
exports.getNearbyRainbows = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.params;
    const radius = req.query.radius || 10; // Default 10km radius

    const nearbyRainbows = await Rainbow.findNearby(latitude, longitude, radius);
    
    res.json({
      success: true,
      data: nearbyRainbows
    });
  } catch (error) {
    next(error);
  }
};