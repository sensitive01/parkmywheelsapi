const mongoose = require('mongoose');

// Define the Payment Schema
const paymentSchema = new mongoose.Schema({
  paymentId: { type: String, },
  vendorname: { type: String, },
  orderId: { type: String, },
  signature: { type: String,  },
  vendorId: { type: String,  },
  userid: { type: String,  },
  planId: { type: String,  },
  transactionName: { type: String,  },
  paymentStatus: { type: String, },
  amount: { type: String,  },
  createdAt: { type: Date, default: Date.now },
});

// Create the model and specify the collection name 'transactions'
const transaction = mongoose.model('transactions', paymentSchema,);
module.exports = transaction;