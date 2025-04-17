const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  userId: {
    type: String, // 👈 changed from ObjectId to String
  
  },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  title: String,
  message: String,
  vehicleType: String,
  vehicleNumber: String,
  createdAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
});

module.exports = mongoose.model('Notification', notificationSchema);
