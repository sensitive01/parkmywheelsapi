const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: String, // String instead of ObjectId to gracefully handle admins, vendors, and users since they have different formats or models
      required: true,
      index: true,
    },
    actorType: {
      type: String,
      enum: ["ADMIN", "VENDOR", "USER", "ACCOUNTANT", "UNKNOWN"],
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      required: true,
      index: true,
    },
    resourceId: {
      type: String,
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed, // Flexible JSON for arbitrary data
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
    }
  },
  { timestamps: true }
);

// Additional compound index for efficient dashboard querying
activityLogSchema.index({ actorType: 1, action: 1, resourceType: 1 });
activityLogSchema.index({ createdAt: -1 });

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

module.exports = ActivityLog;
