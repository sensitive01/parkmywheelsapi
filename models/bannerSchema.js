const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema({
    id: {
        type: String,
    },
    name: {
        type: String,
    },
    page: {
        type: String,
    },
    image: {
        type: String,
    }
})

module.exports = mongoose.model("Banner", bannerSchema);
