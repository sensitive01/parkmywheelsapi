
const mongoose = require('mongoose');

const kycDetailsSchema = new mongoose.Schema({
  vendorId: {
    type: String,
    required: true,
  },
  idProof: {
    type: String,
    required: true,
  },
  idProofNumber: {
    type: String,
    required: true,
  },
  idProofImage: {
    type: String, 
    required: true,
  },
  addressProof: {
    type: String,
    required: true,
  },
  addressProofNumber: {
    type: String,
    required: true,
  },
  addressProofImage: {
    type: String, 
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('KycDetails', kycDetailsSchema);
