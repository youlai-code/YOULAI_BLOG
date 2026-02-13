const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');
const portfolioService = require('../services/portfolio.service');

router.get('/', asyncHandler(async (req, res) => {
    const items = await portfolioService.getPortfolio();
    res.json({ success: true, items });
}));

router.post('/', requireAdmin, asyncHandler(async (req, res) => {
    const items = await portfolioService.savePortfolio(req.body?.items);
    res.json({ success: true, items });
}));

module.exports = router;
