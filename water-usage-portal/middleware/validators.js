const { body, query } = require('express-validator');
const WaterUsage = require('../models/WaterUsage');

const CATEGORIES = WaterUsage.CATEGORIES;
const DAY_MS = 24 * 60 * 60 * 1000;

const passwordRule = (field = 'password') =>
  body(field)
    .isString().withMessage('Password is required').bail()
    .isLength({ min: 8, max: 64 }).withMessage('Password must be 8 to 64 characters').bail()
    .matches(/[a-z]/).withMessage('Password needs a lowercase letter').bail()
    .matches(/[A-Z]/).withMessage('Password needs an uppercase letter').bail()
    .matches(/\d/).withMessage('Password needs a number');

const emailRule = () =>
  body('email')
    .isString().withMessage('Email is required').bail()
    .trim().toLowerCase()
    .isEmail().withMessage('Enter a valid email address').bail()
    .isLength({ max: 100 }).withMessage('Email must be at most 100 characters');

const nameRule = () =>
  body('name')
    .isString().withMessage('Name is required').bail()
    .trim()
    .isLength({ min: 2, max: 60 }).withMessage('Name must be 2 to 60 characters');

const addressRule = () =>
  body('address').optional({ values: 'falsy' }).isString().bail().trim()
    .isLength({ max: 200 }).withMessage('Address must be at most 200 characters');

const registerRules = [
  nameRule(),
  emailRule(),
  passwordRule('password'),
  body('confirmPassword').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match'),
  addressRule(),
];

const loginRules = [
  emailRule(),
  body('password').isString().withMessage('Password is required').bail().notEmpty().withMessage('Password is required'),
];

const profileRules = [nameRule(), addressRule()];

const passwordChangeRules = [
  body('currentPassword').isString().withMessage('Current password is required').bail().notEmpty().withMessage('Current password is required'),
  passwordRule('newPassword'),
  body('confirmPassword').custom((value, { req }) => value === req.body.newPassword).withMessage('Passwords do not match'),
];

const goalRules = [
  body('targetDailyLitres').isFloat({ min: 1, max: 100000 }).withMessage('Daily target must be between 1 and 100000 litres').toFloat(),
  body('targetMonthlyLitres').isFloat({ min: 1, max: 3000000 }).withMessage('Monthly target must be between 1 and 3000000 litres').toFloat(),
];

const usageRules = [
  body('usageDate')
    .isISO8601({ strict: true, strictSeparator: true }).withMessage('Enter a valid date (YYYY-MM-DD)').bail()
    .toDate()
    .custom((d) => d.getTime() <= Date.now() + DAY_MS).withMessage('Usage date cannot be in the future')
    .custom((d) => d.getUTCFullYear() >= 2000).withMessage('Usage date is too old'),
  body('category').isString().withMessage('Category is required').bail()
    .isIn(CATEGORIES).withMessage('Category must be one of: ' + CATEGORIES.join(', ')),
  body('quantityLitres')
    .isFloat({ gt: 0, max: 100000 }).withMessage('Quantity must be a number greater than 0 and at most 100000 litres')
    .toFloat(),
  body('notes').optional({ values: 'falsy' }).isString().withMessage('Notes must be text').bail().trim()
    .isLength({ max: 300 }).withMessage('Notes must be at most 300 characters'),
];

const listRules = [
  query('page').optional().isInt({ min: 1, max: 100000 }).withMessage('Invalid page number'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['usageDate', 'quantityLitres']).withMessage('Cannot sort by that field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  query('category').optional({ values: 'falsy' }).isIn(CATEGORIES).withMessage('Unknown category'),
  query('from').optional({ values: 'falsy' }).isISO8601({ strict: true }).withMessage('Invalid "from" date'),
  query('to').optional({ values: 'falsy' }).isISO8601({ strict: true }).withMessage('Invalid "to" date'),
  query('q').optional().isString().withMessage('Invalid search text').bail().isLength({ max: 50 }).withMessage('Search text is too long'),
];

const roleRules = [body('role').isIn(['user', 'admin']).withMessage('Role must be user or admin')];

module.exports = {
  registerRules, loginRules, profileRules, passwordChangeRules, goalRules, usageRules, listRules, roleRules,
};
