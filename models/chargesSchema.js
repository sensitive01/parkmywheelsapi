const mongoose = require("mongoose");

const parkingCharges = new mongoose.Schema({
  type: { type: String,  }, 

  amount: { type: String,  }, 
 fulldaybike: { type: String,  }, 
  fulldayothers: { type: String,  }, 
  category: { type: String,  }, 
  chargeid: {type: String,},


  
});

const vendorchargeSchema = new mongoose.Schema({
  vendorid: { type: String, }, 
  charges: { type: [parkingCharges], }, 
  fulldaycar: { type: String, }
});

module.exports = mongoose.model("Parkingcharges", vendorchargeSchema);
