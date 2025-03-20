const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema({
  userId: { type: String, required: true },  // Change from ObjectId to String
  vendorId: { type: String, required: true } // Change from ObjectId to String
});

module.exports = mongoose.model("Favorite", favoriteSchema);
