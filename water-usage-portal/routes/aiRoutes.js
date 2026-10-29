const r = require('express').Router();
const { body } = require('express-validator');
const c = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateRequest');
r.use(protect);
r.post('/parse', body('text').isString().trim().isLength({ min: 3, max: 200 }).withMessage('Describe your usage in 3-200 characters'), validate, c.parse);
r.post('/coach', body('question').isString().trim().isLength({ min: 3, max: 300 }).withMessage('Question must be 3-300 characters'), validate, c.coach);
module.exports = r;
