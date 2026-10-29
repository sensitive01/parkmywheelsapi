// const mongoose = require("mongoose");
// const dns = require("dns");
// require("dotenv").config();
// const { MONGO_USERNAME, MONGO_PASSWORD, MONGO_DATABASE_NAME } = require("./variables");

// // Configure reliable DNS servers to resolve MongoDB Atlas SRV records (_mongodb._tcp)
// try {
//   dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
// } catch (e) {
//   console.warn("Could not set DNS servers:", e.message);
// }

// const dbConnect = () => {
//   console.log("Welcome to database");
//   mongoose
//     .connect(
//       `mongodb+srv://${MONGO_USERNAME}:${MONGO_PASSWORD}@cluster0.jczad.mongodb.net/${MONGO_DATABASE_NAME}`
//       , {
//         serverSelectionTimeoutMS: 30000,
//         socketTimeoutMS: 45000,
//       })
//     .then(() => {
//       console.log("Connected to the database Atlas");
//     })
//     .catch((err) => {
//       console.error("Error in connecting the database", err);
//     });
// };

// module.exports = dbConnect;

const mongoose = require("mongoose");
require("dotenv").config();
const { MONGO_USERNAME, MONGO_PASSWORD, MONGO_DATABASE_NAME } = require("./variables");

const dbConnect = () => {
  console.log("Connecting to local MongoDB...");

  // URL-encode special characters in credentials
  const username = encodeURIComponent(MONGO_USERNAME);
  const password = encodeURIComponent(MONGO_PASSWORD);

  // Local MongoDB connection URI with authSource
  const mongoURI = `mongodb://${username}:${password}@127.0.0.1:27017/${MONGO_DATABASE_NAME}?authSource=${MONGO_DATABASE_NAME}`;

  mongoose
    .connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    })
    .then(() => {
      console.log("Connected successfully to local MongoDB");
    })
    .catch((err) => {
      console.error("Error connecting to local MongoDB:", err);
    });
};

module.exports = dbConnect;