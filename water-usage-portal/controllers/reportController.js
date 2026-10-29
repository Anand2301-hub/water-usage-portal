const W = require('../models/WaterUsage'), G = require('../models/ConservationGoal');
const getGoal = async (uid) => (await G.findOne({ userId: uid })) || { targetDailyLitres: 135, targetMonthlyLitres: 4050 };
const utcToday = () => { const n = new Date(); return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()); };
exports.summary = async (req, res, next) => {
  try {
    const uid = req.user._id, n = new Date(), sod = utcToday();
    const sum = async (from) => (await W.aggregate([{ $match: { userId: uid, ...(from && { usageDate: { $gte: new Date(from) } }) } }, { $group: { _id: null, t: { $sum: '$quantityLitres' } } }]))[0]?.t || 0;
    const [total, today, week, month, goal] = await Promise.all([sum(), sum(sod), sum(sod - 6 * 864e5), sum(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1)), getGoal(uid)]);
    const saved = Math.max(0, n.getUTCDate() * goal.targetDailyLitres - month);
    res.json({ success: true, data: { total, today, week, month, saved, goal: { targetDailyLitres: goal.targetDailyLitres, targetMonthlyLitres: goal.targetMonthlyLitres } } });
  } catch (e) { next(e); }
};
exports.trends = async (req, res, next) => {
  try {
    const days = Math.min(+req.query.days || 30, 365), from = sod => new Date(sod - (days - 1) * 864e5);
    const start = from(utcToday());
    const rows = await W.aggregate([{ $match: { userId: req.user._id, usageDate: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$usageDate' } }, total: { $sum: '$quantityLitres' } } }]);
    const map = Object.fromEntries(rows.map((r) => [r._id, r.total]));
    const data = Array.from({ length: days }, (_, i) => { const k = new Date(start.getTime() + i * 864e5).toISOString().slice(0, 10); return { _id: k, total: map[k] || 0 }; });
    res.json({ success: true, data });
  } catch (e) { next(e); }
};
exports.insights = async (req, res, next) => {
  try {
    const n = new Date(), sod = utcToday(), N = 31, start = new Date(sod - (N - 1) * 864e5), goal = await getGoal(req.user._id);
    const rows = await W.aggregate([{ $match: { userId: req.user._id, usageDate: { $gte: start } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$usageDate' } }, total: { $sum: '$quantityLitres' } } }]);
    const map = Object.fromEntries(rows.map((r) => [r._id, r.total]));
    const days = Array.from({ length: N }, (_, i) => { const d = new Date(start.getTime() + i * 864e5).toISOString().slice(0, 10); return { d, t: map[d] || 0 }; });
    const mean = days.reduce((a, x) => a + x.t, 0) / N, sd = Math.sqrt(days.reduce((a, x) => a + (x.t - mean) ** 2, 0) / N);
    const ms = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1)).toISOString().slice(0, 10);
    const monthSoFar = days.filter((x) => x.d >= ms).reduce((a, x) => a + x.t, 0), dim = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 0)).getUTCDate();
    const forecast = Math.round(monthSoFar / n.getUTCDate() * dim);
    const alerts = sd > 0 ? days.slice(-7).filter((x) => x.t > mean + 2 * sd && x.t > goal.targetDailyLitres).map((x) => ({ date: x.d, litres: Math.round(x.t), message: `Unusually high use (${Math.round(x.t)} L vs your ${Math.round(mean)} L average). Check for leaks or a long task.` })) : [];
    let streak = 0, i = N - 1; if (days[i].t === 0) i--;
    for (; i >= 0 && days[i].t > 0 && days[i].t <= goal.targetDailyLitres; i--) streak++;
    res.json({ success: true, data: { forecast, monthlyTarget: goal.targetMonthlyLitres, willExceed: forecast > goal.targetMonthlyLitres, average: Math.round(mean), alerts, streak } });
  } catch (e) { next(e); }
};
exports.categories = async (req, res, next) => {
  try {
    res.json({ success: true, data: await W.aggregate([{ $match: { userId: req.user._id } }, { $group: { _id: '$category', total: { $sum: '$quantityLitres' } } }, { $sort: { total: -1 } }]) });
  } catch (e) { next(e); }
};
exports.getGoal = async (req, res, next) => { try { res.json({ success: true, data: await getGoal(req.user._id) }); } catch (e) { next(e); } };
exports.setGoal = async (req, res, next) => {
  try {
    const { targetDailyLitres, targetMonthlyLitres } = req.body;
    res.json({ success: true, data: await G.findOneAndUpdate({ userId: req.user._id }, { targetDailyLitres, targetMonthlyLitres }, { new: true, upsert: true, runValidators: true }) });
  } catch (e) { next(e); }
};
