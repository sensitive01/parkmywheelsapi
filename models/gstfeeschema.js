const mongoose = require("mongoose");

const gstFeeSchema = new mongoose.Schema({
    gst: { type: String, required: true }, // User ID
    handlingfee: { type: String, required: true },
});

const Gstfee = mongoose.model("Gstfee", gstFeeSchema);

module.exports = Gstfee;