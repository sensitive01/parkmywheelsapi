const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Present", "Absent", "Half-day"],
      required: true,
    },
    remarks: {
      type: String,
      default: "",
    },
    photoUrl: {
      type: String,
      default: "",
    },
    loginTime: {
      type: Date,
    },
    logoutTime: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);
