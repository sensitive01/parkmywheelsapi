const mongoose = require("mongoose");

const parkingBookingSchema = new mongoose.Schema({
  place: {
    type: String,
    required: true,
  },
  vehicleNumber: {
    type: String,
    required: true,
  },
  bookingDate: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },

  status: {
    type: String,
    default: "booked",
  },
  userId: {
    type: String,
    required: true,
  },
 
  vendorId:{
    type:String
  }
});

const ParkingBooking = mongoose.model("ParkingBooking", parkingBookingSchema);

module.exports = ParkingBooking;
