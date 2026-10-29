const m = require('mongoose');
const s = new m.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true, minlength: [2, 'Name must be at least 2 characters'], maxlength: [60, 'Name is too long'] },
  email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true, maxlength: 100, match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email'] },
  passwordHash: { type: String, required: true, select: false },
  address: { type: String, trim: true, maxlength: 200, default: '' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, { timestamps: true });
s.set('toJSON', { transform: (d, r) => { delete r.passwordHash; delete r.__v; return r; } });
module.exports = m.model('User', s);
