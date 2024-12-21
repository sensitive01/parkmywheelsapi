const mongoose = require("mongoose");

const PrivacyPolicySchema = new mongoose.Schema({
    id: String,
    link: String,
    head: String,
  });