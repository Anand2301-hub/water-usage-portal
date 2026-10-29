const r = require('express').Router();
const { body } = require('express-validator');
const c = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateRequest');
const pw = (f) => body(f).isLength({ min: 8, max: 64 }).withMessage('Password must be 8-64 characters')
  .matches(/[A-Za-z]/).withMessage('Password needs a letter').matches(/\d/).withMessage('Password needs a number');
const email = body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email').isLength({ max: 100 });
const name = body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters');
const addr = body('address').optional().trim().isLength({ max: 200 }).withMessage('Address is too long');
r.post('/register', [name, email, pw('password'), addr,
  body('confirmPassword').custom((v, { req }) => v === req.body.password).withMessage('Passwords do not match')], validate, c.register);
r.post('/login', [email, body('password').notEmpty().withMessage('Password is required')], validate, c.login);
r.post('/logout', c.logout);
r.get('/me', protect, c.me);
r.put('/profile', protect, [name, addr], validate, c.updateProfile);
r.put('/password', protect, [body('currentPassword').notEmpty().withMessage('Current password is required'), pw('newPassword')], validate, c.changePassword);
module.exports = r;
