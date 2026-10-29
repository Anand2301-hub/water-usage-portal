const W = require('../models/WaterUsage');
const pick = (b) => ({ usageDate: b.usageDate, category: b.category, quantityLitres: b.quantityLitres, notes: b.notes });
const filter = (req) => {
  const f = { userId: req.user._id }, { category, from, to, q } = req.query;
  if (category) f.category = category;
  if (from || to) { f.usageDate = {}; if (from) f.usageDate.$gte = new Date(from); if (to) f.usageDate.$lte = new Date(to); }
  if (q) f.notes = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return f;
};
const sortOf = (req) => ({ [['usageDate', 'quantityLitres'].includes(req.query.sort) ? req.query.sort : 'usageDate']: req.query.order === 'asc' ? 1 : -1 });
exports.list = async (req, res, next) => {
  try {
    const page = Math.max(+req.query.page || 1, 1), limit = Math.min(+req.query.limit || 10, 50), f = filter(req);
    const [data, total] = await Promise.all([W.find(f).sort(sortOf(req)).skip((page - 1) * limit).limit(limit), W.countDocuments(f)]);
    res.json({ success: true, data, total, page, pages: Math.ceil(total / limit) });
  } catch (e) { next(e); }
};
exports.create = async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await W.create({ userId: req.user._id, ...pick(req.body) }) }); } catch (e) { next(e); }
};
exports.get = async (req, res, next) => {
  try {
    const d = await W.findOne({ _id: req.params.id, userId: req.user._id });
    d ? res.json({ success: true, data: d }) : res.status(404).json({ success: false, message: 'Record not found' });
  } catch (e) { next(e); }
};
exports.update = async (req, res, next) => {
  try {
    const d = await W.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, pick(req.body), { new: true, runValidators: true });
    d ? res.json({ success: true, data: d }) : res.status(404).json({ success: false, message: 'Record not found' });
  } catch (e) { next(e); }
};
exports.remove = async (req, res, next) => {
  try {
    const d = await W.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    d ? res.json({ success: true, message: 'Record deleted' }) : res.status(404).json({ success: false, message: 'Record not found' });
  } catch (e) { next(e); }
};
exports.exportCsv = async (req, res, next) => {
  try {
    const rows = await W.find(filter(req)).sort(sortOf(req));
    const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const csv = ['Date,Category,Litres,Notes', ...rows.map((r) => [r.usageDate.toISOString().slice(0, 10), r.category, r.quantityLitres, q(r.notes)].join(','))].join('\n');
    res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="water-usage.csv"' }).send(csv);
  } catch (e) { next(e); }
};
