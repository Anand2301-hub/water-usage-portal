const m = require('mongoose');
const CATEGORIES = ['drinking', 'bathing', 'washing', 'cooking', 'gardening', 'other'];
const s = new m.Schema({
  userId: { type: m.Schema.Types.ObjectId, ref: 'User', required: true },
  usageDate: { type: Date, required: [true, 'Usage date is required'] },
  category: { type: String, required: true, enum: CATEGORIES },
  quantityLitres: { type: Number, required: true, min: [0.1, 'Quantity must be greater than 0'], max: 100000 },
  notes: { type: String, trim: true, maxlength: 300, default: '' }
}, { timestamps: true });
s.index({ userId: 1, usageDate: -1 });
s.index({ userId: 1, category: 1 });
module.exports = m.model('WaterUsage', s);
module.exports.CATEGORIES = CATEGORIES;
