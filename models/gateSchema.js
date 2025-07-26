const mongoose = require("mongoose");

const gateSchema = new mongoose.Schema({
  gatestatus: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Gate", gateSchema); // ✅ use PascalCase model name
