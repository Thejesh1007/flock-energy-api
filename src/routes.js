const express = require('express');
const urjaClient = require('./urjaClient');

const router = express.Router();

// GET /api/v1/meters?q=&page=  — list/search meters
router.get('/meters', async (req, res, next) => {
  try {
    const { q = '', page = 1 } = req.query;
    const result = await urjaClient.searchMeters(q, Number(page));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/meters/:id  — single meter details
router.get('/meters/:id', async (req, res, next) => {
  try {
    const meter = await urjaClient.getMeter(req.params.id);
    res.json(meter);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/meters/:id/consumption  — consumption history
router.get('/meters/:id/consumption', async (req, res, next) => {
  try {
    const readings = await urjaClient.getMeterConsumption(req.params.id);
    res.json({ meterId: req.params.id, readings });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/transformers?page=  — distribution transformer list
router.get('/transformers', async (req, res, next) => {
  try {
    const { page = 1 } = req.query;
    const result = await urjaClient.listTransformers(Number(page));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;