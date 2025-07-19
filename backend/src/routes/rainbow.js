const express = require('express');
const router = express.Router();
const rainbowController = require('../controllers/rainbowController');
const auth = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { body, param } = require('express-validator');

// @route   GET /api/rainbow
// @desc    Get all rainbow sightings
// @access  Public
router.get('/', rainbowController.getAllRainbows);

// @route   GET /api/rainbow/:id
// @desc    Get specific rainbow sighting
// @access  Public
router.get('/:id', rainbowController.getRainbowById);

// @route   POST /api/rainbow
// @desc    Create new rainbow sighting
// @access  Private
router.post('/', auth, upload.single('image'), [
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  body('description').optional().isLength({ min: 1, max: 500 }).withMessage('Description must be between 1 and 500 characters')
], rainbowController.createRainbow);

// @route   PUT /api/rainbow/:id
// @desc    Update rainbow sighting
// @access  Private
router.put('/:id', auth, rainbowController.updateRainbow);

// @route   DELETE /api/rainbow/:id
// @desc    Delete rainbow sighting
// @access  Private
router.delete('/:id', auth, rainbowController.deleteRainbow);

// @route   GET /api/rainbow/nearby/:latitude/:longitude
// @desc    Get nearby rainbow sightings
// @access  Public
router.get('/nearby/:latitude/:longitude', [
  param('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  param('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180')
], rainbowController.getNearbyRainbows);

module.exports = router;