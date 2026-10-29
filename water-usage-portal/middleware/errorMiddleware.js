exports.notFound = (req, res, next) =>
  req.originalUrl.startsWith('/api') ? res.status(404).json({ success: false, message: 'Route not found' }) : next();
exports.errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500, message = err.message || 'Server error';
  if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors)[0].message; }
  if (err.name === 'CastError') { status = 400; message = 'Invalid value for ' + err.path; }
  if (err.code === 11000) { status = 409; message = 'Email already registered'; }
  if (err.type === 'entity.parse.failed') { status = 400; message = 'Invalid JSON body'; }
  if (status === 500) { console.error(err); message = 'Internal server error'; }
  res.status(status).json({ success: false, message });
};
