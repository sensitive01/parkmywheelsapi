const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fromDate: {
      type: Date,
    },
    toDate: {
      type: Date,
    },
    category: {
      type: String,
      enum: ["Leave", "Permission"],
      default: "Leave",
    },
    type: {
      type: String,
      enum: ["Sick", "Casual", "Emergency", "Other"],
      default: "Casual",
    },
    permissionType: {
      type: String,
      enum: ["Late Coming", "Early Going", "Personal Work", "Other"],
    },
    permissionDate: {
      type: Date,
    },
    startTime: {
      type: String,
    },
    endTime: {
      type: String,
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Leave", leaveSchema);
