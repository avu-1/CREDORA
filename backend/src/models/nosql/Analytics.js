const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['transaction', 'login', 'api_call', 'error'],
    required: true
  },
  date: { type: Date, required: true },
  metrics: {
    count: Number,
    successCount: Number,
    failureCount: Number,
    totalAmount: Number
  }
}, { timestamps: true });

module.exports = mongoose.model('Analytics', analyticsSchema);