const m = require('mongoose');
const s = new m.Schema({
  userId: { type: m.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  targetDailyLitres: { type: Number, required: true, min: 1, max: 100000, default: 135 },
  targetMonthlyLitres: { type: Number, required: true, min: 1, max: 3000000, default: 4050 }
}, { timestamps: true });
module.exports = m.model('ConservationGoal', s);
