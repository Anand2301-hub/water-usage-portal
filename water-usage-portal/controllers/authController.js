const bcrypt = require('bcrypt'), jwt = require('jsonwebtoken');
const User = require('../models/User');
const sign = (res, u) => {
  const t = jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  res.cookie('token', t, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 864e5 });
};
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, address } = req.body; // role is never read from the client
    if (await User.findOne({ email })) return res.status(409).json({ success: false, message: 'Email already registered' });
    const u = await User.create({ name, email, address, passwordHash: await bcrypt.hash(password, 12) });
    sign(res, u);
    res.status(201).json({ success: true, user: u });
  } catch (e) { next(e); }
};
exports.login = async (req, res, next) => {
  try {
    const u = await User.findOne({ email: req.body.email }).select('+passwordHash');
    if (!u || !(await bcrypt.compare(req.body.password, u.passwordHash)))
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    sign(res, u);
    res.json({ success: true, user: u });
  } catch (e) { next(e); }
};
exports.logout = (req, res) => { res.clearCookie('token'); res.json({ success: true, message: 'Logged out' }); };
exports.me = (req, res) => res.json({ success: true, user: req.user });
exports.updateProfile = async (req, res, next) => {
  try {
    req.user.name = req.body.name;
    req.user.address = req.body.address || '';
    await req.user.save();
    res.json({ success: true, user: req.user });
  } catch (e) { next(e); }
};
exports.changePassword = async (req, res, next) => {
  try {
    const u = await User.findById(req.user._id).select('+passwordHash');
    if (!(await bcrypt.compare(req.body.currentPassword, u.passwordHash)))
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    u.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    await u.save();
    res.json({ success: true, message: 'Password updated' });
  } catch (e) { next(e); }
};
