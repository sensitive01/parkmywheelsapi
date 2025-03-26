const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
vendorName: { type: String, required: true },
spaceid: { type: String },
contacts: [
  {
    name: { type: String, required: true },
    mobile: { type: String, required: true }
      }
    ],
    latitude: {
      type: String,
    },
    longitude: {
      type: String,
    },
    placetype: {
      type: String,
    },
    address: {
      type: String,
      
      trim: true,
    },
    password: {
      type: String,
      
    },
    landMark: {
      type: String,
    },

    subscriptionleft: { type: String, default: "0" },
    platformfee: { type: String, },
    subscription: { type: String, default: "false" },
    subscriptionenddate: { type: String, },
    image: {
      type: String,
    },
    vendorId: {
      type: String,
      unique: true
    },
    parkingEntries: [{
      type: {
        type: String,

      },
      count: {
        type: String
      },


    }],
  },
  { timestamps: true }
);


module.exports = mongoose.model("Vendor", vendorSchema);
