const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema({
    name: {
        type: String
    },
    department: {
        type: String
    },
    email: {
        type: String
    },
    mobile: {
        type: String
    },
    businessURL: {
        type: String
    },
    callbackTime: {
        type: String
    },
    vendorId:{
        type: String
    },
    isRead:{
        type: Boolean,
        default: false
    }

},{
    timestamps:true
});

module.exports = mongoose.model("Meeting", meetingSchema);
