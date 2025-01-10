const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
  vendorName: { type: String, required: true },
  contacts: [
    {
      name: { type: String, required: true },
      mobile: { type: String, required: true }
    }
  ],
    latitude: {
      type: String,
    },
    longitude: {
      type: String,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    landMark: {
      type: String,
    },
    image: {
      type: String,
    },
    vendorId: { type: String,
       unique: true }, 
    parkingEntries:[{
      type:{
        type:String,
        
      },
     count:{
        type:String
      },
       subscription: { type: String, default: false },
  
    }],
  },
  { timestamps: true }
);


module.exports = mongoose.model("Vendor", vendorSchema);
