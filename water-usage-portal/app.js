const express = require('express');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const { nodeEnv } = require('./config/env');
const User = require('./models/User');
const WaterUsage = require('./models/WaterUsage');
const authRoutes = require('./routes/authRoutes');
const usageRoutes = require('./routes/usageRoutes');
const reportRoutes = require('./routes/reportRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

if (nodeEnv === 'production') app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'script-src': ["'self'", 'https://cdn.jsdelivr.net'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://cdn.jsdelivr.net', 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:'],
        'upgrade-insecure-requests': null,
      },
    },
  })
);

if (nodeEnv !== 'test') app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize()); // strips $ and . operators from input (NoSQL injection)

app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => nodeEnv === 'test',
    message: { success: false, message: 'Too many requests. Please slow down.' },
  })
);

// Public, read-only statistics for the home page (real database counts)
app.get('/api/public/stats', async (req, res, next) => {
  try {
    const [users, records, sum] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      WaterUsage.countDocuments(),
      WaterUsage.aggregate([{ $group: { _id: null, litres: { $sum: '$quantityLitres' } } }]),
    ]);
    res.json({ success: true, data: { users, records, litres: sum.length ? Math.round(sum[0].litres) : 0 } });
  } catch (error) {
    next(error);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

app.use(express.static(path.join(__dirname, 'public')));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
