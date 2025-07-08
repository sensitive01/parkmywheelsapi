const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    uuid: {
      type: String,
    },

    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userEmail: {
      type: String,

    },
    userMobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    userPassword: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRQ_4p5Rgu7HT7jtL6eMhar_c47tv4YEJAgKw&s"
    },
    vehicleNo: {
      type: String,
      default:""
    },

    role: {
      type: String,
      default: "user",
    },

    status: {
      type: String,
      default: "Active",
    },
    walletamount: {
      type: String,
      default: "0",
    },
        otp: { type: String },
    otpExpiresAt: { type: Date },
     userfcmTokens: { type: [String], default: [] },
    walletstatus: {
      type: String,
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
