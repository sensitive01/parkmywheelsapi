const mongoose = require('mongoose');

// Define the Payment Schema
const paymentSchema = new mongoose.Schema({
  paymentId: { type: String, required: true },
  orderId: { type: String, required: true },
  signature: { type: String, required: true },
  vendorId: { type: String, required: true },
  planId: { type: String, required: true },
  transactionName: { type: String, required: true },
  paymentStatus: { type: String, required: true },
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Create the model and specify the collection name 'transactions'
const transaction = mongoose.model('transactions', paymentSchema,);
module.exports = transaction;