const mongoose = require("mongoose");

const parkingCharges = new mongoose.Schema({
  type: { type: String,  }, 
_id: { type: String,  },
  amount: { type: String,  }, 

  category: { type: String,  }, 
  
});

const vendorchargeSchema = new mongoose.Schema({
  vendorid: { type: String, }, 
  charges: { type: [parkingCharges], }, 
});

module.exports = mongoose.model("Parkingcharges", vendorchargeSchema);
