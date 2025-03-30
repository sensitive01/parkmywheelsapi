const mongoose = require('mongoose');

const CorporateSchema = new mongoose.Schema({
    organisationName: { type: String },
    representative: { type: String },
    phoneNumbers: { type: [String] },
    addressDetails: {
        street: String,
        locality: String,
        city: String,
        state: String,
        postalCode: String,
        landmark: String,
        latitude: String,
        longitude: String
    },
    totalParkingSlots: { type: String },
    parkingDetails: [{
        category: { type: String },
        capacity: { type: String }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Corporate', CorporateSchema);
