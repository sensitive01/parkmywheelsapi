
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  vendorId: { type: String },        // Converted to String
  userId: { type: String },          // Already String
  bookingId: { type: String },       // Converted to String

  title: { type: String },
  message: { type: String },
  vehicleType: { type: String },
  vehicleNumber: { type: String },
  
createdAt: {
  type: Date,
  default: () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })),
},

  read: { type: Boolean, default: false },
notificationdtime: { type: String }, // Added notificationType field
  // Additional fields you mentioned
  sts: { type: String },
  bookingtype: { type: String },
  otp: { type: String },
  vendorname: { type: String },
  parkingDate: { type: String },
  parkingTime: { type: String },
  bookingdate: { type: String },
  schedule: { type: String },
  status: { type: String },
});

module.exports = mongoose.model('Notification', notificationSchema);
