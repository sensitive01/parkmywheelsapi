const mongoose = require("mongoose");

const parkingCharges = new mongoose.Schema({
  type: { type: String,  }, 

  amount: { type: String,  }, 
 fulldaybike: { type: String,  }, 
  fulldayothers: { type: String,  }, 
  category: { type: String,  }, 
  chargeid: {type: String,},
  carenable: {type: String,},
  bikeenable: {type: String,},
  othersenable: {type: String,},
  cartemp:{type: String,},
  biketemp:{type: String,}, 
  otherstemp:{type: String,},
  carfullday: {type: String,},
  bikefullday: {type: String,}, 
  othersfullday: {type: String,},
  carmonthly:{type: String,},
  bikemonthly:{type: String,},  
  othersmonthly:{type: String,},

  
});

const vendorchargeSchema = new mongoose.Schema({
  vendorid: { type: String, }, 
  charges: { type: [parkingCharges], }, 
  fulldaycar: { type: String, },
  fulldaybike: { type: String,  }, 
  fulldayothers: { type: String,  }, 
  carenable: {type: String,},
  bikeenable: {type: String,},
  othersenable: {type: String,},
  cartemp:{type: String,},
  biketemp:{type: String,}, 
  otherstemp:{type: String,},
  carfullday: {type: String,},
  bikefullday: {type: String,}, 
  othersfullday: {type: String,},
  carmonthly:{type: String,},
  bikemonthly:{type: String,},  
  othersmonthly:{type: String,},
});

module.exports = mongoose.model("Parkingcharges", vendorchargeSchema);
