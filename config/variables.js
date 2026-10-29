require("dotenv").config()



// module.exports = {
//     PORT:process.env.PORT||3002,
//     MONGO_USERNAME:process.env.MONGO_USERNAME,
//     MONGO_PASSWORD:process.env.MONGO_PASSWORD,
//     MONGO_DATABASE_NAME:process.env.MONGO_DATABASE_NAME
// } 

module.exports = {
    PORT: process.env.PORT || 3002,
    MONGO_USERNAME: process.env.MONGO_USERNAME,
    MONGO_PASSWORD: process.env.MONGO_PASSWORD,
    MONGO_DATABASE_NAME: process.env.MONGO_DATABASE_NAME,
    MONGO_URI: process.env.MONGO_URI,
    MONGO_AUTH_SOURCE: process.env.MONGO_AUTH_SOURCE
} 