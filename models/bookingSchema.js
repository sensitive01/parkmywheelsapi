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
       invoiceid: {
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
        invoice: {
      type: String,
      default: "",
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
    // Feedback fields stored in booking
    feedback: {
      rating: { type: Number, default: 0 }, // Star rating (0 means not rated yet)
      description: { type: String, default: "" }, // Feedback description/remarks
      feedbackPoints: [{ type: String }], // Selected feedback points (e.g., "Clean parking area", "Good security")
      status: { type: String, default: "pending", enum: ["pending", "submitted", "skipped"] }, // Feedback status
      submittedAt: { type: Date }, // When feedback was submitted
    },
    // Charges stored at booking time
    charges: {
      type: {
        type: String,
      },
      amount: { type: String },
      fulldaybike: { type: String },
      fulldayothers: { type: String },
      category: { type: String },
      chargeid: { type: String },
      carenable: { type: String },
      bikeenable: { type: String },
      othersenable: { type: String },
      cartemp: { type: String },
      biketemp: { type: String },
      otherstemp: { type: String },
      carfullday: { type: String },
      bikefullday: { type: String },
      othersfullday: { type: String },
      carmonthly: { type: String },
      bikemonthly: { type: String },
      othersmonthly: { type: String },
    },
    vendorCharges: {
      fulldaycar: { type: String },
      fulldaybike: { type: String },
      fulldayothers: { type: String },
      carenable: { type: String },
      bikeenable: { type: String },
      othersenable: { type: String },
      cartemp: { type: String },
      biketemp: { type: String },
      otherstemp: { type: String },
      carfullday: { type: String },
      bikefullday: { type: String },
      othersfullday: { type: String },
      carmonthly: { type: String },
      bikemonthly: { type: String },
      othersmonthly: { type: String },
    },
  },
  { timestamps: true }
  
);

// Pre-save middleware to generate invoiceid
bookingSchema.pre('save', function(next) {
  if (this.isNew && !this.invoiceid) {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // Last two digits of year
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Month as 2 digits
    const day = now.getDate().toString().padStart(2, '0'); // Day as 2 digits
    const randomNum = Math.floor(100000 + Math.random() * 900000); // 6-digit random number
    this.invoiceid = `PMW${year}${month}${day}${randomNum}`;
  }
  next();
});




const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
