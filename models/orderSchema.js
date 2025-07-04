const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: String,
  amount: Number,
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['created', 'paid', 'failed'],
    default: 'created'
  },
  paymentId: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Ordersss', orderSchema);
