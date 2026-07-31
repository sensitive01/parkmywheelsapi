const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
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
    leadDate: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    leadStatus: {
      type: String,
      enum: ["New", "Contacted", "Follow-up", "Converted", "Pending", "Rejected", ""],
      default: "",
    },
    followUps: [
      {
        date: { type: Date, default: Date.now },
        status: { type: String, default: "" },
        notes: { type: String, default: "" },
        doneBy: { type: String, default: "" }
      }
    ],
    status: {
      type: String,
      default: "Active",
    }
  },
  {
    timestamps: true,
  }
);

leadSchema.index({ uuid: 1 });

const Lead = mongoose.model("Lead", leadSchema);

module.exports = Lead;
