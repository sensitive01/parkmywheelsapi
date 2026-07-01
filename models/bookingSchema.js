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
    paymentType: {
      type: String,
      default: "",
    },
    paymentMode: {
      type: String,
      default: "",
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
    // Vehicle images (optional) - URLs from Cloudinary
    vehicleImages: [{ type: String }],
    // Feedback fields stored in booking
    feedback: {
      rating: { type: Number, default: 0 }, // Star rating (0 means not rated yet)
      description: { type: String, default: "" }, // Feedback description/remarks
      feedbackPoints: [{ type: String }], // Selected feedback points (e.g., "Clean parking area", "Good security")
      status: { type: String, default: "pending", enum: ["pending", "submitted", "skipped"] }, // Feedback status
      submittedAt: { type: Date }, // When feedback was submitted
    },
    // Full charges array stored at booking time (all charge objects)
    allCharges: [{
      type: { type: String },
      amount: { type: String },
      category: { type: String },
      chargeid: { type: String },
      _id: { type: String } // Store the original _id from charges collection
    }],
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
bookingSchema.pre('save', async function(next) {
  if (this.isNew && !this.invoiceid) {
    const now = new Date();
    // Convert to IST offset (+5.5 hours)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);

    const day = String(istTime.getUTCDate()).padStart(2, '0');
    const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
    const year = istTime.getUTCFullYear();
    const dateString = `${day}${month}${year}`; // DDMMYYYY

    const startOfYear = new Date(Date.UTC(year, 0, 1, 0, 0, 0) - istOffset);
    const endOfYear = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0) - istOffset); 

    try {
      const count = await this.constructor.countDocuments({
        vendorId: this.vendorId,
        createdAt: {
          $gte: startOfYear,
          $lt: endOfYear
        }
      });

      const sequence = String(count + 1).padStart(3, '0');
      this.invoiceid = `PMW${dateString}${sequence}`;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});



bookingSchema.index({ vendorId: 1 });
bookingSchema.index({ userid: 1 });
bookingSchema.index({ vehicleNumber: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ parkingDate: 1 });
bookingSchema.index({ vendorId: 1, status: 1 });
bookingSchema.index({ userid: 1, status: 1 });

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
