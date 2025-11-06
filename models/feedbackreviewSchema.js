
const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // User ID
    vendorId: { type: String, required: true }, // Vendor ID
    bookingId: { type: String, required: true }, // Booking ID - links feedback to specific booking
    rating: { type: Number, default: 0 }, // Rating (0 means not rated yet)
    description: { type: String, default: "" }, // Feedback description
    feedbackPoints: [{ type: String }], // Selected feedback points
    status: { type: String, default: "pending", enum: ["pending", "submitted", "skipped"] }, // Feedback status
    submittedAt: { type: Date }, // When feedback was submitted
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

const Feedback = mongoose.model("Feedback", feedbackSchema);

module.exports = Feedback;
