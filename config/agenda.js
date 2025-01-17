const Agenda = require("agenda");
const mongoose = require("mongoose");
const Vendor = require("../models/venderSchema");
const dbConnect = require("./dbConnect"); 

dbConnect();

const agenda = new Agenda({ mongo: mongoose.connection });

agenda.define("decrease subscription left", async () => {
  console.log("Running subscription decrement job...");

  try {
    const vendors = await Vendor.find({ subscription: "true", subscriptionleft: { $gt: 0 } });

    for (const vendor of vendors) {
      vendor.subscriptionleft = (parseInt(vendor.subscriptionleft) - 1).toString();

      if (parseInt(vendor.subscriptionleft) === 0) {
        vendor.subscription = "false";
      }

      await vendor.save();
    }

    console.log("Subscription days updated successfully.");
  } catch (error) {
    console.error("Error updating subscription days:", error);
  }
});

(async function () {
  await agenda.start();
  await agenda.every("24 hours", "decrease subscription left");
})();

module.exports = agenda;
