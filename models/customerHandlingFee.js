const mongoose = require("mongoose");

const customerHandlingFeeSchema = new mongoose.Schema(
    {
        percentage: {
            type: Number,
            required: true,
            min: 0,
        },



        isActive: {
            type: Boolean,
            default: true,
        },

        description: {
            type: String,
            default: "Customer handling fee",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model(
    "CustomerHandlingFee",
    customerHandlingFeeSchema
);
