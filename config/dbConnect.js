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
const {
  MONGO_USERNAME,
  MONGO_PASSWORD,
  MONGO_DATABASE_NAME,
  MONGO_URI,
  MONGO_AUTH_SOURCE,
} = require("./variables");

// Listeners for MongoDB connection lifecycle
mongoose.connection.on("connected", () => {
  console.log("✅ Mongoose connected successfully to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ Mongoose disconnected from MongoDB");
});

const dbConnect = () => {
  let mongoURI = MONGO_URI;

  if (!mongoURI) {
    const dbName = MONGO_DATABASE_NAME || "Park_My_Wheels";

    if (MONGO_USERNAME && MONGO_PASSWORD) {
      const username = encodeURIComponent(MONGO_USERNAME);
      const password = encodeURIComponent(MONGO_PASSWORD);
      const authSource = MONGO_AUTH_SOURCE || "admin";
      mongoURI = `mongodb://${username}:${password}@127.0.0.1:27017/${dbName}?authSource=${authSource}`;
    } else {
      mongoURI = `mongodb://127.0.0.1:27017/${dbName}`;
    }
  }

  // Safe URI for logging (mask password)
  const maskedURI = mongoURI.replace(/:([^:@]+)@/, ":****@");
  console.log(`🔌 Connecting to MongoDB at: ${maskedURI}`);

  mongoose
    .connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    })
    .catch((err) => {
      console.error("❌ Error establishing initial connection to MongoDB:", err.message);
    });
};

module.exports = dbConnect;