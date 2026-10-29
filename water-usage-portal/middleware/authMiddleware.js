const jwt = require('jsonwebtoken');
const User = require('../models/User');
exports.protect = async (req, res, next) => {
  try {
    const t = req.cookies.token;
    if (!t) return res.status(401).json({ success: false, message: 'Please log in' });
    let d;
    try { d = jwt.verify(t, process.env.JWT_SECRET); }
    catch { return res.status(401).json({ success: false, message: 'Session expired. Please log in again' }); }
    const u = await User.findById(d.id);
    if (!u) return res.status(401).json({ success: false, message: 'Account not found' });
    req.user = u;
    next();
  } catch (e) { next(e); }
};
exports.adminOnly = (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ success: false, message: 'Administrator access required' });
