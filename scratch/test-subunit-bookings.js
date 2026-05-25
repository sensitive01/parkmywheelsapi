const mongoose = require('mongoose');
require('dotenv').config();
const dbConnect = require('../config/dbConnect');
const BookingTransaction = require('../models/bookingtransactionSechma');
const Booking = require('../models/bookingSchema');
const Vendor = require('../models/venderSchema');

async function test() {
  try {
    await dbConnect();
    console.log("Connected to database.");
    
    // Find all vendors with subunits
    const vendorsWithSubunits = await Vendor.find({ subUnits: { $exists: true, $not: { $size: 0 } } });
    console.log(`Found ${vendorsWithSubunits.length} vendors with subunits.`);
    for (const v of vendorsWithSubunits) {
      console.log(`Main Vendor: ${v.vendorName} (${v._id}), subunits: ${v.subUnits}`);
      for (const subId of v.subUnits) {
        const sub = await Vendor.findById(subId);
        console.log(`  Subunit: ${sub?.vendorName} (${subId})`);
        const bookingsCount = await Booking.countDocuments({ vendorId: subId });
        const transactionsCount = await BookingTransaction.countDocuments({ vendorId: subId });
        console.log(`    Bookings in Booking model: ${bookingsCount}`);
        console.log(`    Transactions in BookingTransaction model: ${transactionsCount}`);
        
        const sampleTx = await BookingTransaction.find({ vendorId: subId }).limit(2);
        console.log("    Sample Transactions:", sampleTx);
      }
    }
  } catch (err) {
    console.error("Error running test:", err);
  } finally {
    mongoose.connection.close();
  }
}

test();
