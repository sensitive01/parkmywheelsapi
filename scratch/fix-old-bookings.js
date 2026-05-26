const mongoose = require('mongoose');
const dbConnect = require('../config/dbConnect');
const Booking = require('../models/bookingSchema');

async function main() {
  try {
    await dbConnect();
    console.log("Connected to db");
    
    // Fix PMW26052026002 (vehicle 2-6666-)
    const result2 = await Booking.updateOne(
      { vehicleNumber: '2-6666-', bookingDate: '26-05-2026', parkedTime: '04:18 AM' },
      { $set: { parkedTime: '09:48 AM', parkingTime: '09:48 AM', hour: '00:01:00' } }
    );
    console.log("Updated 2-6666-:", result2);

    // Fix PMW26052026001 (vehicle 2-555-)
    const result1 = await Booking.updateOne(
      { vehicleNumber: '2-555-', bookingDate: '26-05-2026', parkedTime: '04:16 AM' },
      { $set: { parkedTime: '09:46 AM', parkingTime: '09:46 AM', hour: '00:01:15' } }
    );
    console.log("Updated 2-555-:", result1);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    mongoose.connection.close();
  }
}
main();
