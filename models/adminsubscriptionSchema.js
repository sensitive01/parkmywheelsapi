const mongoose = require('mongoose');

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
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
  
  },
  paymentDetails: {
    cardNumber: String,
    cardHolderName: String,
    expiry: String,
    cvv: String
  }
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);
 