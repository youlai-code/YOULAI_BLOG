const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');
const columnsService = require('../services/columns.service');

router.get('/', asyncHandler(async (req, res) => {
    const columns = await columnsService.getColumns();
    res.json({ success: true, columns });
}));

router.post('/', requireAdmin, asyncHandler(async (req, res) => {
    const columns = await columnsService.saveColumns(req.body?.columns);
    res.json({ success: true, columns });
}));

module.exports = router;
