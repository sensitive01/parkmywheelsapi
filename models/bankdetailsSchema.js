const mongoose = require("mongoose");

const bankdetailsSchema = new mongoose.Schema(
  {
    vendorId: {
        type: String,
      },
    accountnumber: {
      type: String,
    },
    confirmaccountnumber: {
      type: String,
    },
    accountholdername: {
      type: String,
    },
    ifsccode: {
      type: String,
    },
  }
);

module.exports = mongoose.model("BankDetails", bankdetailsSchema);
