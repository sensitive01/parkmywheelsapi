const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    vendorid: { type: String, required: true },
    empid: { type: String, default: "" },
    fromdate_time: { type: String, default: "" },
    todate_time: { type: String, default: "" },
    entry: { type: Number, default: 0 },
    exit: { type: Number, default: 0 },
    "12hrsveh": { type: Number, default: 0 },
    "24hrsveh": { type: Number, default: 0 },
    "48hrsveh": { type: Number, default: 0 },
    "72hrsveh": { type: Number, default: 0 },
    "7daysveh": { type: Number, default: 0 },
    "15daysveh": { type: Number, default: 0 },
    "30daysveh": { type: Number, default: 0 },
    "12hrsvehamt": { type: Number, default: 0 },
    "24hrsvehamt": { type: Number, default: 0 },
    "48hrsvehamt": { type: Number, default: 0 },
    "72hrsvehamt": { type: Number, default: 0 },
    "7daysvehamt": { type: Number, default: 0 },
    "15daysvehamt": { type: Number, default: 0 },
    "30daysvehamt": { type: Number, default: 0 },
    totals: { type: Number, default: 0 },
    cash: { type: Number, default: 0 },
    online: { type: Number, default: 0 },
    reportdate_time: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);
