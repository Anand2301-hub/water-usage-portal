const User = require('../models/User'), W = require('../models/WaterUsage'), G = require('../models/ConservationGoal');
exports.dashboard = async (req, res, next) => {
  try {
    const [users, records, tot, byCategory, monthly] = await Promise.all([User.countDocuments(), W.countDocuments(),
      W.aggregate([{ $group: { _id: null, t: { $sum: '$quantityLitres' } } }]),
      W.aggregate([{ $group: { _id: '$category', total: { $sum: '$quantityLitres' } } }, { $sort: { total: -1 } }]),
      W.aggregate([{ $group: { _id: { $dateToString: { format: '%Y-%m', date: '$usageDate' } }, total: { $sum: '$quantityLitres' } } }, { $sort: { _id: -1 } }, { $limit: 6 }, { $sort: { _id: 1 } }])]);
    res.json({ success: true, data: { users, records, totalLitres: tot[0]?.t || 0, byCategory, monthly } });
  } catch (e) { next(e); }
};
exports.users = async (req, res, next) => {
  try { res.json({ success: true, data: await User.find().sort({ createdAt: -1 }) }); } catch (e) { next(e); }
};
exports.deleteUser = async (req, res, next) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ success: false, message: 'User not found' });
    if (u.role === 'admin') return res.status(400).json({ success: false, message: 'Administrator accounts cannot be deleted here' });
    await Promise.all([W.deleteMany({ userId: u._id }), G.deleteMany({ userId: u._id }), u.deleteOne()]);
    res.json({ success: true, message: 'User and their records deleted' });
  } catch (e) { next(e); }
};
exports.usage = async (req, res, next) => {
  try { res.json({ success: true, data: await W.find().sort({ usageDate: -1, createdAt: -1 }).limit(15).populate('userId', 'name email') }); } catch (e) { next(e); }
};
