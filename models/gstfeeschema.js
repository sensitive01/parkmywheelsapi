const mongoose = require("mongoose");

const gstFeeSchema = new mongoose.Schema({
    gst: { type: String, required: true }, // User ID
    handlingfee: { type: String, required: true },
    isActive: {
        type: Boolean,
        default: true,
    },

    description: {
        type: String,
        default: "Customer handling fee",
    },
}
    , {
        timestamps: true
    });

const Gstfee = mongoose.model("Gstfee", gstFeeSchema);

module.exports = Gstfee;