const r = require('express').Router();
const { body, query } = require('express-validator');
const c = require('../controllers/usageController');
const { CATEGORIES } = require('../models/WaterUsage');
const { protect } = require('../middleware/authMiddleware');
const { validate, idRule } = require('../middleware/validateRequest');
const rules = [
  body('usageDate').isISO8601().withMessage('Enter a valid date').bail().custom((v) => new Date(v) <= new Date()).withMessage('Date cannot be in the future'),
  body('category').isIn(CATEGORIES).withMessage('Category must be one of: ' + CATEGORIES.join(', ')),
  body('quantityLitres').isFloat({ min: 0.1, max: 100000 }).withMessage('Quantity must be between 0.1 and 100000 litres'),
  body('notes').optional().trim().isLength({ max: 300 }).withMessage('Notes must be at most 300 characters')
];
const q = [
  query('category').optional({ checkFalsy: true }).isIn(CATEGORIES).withMessage('Invalid category'),
  query('from').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid from date'),
  query('to').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid to date')
];
r.use(protect);
r.get('/export', q, validate, c.exportCsv);
r.get('/', q, validate, c.list);
r.post('/', rules, validate, c.create);
r.get('/:id', idRule, validate, c.get);
r.put('/:id', idRule, rules, validate, c.update);
r.delete('/:id', idRule, validate, c.remove);
module.exports = r;
