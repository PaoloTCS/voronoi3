const express = require('express');
const router = express.Router();
const externalQueryController = require('../controllers/externalQueryController');

// Route for fetching external papers (e.g., from arXiv)
// GET /api/external/papers?keywords=ai,ml&startDate=20240101&maxResults=5
router.get('/papers', externalQueryController.getArxivPapers);

module.exports = router; 