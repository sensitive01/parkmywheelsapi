const cron = require('node-cron');  // Import node-cron
const mongoose = require('mongoose');
const Vendor = require('../models/venderSchema');
const dbConnect = require('./dbConnect');

dbConnect();

// Cron job definition
cron.schedule('0 0 * * *', async () => {  
  console.log(`[${new Date().toISOString()}] Running subscription decrement job...`);

  try {
    const vendors = await Vendor.find({ subscription: 'true', subscriptionleft: { $gt: 0 } });

    console.log(`Found ${vendors.length} vendors with active subscriptions.`);

    for (const vendor of vendors) {
      console.log(`[${new Date().toISOString()}] Processing vendor: ${vendor._id} | Subscription left: ${vendor.subscriptionleft}`);

      // Decrease subscription days
      vendor.subscriptionleft -= 1; 

      // If subscription left is 0, set subscription to false
      if (vendor.subscriptionleft === 0) {
        vendor.subscription = 'false';
        console.log(`[${new Date().toISOString()}] Vendor ${vendor._id} subscription expired. Subscription set to false.`);
      }

      // Save updated vendor
      await vendor.save();
      
      // Log the updated details for the vendor
      console.log(`[${new Date().toISOString()}] Vendor ${vendor._id} | Updated Days left: ${vendor.subscriptionleft} | Subscription: ${vendor.subscription}`);
    }

    console.log('All subscription days updated successfully.');
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error updating subscription days:`, error);
  }
});

console.log('Cron job scheduled.');  // To confirm that the job is scheduled
