const express = require("express");
const cors = require("cors");
const app = express();
const cookieParser = require("cookie-parser");

const { PORT } = require("./config/variables.js");
const dbConnect = require("./config/dbConnect.js");
const userRoute = require("./routes/user/userRoute.js");
const vendorRoute = require("./routes/vendor/vendorRoute.js");

const adminRoute = require("./routes/admin/adminRoute.js");

const cron = require('node-cron');  // Import node-cron for scheduling jobs

app.set("trust proxy", true);

// DATABASE CONNECTION
dbConnect();

app.use(cookieParser()); 
app.use(express.json());

const allowedOrigins = ["http://localhost:5173","http://127.0.0.1:5500","http://localhost:4000/","http://localhost:56222","http://localhost:56966","https://parkmywheel.netlify.app",'http://localhost:3000','http://localhost:3001'];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`CORS error for origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

app.disable("x-powered-by");

app.use("/", userRoute);
app.use("/vendor", vendorRoute);
app.use("/admin", adminRoute);

// Cron job definition to decrement subscription days every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running subscription decrement job...');

  try {
    const vendors = await Vendor.find({ subscription: 'true', subscriptionleft: { $gt: 0 } });

    for (const vendor of vendors) {
      vendor.subscriptionleft = (parseInt(vendor.subscriptionleft) - 1).toString();

      if (parseInt(vendor.subscriptionleft) === 0) {
        vendor.subscription = 'false';
      }

      await vendor.save();
    }

    console.log('Subscription days updated successfully.');
  } catch (error) {
    console.error('Error updating subscription days:', error);
  }
});

console.log('Cron job scheduled.'); // To confirm that the job is scheduled

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
