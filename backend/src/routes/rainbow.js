const express = require('express');
const router = express.Router();
const rainbowController = require('../controllers/rainbowController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

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
router.post('/', auth, upload.single('image'), rainbowController.createRainbow);

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
router.get('/nearby/:latitude/:longitude', rainbowController.getNearbyRainbows);

module.exports = router;