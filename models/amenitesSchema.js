const mongoose = require("mongoose");

const additionalserviceSchema = new mongoose.Schema({
  amount: { type: String, },
  text: { type: String, },
});

const amenitiesSchema = new mongoose.Schema({
  vendorId: { type: String,},
  amenities: { type: [String],},
  parkingEntries: { type: [additionalserviceSchema],},
});

module.exports = mongoose.model("Amenities", amenitiesSchema);
