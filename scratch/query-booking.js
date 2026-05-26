const mongoose = require('mongoose');
const dbConnect = require('../config/dbConnect');
const Booking = require('../models/bookingSchema');

async function main() {
  try {
    await dbConnect();
    console.log("Connected to db");
    const bookings = await Booking.find({ bookingDate: '26-05-2026' }).sort({ createdAt: -1 });
    console.log("Bookings for 26-05-2026:");
    for (const b of bookings) {
      console.log({
        _id: b._id,
        invoice: b.invoice,
        invoiceid: b.invoiceid,
        vehicleNumber: b.vehicleNumber,
        bookingDate: b.bookingDate,
        bookingTime: b.bookingTime,
        parkingDate: b.parkingDate,
        parkingTime: b.parkingTime,
        parkedDate: b.parkedDate,
        parkedTime: b.parkedTime,
        exitvehicledate: b.exitvehicledate,
        exitvehicletime: b.exitvehicletime,
        status: b.status,
        sts: b.sts,
        bookType: b.bookType
      });
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    mongoose.connection.close();
  }
}
main();
