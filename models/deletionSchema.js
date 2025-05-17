
const mongoose = require('mongoose');

const DeletedAccountSchema = new mongoose.Schema({
  userId: {
    type: String, // Can be String or ObjectId depending on your needs
    required: true
  },
  deletionReason: {
    type: String,
    required: true
  },
  deletedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

module.exports = mongoose.model('DeletedAccount', DeletedAccountSchema);