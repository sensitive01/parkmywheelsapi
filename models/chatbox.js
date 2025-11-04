const mongoose = require("mongoose");

// Schema for individual chat messages
const chatMessageSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    default: "",
  },
  image: {
    type: String,
    default: null,
  },
  messageType: {
    type: String,
    enum: ["user", "bot", "admin"],
    default: "user",
  },
  adminId: {
    type: String,
    default: null,
  },
  time: {
    type: String,
    default: () => new Date().toLocaleTimeString(),
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Schema for chatbox conversation
const chatboxSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true, // One chatbox per user
    },
    messages: [chatMessageSchema],
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for faster queries
chatboxSchema.index({ userId: 1 });
chatboxSchema.index({ "messages.timestamp": 1 });

module.exports = mongoose.model("Chatbox", chatboxSchema);

