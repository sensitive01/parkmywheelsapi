const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
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
    employeeId: {
      type: String,
      default: "",
    },
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
    status: {
      type: String,
      default: "Active",
    }
  },
  {
    timestamps: true,
  }
);

employeeSchema.index({ uuid: 1 });

const Employee = mongoose.model("Employee", employeeSchema);

module.exports = Employee;
