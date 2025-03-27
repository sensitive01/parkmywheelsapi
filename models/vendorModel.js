const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  password: { type: String, required: true },
  // Add other fields as needed
});

module.exports = mongoose.models.Vendor || mongoose.model("Vendor", vendorSchema);
