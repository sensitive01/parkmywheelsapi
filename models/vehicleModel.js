const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    image: {
      type: String,
    },
    category: {
      type: String,
    },
    type: {
      type: String,
    },
    make: {
      type: String,
    },
    model: {
      type: String,
    },
    color: {
      type: String,
    },
    vehicleNo: {
      type: String,
      unique: true,
    },
    userId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Vehicle = mongoose.model("Vehicle", vehicleSchema);

module.exports = Vehicle;
