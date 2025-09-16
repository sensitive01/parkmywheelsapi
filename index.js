const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const cron = require("node-cron");
const moment = require("moment");
const admin = require("./config/firebaseAdmin");

// Models
const Booking = require("./models/bookingSchema");
const userModel = require("./models/userModel");
const Notification = require("./models/notificationschema");
const Vendor = require("./models/venderSchema");

// Configuration and Routes
const { PORT } = require("./config/variables.js");
const dbConnect = require("./config/dbConnect.js");
const userRoute = require("./routes/user/userRoute.js");
const vendorRoute = require("./routes/vendor/vendorRoute.js");
const adminRoute = require("./routes/admin/adminRoute.js");

// Initialize Express app
const app = express();
app.set("trust proxy", true);

// Database Connection
dbConnect();

// Middleware
app.use(cookieParser());
app.use(express.json());

// CORS Configuration
const allowedOrigins = [
  "https://pmw-admin-test.vercel.app",
  "https://pmw-vendor-test.vercel.app",
  "http://16.171.12.142:3000",
  "https://vendor.parkmywheels.com",
  "https://admin.parkmywheels.com",
  "http://168.231.123.6",
  "http://localhost:5173",
  "http://127.0.0.1:5500",
  "http://localhost:4000",
  "http://localhost:56222",
  "http://localhost:56966",
  "https://parkmywheel.netlify.app",
  "http://localhost:3000",
  "http://localhost:3001",
  "https://parmywheels-admin-ui.vercel.app",
  "https://parmywheels-vendor-ui.vercel.app",
];

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

// Routes
app.use("/", userRoute);
app.use("/vendor", vendorRoute);
app.use("/admin", adminRoute);

// Cron Job 1: Booking Reminder (Every 5 Minutes)
cron.schedule("*/5 * * * *", async () => {
  try {
    const now = moment();
    const oneHourLater = now.clone().add(1, "hour");

    // Find bookings scheduled to start in 1 hour (status PENDING or Approved)
    const bookings = await Booking.find({
      status: { $in: ["PENDING", "Approved"] },
      parkingDate: oneHourLater.format("DD-MM-YYYY"),
      parkingTime: oneHourLater.format("hh:mm A"),
      reminderSent: { $ne: true },
    });

    for (const booking of bookings) {
      // Find user FCM tokens
      const user = await userModel.findOne({ uuid: booking.userid }, { userfcmTokens: 1 });
      const tokens = user?.userfcmTokens || [];

      // Compose notification
      const title = "Parking Reminder";
      const body = `Reminder: Your parking at ${booking.vendorName} starts at ${booking.parkingTime}.`;

      // Save notification in DB
      await new Notification({
        vendorId: booking.vendorId,
        userId: booking.userid,
        bookingId: booking._id,
        title,
        message: body,
        vehicleType: booking.vehicleType,
        vehicleNumber: booking.vehicleNumber,
        createdAt: new Date(),
        read: false,
        notificationdtime: `${booking.parkingDate} ${booking.parkingTime}`,
        status: booking.status,
      }).save();

      // Send FCM notification
      if (tokens.length > 0) {
        const notifPayload = {
          notification: { title, body },
          android: { notification: { sound: "default", priority: "high" } },
          apns: { payload: { aps: { sound: "default" } } },
        };
        for (const token of tokens) {
          try {
            await admin.messaging().send({ ...notifPayload, token });
          } catch (err) {
            console.error(`Error sending FCM to token ${token}:`, err.message);
          }
        }
      }

      // Mark reminder as sent
      booking.reminderSent = true;
      await booking.save();
    }

    if (bookings.length > 0) {
      console.log(`🔔 Sent ${bookings.length} upcoming booking reminders.`);
    }
  } catch (error) {
    console.error("❌ Error in booking reminder cron job:", error);
  }
}, {
  timezone: "Asia/Kolkata",
});

// Cron Job 2: Vendor Trial and Subscription Check (Daily at 11:59 PM)
cron.schedule("38 0 * * *", async () => {
  console.log("⏰ Running daily vendor trial + subscription check...");

  try {
    const today = new Date();

    // 1. TRIAL CHECK: Vendors still in trial mode
    const trialVendors = await Vendor.find({ trial: "false", trialstartdate: { $exists: true } });

    for (const vendor of trialVendors) {
      const trialStart = new Date(vendor.trialstartdate);
      const diffDays = Math.floor((today - trialStart) / (1000 * 60 * 60 * 24));

      if (diffDays >= 30) {
        vendor.trial = "true"; // Trial completed
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
        vendor.subscriptionleft = 0; // Ensure no negative values
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
  timezone: "Asia/Kolkata",
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log("Cron jobs scheduled.");
});