const mongoose = require("mongoose");

const paymentDisputeSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    ticketId: {
      type: String,
      required: true,
      unique: true,
    },
    issueType: {
      type: String,
      enum: ["Payment made but booking not confirmed", "Booking is getting struck at payment page", "Incorrect charge", "Refund not received"],
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    screenshot: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved", "Closed"],
      default: "Pending",
    },
    adminResponse: {
      type: String,
      default: null,
    },
    adminId: {
      type: String,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for faster queries
paymentDisputeSchema.index({ userId: 1 });
paymentDisputeSchema.index({ ticketId: 1 });
paymentDisputeSchema.index({ status: 1 });

module.exports = mongoose.model("PaymentDispute", paymentDisputeSchema);

