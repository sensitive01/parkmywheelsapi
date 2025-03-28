const mongoose = require('mongoose');

const PaymentDetailsSchema = new mongoose.Schema({
  cardNumber: { type: String },
  cardHolderName: { type: String },
  expiry: { type: String },
  cvv: { type: String }
}, { _id: false }); // Prevents automatic _id creation for subdocuments

const SubscriptionSchema = new mongoose.Schema({
  userId: {
    type: String,
    ref: 'User',
  },
  planId: {
    type: String,
  },
  planTitle: {
    type: String,
  },
  price: {
    type: Number,
  },
  autoRenew: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
  },
  paymentDetails: PaymentDetailsSchema
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);
