const r = require('express').Router();
const { body } = require('express-validator');
const c = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateRequest');
r.use(protect);
r.get('/summary', c.summary);
r.get('/trends', c.trends);
r.get('/insights', c.insights);
r.get('/categories', c.categories);
r.get('/goal', c.getGoal);
r.put('/goal', [body('targetDailyLitres').isFloat({ min: 1, max: 100000 }).withMessage('Daily target must be 1-100000 litres'),
  body('targetMonthlyLitres').isFloat({ min: 1, max: 3000000 }).withMessage('Monthly target must be 1-3000000 litres')], validate, c.setGoal);
module.exports = r;
