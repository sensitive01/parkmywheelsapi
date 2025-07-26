const express = require("express");
const cors = require("cors");
const app = express();
const cookieParser = require("cookie-parser");

const { PORT } = require("./config/variables.js");
const dbConnect = require("./config/dbConnect.js");
const userRoute = require("./routes/user/userRoute.js");
const vendorRoute = require("./routes/vendor/vendorRoute.js");
const Vendor = require("./models/venderSchema.js");
const adminRoute = require("./routes/admin/adminRoute.js");

const cron = require('node-cron');  // Import node-cron for scheduling jobs

app.set("trust proxy", true);

// DATABASE CONNECTION
dbConnect();

app.use(cookieParser()); 
app.use(express.json());

const allowedOrigins = ["http://16.171.12.142:3000","https://vendor.parkmywheels.com","https://admin.parkmywheels.com","http://168.231.123.6","http://localhost:5173","http://127.0.0.1:5500","http://localhost:4000/","http://localhost:56222","http://localhost:56966","https://parkmywheel.netlify.app",'http://localhost:3000','http://localhost:3001','https://parmywheels-admin-ui.vercel.app','https://parmywheels-vendor-ui.vercel.app'];
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
cron.schedule("59 23 * * *", async () => {
  console.log("⏰ Running daily vendor trial + subscription check...");

  try {
    const today = new Date();

    // 1. TRIAL CHECK: Vendors still in trial mode
    const trialVendors = await Vendor.find({ trial: "false", trialstartdate: { $exists: true } });

    for (const vendor of trialVendors) {
      const trialStart = new Date(vendor.trialstartdate);
      const diffDays = Math.floor((today - trialStart) / (1000 * 60 * 60 * 24));

      if (diffDays >= 30) {
        vendor.trial = "true"; // trial completed
        vendor.subscription = "false";
        vendor.subscriptionleft = 0;
        console.log(`✅ Trial ended for vendor: ${vendor.vendorName}`);
        await vendor.save();
      }
    }

    // 2. SUBSCRIPTION DECREMENT: Active subscriptions
    const activeVendors = await Vendor.find({ subscription: "true", subscriptionleft: { $gt: 0 } });

    for (const vendor of activeVendors) {
      let left = parseInt(vendor.subscriptionleft);
      left -= 1;
      vendor.subscriptionleft = left.toString();

      if (vendor.subscriptionleft <= 0) {
        vendor.subscription = "false";
        vendor.subscriptionleft = 0; // ensure no negative values
        console.log(`🚫 Subscription expired for vendor: ${vendor.vendorName}`);
      } else {
        console.log(`📉 Decremented subscription for: ${vendor.vendorName} (${vendor.subscriptionleft} days left)`);
      }

      await vendor.save();
    }

    console.log("✅ Daily vendor subscription & trial check completed.");
  } catch (error) {
    console.error("❌ Error in cron job:", error);
  }
}, {
  timezone: "Asia/Kolkata"  // ⏰ Set timezone to IST
});
console.log('Cron job scheduled.'); // To confirm that the job is scheduled

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
