const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema({
  planName: {
    type: String,
  },
  role: {
    type: String,
  },
  validity: {
    type: String,
  },
  amount: {
    type: String,
  },
  features: [{
    type: String,
  }],
  status: {
    type: String,
  },
  image: {
    type: String, 
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Plan', PlanSchema);