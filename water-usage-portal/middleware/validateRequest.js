const { validationResult, param } = require('express-validator');
exports.validate = (req, res, next) => {
  const r = validationResult(req);
  if (r.isEmpty()) return next();
  const errors = r.array().map((e) => ({ field: e.path, message: e.msg }));
  res.status(400).json({ success: false, message: errors[0].message, errors });
};
exports.idRule = param('id').isMongoId().withMessage('Invalid ID format');
