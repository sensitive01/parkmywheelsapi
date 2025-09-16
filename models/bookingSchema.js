const mongoose = require("mongoose");
const Vendor = require("./venderSchema");

const bookingSchema = new mongoose.Schema(
  {
    userid: {
      type: String,
     
    },
    bookType: {
      type: String,
     
    },
    
    vendorId: {
      type: String,
    },
       vendorName:{
    type:String,
   },
    amount: {
      type: String,
    },
    hour: {
      type: String,
    },
    vehicleType: {
      type: String,
    },
    personName: {
      type: String
    },
    mobileNumber: {
      type: String
    },
    carType: {
      type: String,
    },
    vehicleNumber: {
      type: String,
      
    },
    bookingDate: {
      type: String,
      
    },
    otp: {
      type: String,
      required: true
    },
    
   handlingfee: {
      type: String,
     
    },
    reminderSent: { type: Boolean, default: false },
     releasefee: {
      type: String,
     
    },
     recievableamount: {
      type: String,
     
    },
       gstamout: {
      type: String,
     
    },
       totalamout: {
      type: String,
     
    },
       payableamout : {
      type: String,
     
    },
    parkingDate:{
      type: String,
    },
    subsctiptionenddate:{
      type: String,
    },
    parkingTime:{
      type: String,
    },

      subsctiptiontype:{
type: String,
      },
  
    bookingTime: {
      type: String,
      
    },
    status: {
      type: String,
      
    },
    tenditivecheckout:{
      type: String,
     
    },
    sts: {
      type: String,
      
    },
    cancelledStatus: {
      type: String,
      default: "", 
    },
    approvedDate: {
      type: String,
      
    },
    approvedTime: {
      type: String,
      
    },
      settlemtstatus: {
      type: String,
      
    },
    cancelledDate: {
      type: String,
      
    },
    cancelledTime: {
      type: String,
      
    },
    parkedDate: { type: String,  }, 
    parkedTime: { type: String, },
    exitvehicledate: { type: String },  
    exitvehicletime: { type: String }, 
  },
  { timestamps: true }
  
);




const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
