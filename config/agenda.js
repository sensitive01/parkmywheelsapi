const cron = require("node-cron");  // Cron scheduler
const mongoose = require("mongoose");
const Vendor = require("../models/venderSchema");
const Booking = require("../models/bookingSchema");
const Notification = require("../models/notificationschema");
const User = require("../models/userModel");
const admin = require("./firebaseAdmin");
const axios = require("axios");
const qs = require("qs");
const { DateTime } = require("luxon");
const dbConnect = require("./dbConnect");

dbConnect();

// ------------------------------------------------------------------
// Reusable date parser: normalize input formats to Luxon DateTime in IST at start of day
// ------------------------------------------------------------------
const parseEndDateIst = (value) => {
  if (!value) return null;
  const stringVal = String(value).trim();

  if (/^\d{13}$/.test(stringVal)) {
    return DateTime.fromMillis(Number(stringVal), { zone: "Asia/Kolkata" }).startOf("day");
  }
  if (/^\d{10}$/.test(stringVal)) {
    return DateTime.fromSeconds(Number(stringVal), { zone: "Asia/Kolkata" }).startOf("day");
  }

  let dt = DateTime.fromISO(stringVal, { zone: "Asia/Kolkata" });
  if (dt.isValid) return dt.startOf("day");

  const patterns = [
    "yyyy-MM-dd",
    "yyyy/MM/dd",
    "dd/MM/yyyy",
    "MM/dd/yyyy",
    "dd-MM-yyyy",
    "MM-dd-yyyy",
    "d/M/yyyy",
    "M/d/yyyy",
    "dd LLL yyyy",
    "LLL dd, yyyy",
    "ccc, dd LLL yyyy",
    "dd LLLL yyyy",
  ];
  for (const fmt of patterns) {
    dt = DateTime.fromFormat(stringVal, fmt, { zone: "Asia/Kolkata" });
    if (dt.isValid) return dt.startOf("day");
  }

  const jsDate = new Date(stringVal);
  if (!isNaN(jsDate.getTime())) {
    return DateTime.fromJSDate(jsDate, { zone: "Asia/Kolkata" }).startOf("day");
  }
  return null;
};

// ------------------------------------------------------------------
// Cron job definition
// ------------------------------------------------------------------
cron.schedule("36 0 * * *", async () => {
  console.log(`[${new Date().toISOString()}] Running subscription decrement job...`);

  try {
    const vendors = await Vendor.find({ subscription: "true", subscriptionleft: { $gt: 0 } });
    console.log(`Found ${vendors.length} vendors with active subscriptions.`);

    for (const vendor of vendors) {
      console.log(`[${new Date().toISOString()}] Processing vendor: ${vendor._id} | Subscription left: ${vendor.subscriptionleft}`);

      vendor.subscriptionleft -= 1;

      if (vendor.subscriptionleft === 0) {
        vendor.subscription = "false";
        console.log(`[${new Date().toISOString()}] Vendor ${vendor._id} subscription expired. Subscription set to false.`);
      }

      await vendor.save();
      console.log(`[${new Date().toISOString()}] Vendor ${vendor._id} | Updated Days left: ${vendor.subscriptionleft} | Subscription: ${vendor.subscription}`);
    }

    console.log("All subscription days updated successfully.");
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error updating subscription days:`, error);
  }

  try {
    await triggerSevenDaySubscriptionReminders();
    await triggerFiveDaySubscriptionReminders();
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error while processing subscription notifications:`, err);
  }
});

console.log("Cron job scheduled.");

