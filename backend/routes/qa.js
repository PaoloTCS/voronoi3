const express = require('express');
const router = express.Router();
const qaController = require('../controllers/qaController');

// POST /api/ask - Ask question about documents
router.post('/', qaController.askQuestion);

module.exports = router;