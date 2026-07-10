const mongoose = require("mongoose");

const authLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // String instead of ObjectId to gracefully handle admins, vendors, and users since they have different formats or models
      required: true,
      index: true,
    },
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    userType: {
      type: String,
      enum: ["ADMIN", "VENDOR", "USER", "ACCOUNTANT", "UNKNOWN"],
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        "LOGIN",
        "LOGIN_FAILED",
        "LOGOUT",
        "PASSWORD_CHANGED",
        "PASSWORD_RESET",
        "SESSION_EXPIRED",
        "ACCESS_DENIED",
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      required: true,
      index: true,
    },
    accessType: {
      type: String,
      enum: ["WEB", "ANDROID_APP", "IOS_APP", "UNKNOWN"],
      default: "UNKNOWN",
    },
    osType: {
      type: String,
      enum: ["WINDOWS", "MACOS", "LINUX", "ANDROID", "IOS", "UNKNOWN"],
      default: "UNKNOWN",
    },
    deviceType: {
      type: String,
      enum: ["DESKTOP", "LAPTOP", "TABLET", "PHONE", "UNKNOWN"],
      default: "UNKNOWN",
    },
    browser: {
      type: String,
    },
    browserVersion: {
      type: String,
    },
    deviceName: {
      type: String, // E.g., iPhone 13, SM-G998B
    },
    userAgent: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
    location: {
      type: String, // E.g., 'New York, USA' or lat/lng if available
    },
    sessionId: {
      type: String,
    },
    reason: {
      type: String, // E.g., 'Invalid Password', 'User Not Found'
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // Any additional data
    },
  },
  { timestamps: true }
);

// Additional compound index for efficient dashboard querying
authLogSchema.index({ userType: 1, action: 1, status: 1 });
authLogSchema.index({ createdAt: -1 });

const AuthLog = mongoose.model("AuthLog", authLogSchema);

module.exports = AuthLog;
