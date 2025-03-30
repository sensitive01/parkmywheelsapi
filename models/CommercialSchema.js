const mongoose = require('mongoose');

const CommercialServiceSchema = new mongoose.Schema({
  businessName: { type: String },
  contactPerson: { type: String },
  contactNumbers: { type: [String] },
  location: {
    address: String,
    area: String,
    city: String,
    state: String,
    pincode: String,
    landmark: String,
    latitude: String,
    longitude: String
  },
  parkingSlots: { type: String },
  parkingTypes: [{ 
    type: { type: String }, 
    space: { type: String } 
  }]
}, { timestamps: true });

module.exports = mongoose.model('CommercialService', CommercialServiceSchema);
