require('dotenv').config();
const bcrypt = require('bcrypt'), mongoose = require('mongoose');
const User = require('../models/User'), W = require('../models/WaterUsage');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const mk = async (name, email, pw, role) => User.findOneAndUpdate({ email }, { name, email, role, passwordHash: await bcrypt.hash(pw, 12) }, { new: true, upsert: true });
  await mk('Administrator', (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase(), process.env.ADMIN_PASSWORD || 'Admin@12345', 'admin');
  const demo = await mk('Demo User', 'demo@example.com', 'Demo@1234', 'user');
  await W.deleteMany({ userId: demo._id });
  const cats = { drinking: [2, 4], bathing: [30, 70], washing: [20, 50], cooking: [5, 15], gardening: [10, 40], other: [3, 10] }, docs = [];
  for (let d = 0; d < 60; d++) for (const c of Object.keys(cats)) if (Math.random() < 0.6) {
    const [a, b] = cats[c], t = new Date(); t.setUTCHours(0, 0, 0, 0); t.setUTCDate(t.getUTCDate() - d);
    docs.push({ userId: demo._id, usageDate: t, category: c, quantityLitres: +(a + Math.random() * (b - a)).toFixed(1), notes: '' });
  }
  await W.insertMany(docs);
  console.log('Seeded admin + demo user (demo@example.com / Demo@1234) with ' + docs.length + ' records');
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
