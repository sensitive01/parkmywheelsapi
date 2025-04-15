const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
vendorName: { type: String, },
spaceid: { type: String },
contacts: [
  {
    name: { type: String, },
    mobile: { type: String,  }
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
    trial : { type: String, default: "false" },
    subscriptionenddate: { type: String, },
    image: {
      type: String,
    },
    vendorId: {
      type: String,
      unique: true
    },
    fcmTokens: { type: [String], default: [] },
    status: { type: String, default: "pending" },
    platformfee: { type: String, default: "" },
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
