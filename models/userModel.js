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
      default: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRQ_4p5Rgu7HT7jtL6eMhar_c47tv4YEJAgKw&s"
    },
    vehicleNo: {
      type: String,
      default: ""
    },

    role: {
      type: String,
      enum: ["user", "employee", "lead", "admin"],
      default: "user",
    },

    // --- Employee Specific Fields ---
    designation: {
      type: String,
      default: "",
    },

    dob: {
      type: String,
      default: "",
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", ""],
      default: "",
    },
    joiningDate: {
      type: String,
      default: "",
    },
    salary: {
      type: Number,
      default: 0,
    },
    attendance: {
      type: Number,
      default: 0,
    },
    leaves: {
      type: Number,
      default: 0,
    },

    // --- Lead Specific Fields ---
    leadStatus: {
      type: String,
      enum: ["New", "Contacted", "Follow-up", "Converted", ""],
      default: "",
    },
    followUps: [
      {
        date: { type: Date, default: Date.now },
        notes: { type: String, default: "" }
      }
    ],

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

userSchema.index({ uuid: 1 });

const User = mongoose.model("User", userSchema);

module.exports = User;
