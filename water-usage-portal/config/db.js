require('dotenv').config();
const mongoose = require('mongoose');
module.exports = async () => {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    console.error('Set MONGODB_URI and a JWT_SECRET (16+ chars) in .env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('MongoDB connected: ' + mongoose.connection.name);
};