// ------------------------------------------------------------------
// 7-day reminder function
// ------------------------------------------------------------------
const triggerSevenDaySubscriptionReminders = async () => {
  try {
    const nowIst = DateTime.now().setZone("Asia/Kolkata").startOf("day");
    const targetIst = nowIst.plus({ days: 7 });

    const candidates = await Booking.find({
      sts: { $regex: /^subscription$/i },
      subsctiptionenddate: { $exists: true, $ne: null, $ne: "" },
    });

    const bookingsExpiring = [];
    for (const b of candidates) {
      const endDtIst = parseEndDateIst(b.subsctiptionenddate);
      if (!endDtIst) continue;
      if (endDtIst.hasSame(targetIst, "day")) bookingsExpiring.push(b);
    }

    if (bookingsExpiring.length) {
      console.log(`[${new Date().toISOString()}] Found ${bookingsExpiring.length} subscription bookings expiring in 7 days (IST target ${targetIst.toISODate()}).`);
    }

    for (const booking of bookingsExpiring) {
      const {
        _id: bookingId,
        userid: userId,
        vendorId,
        vehicleNumber,
        vehicleType,
        subsctiptionenddate,
        personName,
      } = booking;

      const title = "Subscription expiring soon";
      const endDateDisplay = parseEndDateIst(subsctiptionenddate)?.toFormat("d-MM-yyyy") || subsctiptionenddate;
      const message = `Your ParkMyWheels subscription will expire on ${endDateDisplay}. Renew now to continue uninterrupted service.`;

      try {
        const notif = new Notification({
          vendorId,
          userId,
          bookingId: String(bookingId),
          title,
          message,
          vehicleType,
          vehicleNumber,
          sts: "subscription",
          bookingtype: booking.bookType || "subscription",
          status: "info",
          notificationdtime: `${subsctiptionenddate} 00:00`,
        });
        await notif.save();
      } catch (err) {
        console.error("Failed saving notification for booking", String(bookingId), err);
      }

      try {
        const user = await User.findOne({ uuid: userId }, { userfcmTokens: 1 });
        const tokens = user?.userfcmTokens || [];
        if (!tokens.length) continue;

        const payload = {
          notification: { title, body: message },
          android: { notification: { sound: "default", priority: "high" } },
          apns: { payload: { aps: { sound: "default" } } },
          data: { bookingId: String(bookingId), type: "subscription_expiry_7_days" },
        };

        const invalidTokens = [];
        for (const token of tokens) {
          try {
            await admin.messaging().send({ ...payload, token });
          } catch (sendErr) {
            console.error("FCM send error for token", token, sendErr?.errorInfo?.code || sendErr?.message || sendErr);
            if (sendErr?.errorInfo?.code === "messaging/registration-token-not-registered") {
              invalidTokens.push(token);
            }
          }
        }

        if (invalidTokens.length) {
          await User.updateOne({ uuid: userId }, { $pull: { userfcmTokens: { $in: invalidTokens } } });
          console.log("Removed invalid user FCM tokens:", invalidTokens);
        }
      } catch (fcmErr) {
        console.error("Error while sending FCM for booking", String(bookingId), fcmErr);
      }
    }
    return { targetDate: targetIst.toISODate(), count: bookingsExpiring.length };
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error while processing 7-days-left subscription notifications:`, err);
    throw err;
  }
};

// ------------------------------------------------------------------
// 5-day reminder function
// ------------------------------------------------------------------
const triggerFiveDaySubscriptionReminders = async () => {
  try {
    const nowIst = DateTime.now().setZone("Asia/Kolkata").startOf("day");
    const targetIst = nowIst.plus({ days: 5 });

    const candidates = await Booking.find({
      sts: { $regex: /^subscription$/i },
      subsctiptionenddate: { $exists: true, $ne: null, $ne: "" },
    });

    const bookingsExpiring = [];
    for (const b of candidates) {
      const endDtIst = parseEndDateIst(b.subsctiptionenddate);
      if (!endDtIst) continue;
      if (endDtIst.hasSame(targetIst, "day")) bookingsExpiring.push(b);
    }

    if (bookingsExpiring.length) {
      console.log(`[${new Date().toISOString()}] Found ${bookingsExpiring.length} subscription bookings expiring in 5 days (IST target ${targetIst.toISODate()}).`);
    }

    for (const booking of bookingsExpiring) {
      const {
        _id: bookingId,
        userid: userId,
        vendorId,
        vendorName,
        vehicleNumber,
        vehicleType,
        subsctiptionenddate,
        personName,
        mobileNumber,
      } = booking;

      const title = "Subscription expiring soon";
      const endDateDisplay = parseEndDateIst(subsctiptionenddate)?.toFormat("d-MM-yyyy") || subsctiptionenddate;
      const message = `Dear ${personName || "User"}, Your Parking subscription for ${vehicleNumber || ""} is expiring on ${endDateDisplay} at ${vendorName || "vendor"}. Renew now on ParkMyWheels app to enjoy hassle free parking.`;

      try {
        const notif = new Notification({
          vendorId,
          userId,
          bookingId: String(bookingId),
          title,
          message,
          vehicleType,
          vehicleNumber,
          sts: "subscription",
          bookingtype: booking.bookType || "subscription",
          status: "info",
          notificationdtime: `${subsctiptionenddate} 00:00`,
        });
        await notif.save();
      } catch (err) {
        console.error("Failed saving notification for booking", String(bookingId), err);
      }

      try {
        const user = await User.findOne({ uuid: userId }, { userfcmTokens: 1 });
        const tokens = user?.userfcmTokens || [];
        if (!tokens.length) continue;

        const payload = {
          notification: { title, body: message },
          android: { notification: { sound: "default", priority: "high" } },
          apns: { payload: { aps: { sound: "default" } } },
          data: { bookingId: String(bookingId), type: "subscription_expiry_5_days" },
        };

        const invalidTokens = [];
        for (const token of tokens) {
          try {
            await admin.messaging().send({ ...payload, token });
          } catch (sendErr) {
            console.error("FCM send error for token", token, sendErr?.errorInfo?.code || sendErr?.message || sendErr);
            if (sendErr?.errorInfo?.code === "messaging/registration-token-not-registered") {
              invalidTokens.push(token);
            }
          }
        }

        if (invalidTokens.length) {
          await User.updateOne({ uuid: userId }, { $pull: { userfcmTokens: { $in: invalidTokens } } });
          console.log("Removed invalid user FCM tokens:", invalidTokens);
        }
      } catch (fcmErr) {
        console.error("Error while sending FCM for booking", String(bookingId), fcmErr);
      }

      try {
        let targetMobile = mobileNumber;
        if (!targetMobile) {
          const userDoc = await User.findOne({ uuid: userId }, { userMobile: 1 });
          targetMobile = userDoc?.userMobile || "";
        }

        if (targetMobile) {
          let cleanedMobile = String(targetMobile).replace(/[^0-9]/g, "");
          if (cleanedMobile.length === 10) cleanedMobile = "91" + cleanedMobile;

          const smsText = `Dear ${personName || "User"}, Your Parking subscription for ${vehicleNumber || ""} is expiring on ${endDateDisplay} at ${vendorName || "vendor"}. Renew now on ParkMyWheels app to enjoy hassle free parking.`;
          const dltTemplateId = process.env.VISPL_TEMPLATE_ID_REMINDER || "YOUR_SUBSCRIPTION_TEMPLATE_ID";

          const smsParams = {
            username: process.env.VISPL_USERNAME || "Vayusutha.trans",
            password: process.env.VISPL_PASSWORD || "pdizP",
            unicode: "false",
            from: process.env.VISPL_SENDER_ID || "PRMYWH",
            to: cleanedMobile,
            text: smsText,
            dltContentId: dltTemplateId,
          };

          try {
            const smsResponse = await axios.get("https://pgapi.vispl.in/fe/api/v1/send", {
              params: smsParams,
              paramsSerializer: (params) => qs.stringify(params, { encode: true }),
              headers: { "User-Agent": "Mozilla/5.0 (Node.js)" },
            });

            const smsStatus = smsResponse.data.STATUS || smsResponse.data.status || smsResponse.data.statusCode;
            const isSuccess = smsStatus === "SUCCESS" || smsStatus === 200 || smsStatus === 2000;
            if (!isSuccess) {
              console.warn("❌ SMS failed to send:", smsResponse.data);
            } else {
              console.log("✅ SMS reminder sent successfully!");
            }
          } catch (smsErr) {
            console.error("📛 SMS sending error:", smsErr?.message || smsErr);
          }
        } else {
          console.warn("⚠️ No mobile number found for booking/user", String(bookingId));
        }
      } catch (smsOuterErr) {
        console.error("Error while preparing SMS for booking", String(bookingId), smsOuterErr);
      }
    }
    return { targetDate: targetIst.toISODate(), count: bookingsExpiring.length };
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error while processing 5-days-left subscription notifications:`, err);
    throw err;
  }
};
