const mongoose = require("mongoose");

const chatboxSchema = new mongoose.Schema({
  userId: {
    type: String,  
  
  },
  image: {
    type: String,  
    
  },
  message: {
    type: String,
    
  },
  time: {
    type: String,
    default: () => new Date().toLocaleTimeString(), 
  },
  timestamp: {
    type: Date,
    default: Date.now,  
  },
});

// Help and Support Schema with chatbox as an array
const helpSupportSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
    
    },
    vendoractive: {
      type: Boolean,
      default: true,
    },
    vendorid: {
      type: String,
    
    },
    description: {
      type: String, 
    },
    date: {
      type: Date,
      default: Date.now,
    },
    time: {
      type: String,
      default: () => new Date().toLocaleTimeString(),
    },
    status: {
      type: String,
      default: "Pending",
    },
    userActive: {
      type: Boolean,
      default: true,
    },
    chatbox: [chatboxSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("HelpSupport", helpSupportSchema);
