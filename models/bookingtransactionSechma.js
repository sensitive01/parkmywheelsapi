const mongoose = require('mongoose');

const bookingTransactionSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  vendorId: {
    type: String,
    required: true
  },
  vendorName: {
    type: String
  },
  userId: {
    type: String
  },
  vehicleNumber: {
    type: String
  },
  vehicleType: {
    type: String
  },
  personName: {
    type: String
  },
  mobileNumber: {
    type: String
  },
  // Transaction details
  bookingAmount: {
    type: String, // Base booking amount
  },
  gstAmount: {
    type: String,
  },
  handlingFee: {
    type: String,
  },
  totalAmount: {
    type: String,
  },
  platformFee: {
    type: String, // Release fee
  },
  receivableAmount: {
    type: String,
  },
  payableAmount: {
    type: String,
  },
  // Charges details
  charges: {
    type: mongoose.Schema.Types.Mixed,
  },
  vendorCharges: {
    type: mongoose.Schema.Types.Mixed,
  },
  allCharges: [{
    type: { type: String },
    amount: { type: String },
    category: { type: String },
    chargeid: { type: String },
    _id: { type: String }
  }],
  // Booking details
  bookingDate: {
    type: String, // DD-MM-YYYY format
  },
  parkingDate: {
    type: String, // DD-MM-YYYY format
  },
  exitDate: {
    type: String, // DD-MM-YYYY format
  },
  bookingTime: {
    type: String
  },
  parkingTime: {
    type: String
  },
  exitTime: {
    type: String
  },
  // Booking type
  bookingType: {
    type: String, // subscription, instant, scheduled, etc.
  },
  subscriptionType: {
    type: String
  },
  subscriptionEndDate: {
    type: String
  },
  // Transaction date for filtering
  transactionDate: {
    type: Date,
    default: Date.now
  },
  transactionDateString: {
    type: String, // DD-MM-YYYY format for easy querying
  },
  status: {
    type: String,
    default: 'active'
  },
  invoiceId: {
    type: String
  },
  // Completion details
  completedAt: {
    type: Date
  }
}, { timestamps: true });

// Indexes for efficient queries
bookingTransactionSchema.index({ transactionDateString: 1, vendorId: 1 });
bookingTransactionSchema.index({ bookingId: 1 });
bookingTransactionSchema.index({ vendorId: 1, status: 1 });

const BookingTransaction = mongoose.model('BookingTransaction', bookingTransactionSchema);
module.exports = BookingTransaction;