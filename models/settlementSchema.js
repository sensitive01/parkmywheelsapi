const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
  orderid: {
    type: String,
  },
  parkingamout: {
    type: String,
  },
  platformfee: {
    type: String,
  },
  gst: {
    type: String,
  },
  tds : [{
    type: String,
  }],
  payableammout : {
    type: String,
  },
  date : {
    type: String, 
  },
    time : {
    type: String, 
  },
    status : {
    type: String, 
  },
    settlementid : {
    type: String, 
  },
    vendorid : {
    type: String, 
  },
    bookingtotal : {
    type: String, 
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Settlement', settlementSchema);