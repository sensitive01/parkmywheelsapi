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
    businessHours: [
      {
        day: String,
        openTime: String,
        closeTime: String,
        is24Hours: Boolean,
        isClosed: Boolean,
      },
    ],
      visibility: { type: Boolean, default: false },

   subscriptionleft: { type: Number, default: 0 },

    platformfee: { type: String, },
    vendorplatformfee: { type: String, },
    subscription: { type: String, default: "false" },
    newuser: { type: String, default: "false" },
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
    handlingFee: { type: String, default: "" },
    parkingEntries: [{
      type: {
        type: String,

      },
      count: {
        type: String
      },


    }],
        otp: { type: String },
    otpExpiresAt: { type: Date },
  },
  { timestamps: true }
);


module.exports = mongoose.model("Vendor", vendorSchema);
