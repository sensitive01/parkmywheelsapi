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

  console.log(`🔍 Debug parseEndDateIst: Input value: "${stringVal}" (type: ${typeof value})`);

  if (/^\d{13}$/.test(stringVal)) {
    const parsed = DateTime.fromMillis(Number(stringVal), { zone: "Asia/Kolkata" }).startOf("day");
    console.log(`🔍 Debug: Parsed as milliseconds: ${parsed.toISO()}`);
    return parsed;
  }
  if (/^\d{10}$/.test(stringVal)) {
    const parsed = DateTime.fromSeconds(Number(stringVal), { zone: "Asia/Kolkata" }).startOf("day");
    console.log(`🔍 Debug: Parsed as seconds: ${parsed.toISO()}`);
    return parsed;
  }

  // Try MongoDB ObjectId timestamp extraction (first 8 characters are timestamp)
  if (/^[a-f0-9]{24}$/i.test(stringVal)) {
    try {
      const timestamp = parseInt(stringVal.substring(0, 8), 16) * 1000;
      const parsed = DateTime.fromSeconds(timestamp, { zone: "Asia/Kolkata" }).startOf("day");
      console.log(`🔍 Debug: Parsed as ObjectId timestamp: ${parsed.toISO()}`);
      return parsed;
    } catch (e) {
      console.log(`🔍 Debug: Failed to parse as ObjectId timestamp`);
    }
  }

  let dt = DateTime.fromISO(stringVal, { zone: "Asia/Kolkata" });
  if (dt.isValid) {
    console.log(`🔍 Debug: Parsed as ISO: ${dt.toISO()}`);
    return dt.startOf("day");
  }

  // Try with different parsing options for ISO
  dt = DateTime.fromISO(stringVal, { zone: "Asia/Kolkata", setZone: true });
  if (dt.isValid) {
    console.log(`🔍 Debug: Parsed as ISO with setZone: ${dt.toISO()}`);
    return dt.startOf("day");
  }

  // Try without timezone first
  dt = DateTime.fromISO(stringVal);
  if (dt.isValid) {
    console.log(`🔍 Debug: Parsed as ISO without zone: ${dt.toISO()}`);
    return dt.startOf("day");
  }

  // Try parsing with different locale settings
  dt = DateTime.fromFormat(stringVal, "dd/MM/yyyy", { zone: "Asia/Kolkata" });
  if (dt.isValid) {
    console.log(`🔍 Debug: Parsed as dd/MM/yyyy: ${dt.toISO()}`);
    return dt.startOf("day");
  }

  const patterns = [
    // Standard formats
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

    // 2-digit year formats
    "dd/MM/yy",
    "MM/dd/yy",
    "dd-MM-yy",
    "MM-dd-yy",
    "yy-MM-dd",
    "yy/MM/dd",

    // With time formats (24-hour)
    "yyyy-MM-dd HH:mm:ss",
    "yyyy-MM-dd HH:mm",
    "dd/MM/yyyy HH:mm:ss",
    "dd/MM/yyyy HH:mm",
    "dd-MM-yyyy HH:mm:ss",
    "dd-MM-yyyy HH:mm",
    "MM/dd/yyyy HH:mm:ss",
    "MM/dd/yyyy HH:mm",

    // With time formats (12-hour with AM/PM)
    "yyyy-MM-dd hh:mm:ss a",
    "yyyy-MM-dd hh:mm a",
    "dd/MM/yyyy hh:mm:ss a",
    "dd/MM/yyyy hh:mm a",
    "dd-MM-yyyy hh:mm:ss a",
    "dd-MM-yyyy hh:mm a",
    "MM/dd/yyyy hh:mm:ss a",
    "MM/dd/yyyy hh:mm a",

    // US formats
    "MM/dd/yyyy",
    "M/d/yyyy",
    "MM-dd-yyyy",
    "M-d-yyyy",

    // Indian formats
    "dd/MM/yyyy",
    "d/M/yyyy",
    "dd-MM-yyyy",
    "d-M-yyyy",

    // Text formats
    "dd MMM yyyy",
    "dd MMMM yyyy",
    "MMM dd, yyyy",
    "MMMM dd, yyyy",
    "dd/MM/yyyy",
    "dd-MM-yyyy",

    // Additional formats
    "yyyyMMdd",
    "ddMMyyyy",
    "MMddyyyy",
    "ddMMyy",
    "MMddyy",

    // Date with timezone
    "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
    "yyyy-MM-dd'T'HH:mm:ss'Z'",
    "dd/MM/yyyy'T'HH:mm:ss.SSS'Z'",
  ];

  for (const fmt of patterns) {
    dt = DateTime.fromFormat(stringVal, fmt, { zone: "Asia/Kolkata" });
    if (dt.isValid) {
      console.log(`🔍 Debug: Parsed with format "${fmt}": ${dt.toISO()}`);
      return dt.startOf("day");
    }
  }

  // Try parsing as JavaScript Date object (before this, try our specific format)
  // First try dd-MM-yyyy hh:mm a format specifically
  const ddMmYyyyTimeMatch = stringVal.match(/^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)$/i);
  if (ddMmYyyyTimeMatch) {
    const [, day, month, year, hour, minute, ampm] = ddMmYyyyTimeMatch;
    let hour24 = parseInt(hour);
    if (ampm.toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12;
    if (ampm.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;

    try {
      const dt = DateTime.fromObject({
        year: parseInt(year),
        month: parseInt(month),
        day: parseInt(day),
        hour: hour24,
        minute: parseInt(minute)
      }, { zone: "Asia/Kolkata" });

      if (dt.isValid) {
        console.log(`🔍 Debug: Parsed as dd-MM-yyyy hh:mm a: ${dt.toISO()}`);
        return dt.startOf("day");
      }
    } catch (e) {
      console.log(`🔍 Debug: Failed to parse as dd-MM-yyyy hh:mm a`);
    }
  }

  // Try parsing as JavaScript Date object
  const jsDate = new Date(stringVal);
  if (!isNaN(jsDate.getTime())) {
    const parsed = DateTime.fromJSDate(jsDate, { zone: "Asia/Kolkata" }).startOf("day");
    console.log(`🔍 Debug: Parsed as JS Date: ${parsed.toISO()}`);
    return parsed;
  }

  // Try parsing without timezone
  dt = DateTime.fromISO(stringVal);
  if (dt.isValid) {
    console.log(`🔍 Debug: Parsed as ISO without zone: ${dt.toISO()}`);
    return dt.startOf("day");
  }

  // Try parsing as epoch time (seconds or milliseconds)
  const numericVal = Number(stringVal);
  if (!isNaN(numericVal)) {
    if (numericVal > 1e10) {
      // Likely milliseconds
      const parsed = DateTime.fromMillis(numericVal, { zone: "Asia/Kolkata" }).startOf("day");
      console.log(`🔍 Debug: Parsed as milliseconds (numeric): ${parsed.toISO()}`);
      return parsed;
    } else if (numericVal > 1e8) {
      // Likely seconds
      const parsed = DateTime.fromSeconds(numericVal, { zone: "Asia/Kolkata" }).startOf("day");
      console.log(`🔍 Debug: Parsed as seconds (numeric): ${parsed.toISO()}`);
      return parsed;
    }
  }

  // Last resort: try to extract date parts manually
  const dateMatch = stringVal.match(/(\d{1,4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,4})/);
  if (dateMatch) {
    const [, part1, part2, part3] = dateMatch;
    // Try different interpretations
    const interpretations = [
      { year: part3, month: part2, day: part1 }, // dd/MM/yyyy or dd-MM-yyyy
      { year: part3, month: part1, day: part2 }, // MM/dd/yyyy or MM-dd-yyyy
      { year: part1, month: part2, day: part3 }, // yyyy/MM/dd or yyyy-MM-dd
    ];

    for (const interp of interpretations) {
      try {
        const testDate = DateTime.fromObject(interp, { zone: "Asia/Kolkata" });
        if (testDate.isValid) {
          console.log(`🔍 Debug: Parsed manually as ${JSON.stringify(interp)}: ${testDate.toISO()}`);
          return testDate.startOf("day");
        }
      } catch (e) {
        // Continue to next interpretation
      }
    }
  }

  console.error(`❌ Failed to parse date: "${stringVal}" - tried all methods`);
  console.error(`❌ Date value details: length=${stringVal.length}, numeric=${!isNaN(Number(stringVal))}, hasLetters=${/[a-zA-Z]/.test(stringVal)}`);
  return null;
};

const completeExpiredSubscriptions = async () => {
  try {
    const nowIst = DateTime.now().setZone("Asia/Kolkata").startOf("day");

    console.log(`[${new Date().toISOString()}] Running complete expired subscriptions check`);

    const candidates = await Booking.find({
      sts: { $regex: /^subscription$/i },
      subsctiptionenddate: { $exists: true, $ne: null, $ne: "" },
      status: { $ne: "COMPLETED" }, // Only process non-completed bookings
    });

    console.log(`[${new Date().toISOString()}] Found ${candidates.length} subscription bookings to check for expiry.`);

    const bookingsToComplete = [];
    let failedParsing = 0;

    for (const b of candidates) {
      console.log(`[${new Date().toISOString()}] Checking subscription booking ${b._id}, end date: ${b.subsctiptionenddate}`);
      try {
        const endDtIst = parseEndDateIst(b.subsctiptionenddate);
        if (!endDtIst) {
          console.log(`[${new Date().toISOString()}] Failed to parse subscription end date for booking ${b._id}`);
          failedParsing++;
          continue;
        }

        // Check if subscription has expired (today or in the past)
        if (endDtIst.hasSame(nowIst, "day") || endDtIst < nowIst) {
          // Calculate days since expiry for user-friendly message - start from day after expiry
          const daysSinceExpiry = Math.abs(Math.floor(endDtIst.diff(nowIst.plus({ days: 1 }).startOf('day'), 'days').days));
          console.log(`❌ EXPIRED: ${b.vehicleNumber || 'No vehicle'} (${b._id}) - expired ${daysSinceExpiry} days ago (was: ${b.subsctiptionenddate})`);
          bookingsToComplete.push({
            ...b.toObject(), // Convert Mongoose document to plain object
            _id: b._id // Explicitly include _id
          });
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error processing subscription booking ${b._id}:`, error.message);
        failedParsing++;
      }
    }

    if (failedParsing > 0) {
      console.log(`[${new Date().toISOString()}] Failed to parse ${failedParsing} subscription end dates`);
    }

    if (bookingsToComplete.length) {
      console.log(`[${new Date().toISOString()}] Found ${bookingsToComplete.length} subscription bookings that have expired and need to be completed.`);
    }

    for (const booking of bookingsToComplete) {
      const { _id: bookingId, userid: userId, vendorId, vehicleNumber, vehicleType, personName } = booking;

      // Ensure bookingId is valid - try multiple ways to get the ID
      let finalBookingId = bookingId;
      if (!finalBookingId) {
        finalBookingId = booking._id || booking.id || booking.bookingId;
        console.log(`[${new Date().toISOString()}] Using fallback booking ID: ${finalBookingId} from keys:`, Object.keys(booking));
      }

      if (!finalBookingId) {
        console.error(`[${new Date().toISOString()}] No booking ID found in booking object:`, Object.keys(booking));
        continue;
      }

      // Update booking status and exit details
      const exitDate = nowIst.toFormat("dd-MM-yyyy");
      const exitTime = nowIst.toFormat("HH:mm");

      try {
        await Booking.updateOne(
          { _id: bookingId },
          {
            $set: {
              status: "COMPLETED",
              exitvehicledate: exitDate,
              exitvehicletime: exitTime,
            },
          }
        );
        console.log(`[${new Date().toISOString()}] Subscription booking ${finalBookingId} marked as COMPLETED. Exit date: ${exitDate}, Exit time: ${exitTime}`);

        // Send notification to user
        const title = "Subscription Expired";
        const message = `Dear ${personName || "User"}, Your ParkMyWheels subscription for vehicle ${vehicleNumber || ""} has expired on ${exitDate}. Thank you for using our service!`;

        try {
          const notif = new Notification({
            vendorId,
            userId,
            bookingId: String(finalBookingId),
            title,
            message,
            vehicleType,
            vehicleNumber,
            sts: "subscription",
            bookingtype: booking.bookType || "subscription",
            status: "info",
            notificationdtime: `${exitDate} 00:00`,
          });
          await notif.save();
          console.log(`[${new Date().toISOString()}] Expiry notification saved for subscription booking ${finalBookingId}`);
        } catch (err) {
          console.error(`[${new Date().toISOString()}] Failed saving expiry notification for subscription booking ${finalBookingId}:`, err);
        }

        // Send FCM notification
        try {
          if (!userId) {
            console.log(`[${new Date().toISOString()}] No userId found for expired subscription booking ${finalBookingId} - skipping FCM notification`);
            continue;
          }

          console.log(`[${new Date().toISOString()}] Looking up user with ID: ${userId} (type: ${typeof userId})`);

          // Try different user ID field formats
          let user = await User.findOne({ uuid: userId }, { userfcmTokens: 1, userMobile: 1 });
          if (!user) {
            user = await User.findOne({ _id: userId }, { userfcmTokens: 1, userMobile: 1 });
          }
          if (!user) {
            user = await User.findOne({ userid: userId }, { userfcmTokens: 1, userMobile: 1 });
          }

          const tokens = user?.userfcmTokens || [];
          if (tokens.length) {
            const payload = {
              notification: { title, body: message },
              android: { notification: { sound: "default", priority: "high" } },
              apns: { payload: { aps: { sound: "default" } } },
              data: {
                bookingId: String(finalBookingId),
                type: "subscription_expired",
                bookingType: "subscription"
              },
            };

            const invalidTokens = [];
            for (const token of tokens) {
              try {
                await admin.messaging().send({ ...payload, token });
                console.log(`[${new Date().toISOString()}] Expiry FCM notification sent to token for subscription booking ${finalBookingId}`);
              } catch (sendErr) {
                console.error(`[${new Date().toISOString()}] FCM send error for token ${token}:`, sendErr?.errorInfo?.code || sendErr?.message || sendErr);
                if (sendErr?.errorInfo?.code === "messaging/registration-token-not-registered") {
                  invalidTokens.push(token);
                }
              }
            }

            if (invalidTokens.length) {
              await User.updateOne({ uuid: userId }, { $pull: { userfcmTokens: { $in: invalidTokens } } });
              console.log(`[${new Date().toISOString()}] Removed invalid user FCM tokens:`, invalidTokens);
            }
          } else {
            console.log(`[${new Date().toISOString()}] No FCM tokens found for user ${userId} (subscription booking ${finalBookingId})`);
          }
        } catch (fcmErr) {
          console.error(`[${new Date().toISOString()}] Error sending expiry FCM for subscription booking ${finalBookingId}:`, fcmErr);
        }
      } catch (updateErr) {
        console.error(`[${new Date().toISOString()}] Error updating subscription booking ${finalBookingId}:`, updateErr);
      }
    }
    return { targetDate: nowIst.toISODate(), count: bookingsToComplete.length };
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error while processing expired subscriptions:`, err);
    throw err;
  }
};

// ----------------------------
// ------------------------------------------------------------------
// Cron job definition


const cancelPendingBookings = async () => {
  try {
    const now = DateTime.now().setZone("Asia/Kolkata");

    const pendingBookings = await Booking.find({ status: "PENDING" });

    console.log(
      `[${new Date().toISOString()}] Found ${pendingBookings.length} pending bookings to check`
    );

    const bookingsToCancel = [];

    for (const booking of pendingBookings) {
      if (!booking.parkingDate || !booking.parkingTime) {
        console.warn(
          `[${new Date().toISOString()}] Booking ${booking._id} missing parkingDate or parkingTime, skipping...`
        );
        continue;
      }

      // 🕒 Combine parkingDate + parkingTime properly
      // Example: "04-10-3
      // 6 02:10 PM"
      const dateStr = `${booking.parkingDate} ${booking.parkingTime}`;

      // Parse using Luxon (DD-MM-YYYY hh:mm a)
      const parkedDateTime = DateTime.fromFormat(dateStr, "dd-MM-yyyy hh:mm a", {
        zone: "Asia/Kolkata",
      });

      if (!parkedDateTime.isValid) {
        console.warn(
          `[${new Date().toISOString()}] Booking ${booking._id} invalid parkedDateTime: ${dateStr}`
        );
        continue;
      }

      // ⏰ Add 1 hour to get expiry time
      const expiryTime = parkedDateTime.plus({ hours: 1 });

      if (now > expiryTime) {
        bookingsToCancel.push(booking);
      }
    }

    console.log(
      `[${new Date().toISOString()}] Found ${bookingsToCancel.length} pending bookings older than 1 hour from parking time`
    );

    for (const booking of bookingsToCancel) {
      const nowJs = new Date();

      // Format cancel date/time
      const day = String(nowJs.getDate()).padStart(2, "0");
      const month = String(nowJs.getMonth() + 1).padStart(2, "0");
      const year = nowJs.getFullYear();
      const cancelledDate = `${day}-${month}-${year}`;

      let hours = nowJs.getHours();
      const minutes = String(nowJs.getMinutes()).padStart(2, "0");
      const seconds = String(nowJs.getSeconds()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      const cancelledTime = `${String(hours).padStart(2, "0")}:${minutes}:${seconds} ${ampm}`;

      await Booking.updateOne(
        { _id: booking._id },
        {
          $set: {
            status: "Cancelled",
            cancelledStatus: "NoShow",
            cancelledDate,
            cancelledTime,
          },
        }
      );

      console.log(
        `[${new Date().toISOString()}] Booking ${booking._id} auto-cancelled (pending > 1 hr after parking time)`
      );

      // 🔔 Optional: send notification to user
      const customer = await User.findOne({ uuid: booking.userid });
      if (customer && customer.userfcmTokens?.length > 0) {
        const token = customer.userfcmTokens[0];
        const message = {
          token,
          notification: {
            title: "Booking Cancelled",
            body: "Your booking was auto-cancelled since it remained pending more than 1 hour after the scheduled parking time.",
          },
          data: {
            bookingId: booking._id.toString(),
            status: "Cancelled",
            reason: "no_show",
          },
        };

        try {
          await admin.messaging().send(message);
          console.log(
            `[${new Date().toISOString()}] Notification sent to ${customer.userMobile} for booking ${booking._id}`
          );
        } catch (err) {
          console.error("❌ Error sending FCM notification:", err);
        }
      }
    }

    return { cancelledCount: bookingsToCancel.length };
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error cancelling unresponsive bookings:`,
      error
    );
    throw error;
  }
};



// Schedule the job to run every minute (you can adjust this frequency)
cron.schedule("* * * * *", async () => {
  console.log(`[${new Date().toISOString()}] Running pending booking cancellation check...`);
  await cancelPendingBookings();
});

console.log("Pending booking cancellation cron job scheduled.");

// ------------------------------------------------------------------
// Daily subscription reminders 
// ------------------------------------------------------------------
cron.schedule("25 15 * * *", async () => {
  console.log(`[${new Date().toISOString()}] Running daily subscription reminder check at 4:05 PM IST...`);

  try {
    await triggerSevenDaySubscriptionReminders();
    await completeExpiredSubscriptions();
    await triggerFiveDaySubscriptionReminders();
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error while processing subscription notifications:`, err);
  }
});

console.log("Daily subscription reminder cron job scheduled at 4:05 PM.");

// ------------------------------------------------------------------
// Daily subscription decrement at 11:59 PM IST
// ------------------------------------------------------------------
cron.schedule("59 23 * * *", async () => {
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
});

console.log("Subscription decrement cron job scheduled at 11:59 PM.");

// ------------------------------------------------------------------
// 7-day reminder function
// ------------------------------------------------------------------
const triggerSevenDaySubscriptionReminders = async () => {
  try {
    const nowIst = DateTime.now().setZone("Asia/Kolkata").startOf("day");

    console.log(`[${new Date().toISOString()}] Running 7-day subscription reminder check - finding subscriptions expiring within 7 days`);

    // Find subscription bookings
    const subscriptionCandidates = await Booking.find({
      bookingType: 'subscription',
      subsctiptionenddate: { $exists: true, $ne: null, $ne: "" },
    });

    console.log(`[${new Date().toISOString()}] Found ${subscriptionCandidates.length} subscription bookings for 7-day check.`);

    const bookingsExpiring = [];
    let failedParsing = 0;

    // Process subscription bookings for 7-day reminders
    for (const b of subscriptionCandidates) {
      console.log(`🔄 7-DAY CHECK: Processing ${b.vehicleNumber || 'No vehicle'} (${b._id}) - end date: ${b.subsctiptionenddate}`);
      try {
        const endDtIst = parseEndDateIst(b.subsctiptionenddate);
        if (!endDtIst) {
          console.log(`❌ 7-DAY CHECK: Failed to parse date for ${b.vehicleNumber || 'No vehicle'} (${b._id})`);
          failedParsing++;
          continue;
        }

        // Check if subscription expires within 6-7 days (7-day reminder)
        const daysUntilExpiry = Math.ceil(endDtIst.diff(nowIst, 'days').days);

        // Adjust for user-friendly "days left" calculation - start from tomorrow
        const adjustedDaysUntilExpiry = Math.max(0, Math.floor(endDtIst.diff(nowIst.plus({ days: 1 }).startOf('day'), 'days').days));

        console.log(`📊 7-DAY CHECK: ${b.vehicleNumber || 'No vehicle'} (${b._id}) - calculated ${daysUntilExpiry} days (adjusted: ${adjustedDaysUntilExpiry} days)`);

        if (adjustedDaysUntilExpiry > 5 && adjustedDaysUntilExpiry <= 7) {
          if (adjustedDaysUntilExpiry === 6) {
            console.log(`📅 6-DAY REMINDER: ${b.vehicleNumber || 'No vehicle'} (${b._id}) - exactly 6 days left (expires: ${b.subsctiptionenddate})`);
          } else if (adjustedDaysUntilExpiry === 7) {
            console.log(`📅 7-DAY REMINDER: ${b.vehicleNumber || 'No vehicle'} (${b._id}) - exactly 7 days left (expires: ${b.subsctiptionenddate})`);
          }
          bookingsExpiring.push({
            ...b.toObject(), // Convert Mongoose document to plain object
            _id: b._id, // Explicitly include _id
            daysUntilExpiry: adjustedDaysUntilExpiry,
            type: 'subscription',
            reminderType: 'subscription_expiry_7_days'
          });
        } else {
          console.log(`⏭️ 7-DAY CHECK: ${b.vehicleNumber || 'No vehicle'} (${b._id}) - ${adjustedDaysUntilExpiry} days (not in 6-7 day range)`);
        }
      } catch (error) {
        console.error(`❌ 7-DAY CHECK: Error processing ${b.vehicleNumber || 'No vehicle'} (${b._id}):`, error.message);
        failedParsing++;
      }
    }

    if (failedParsing > 0) {
      console.log(`[${new Date().toISOString()}] Failed to parse ${failedParsing} subscription dates`);
    }

    if (bookingsExpiring.length) {
      console.log(`[${new Date().toISOString()}] Found ${bookingsExpiring.length} subscription bookings expiring within 7 days.`);

      // Enhanced summary table for 7-day reminders
      console.log(`\n📋 === 7-DAY BOOKING SUMMARY ===`);
      console.log(`🚗 VEHICLE    | 📅 EXPIRES                | ⏰ DAYS | STATUS`);
      console.log(`-------------|----------------------------|---------|--------`);

      bookingsExpiring.forEach(booking => {
        const vehicleNum = booking.vehicleNumber || 'No vehicle';
        const endDate = booking.subsctiptionenddate || 'Unknown';
        const days = booking.daysUntilExpiry || 0;
        const status = days === 6 ? '6-DAY REMINDER' : '7-DAY REMINDER';
        console.log(`${vehicleNum.padEnd(12)} | ${endDate.padEnd(26)} | ${days.toString().padStart(7)} | ${status}`);
      });

      console.log(`📋 === END 7-DAY SUMMARY ===\n`);
    }

    // Process each booking requiring notification
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
        type,
        daysUntilExpiry
      } = booking;

      // Ensure bookingId is valid - try multiple ways to get the ID
      let finalBookingId = bookingId;
      if (!finalBookingId) {
        finalBookingId = booking._id || booking.id || booking.bookingId;
        console.log(`[${new Date().toISOString()}] Using fallback booking ID: ${finalBookingId} from keys:`, Object.keys(booking));
      }

      if (!finalBookingId) {
        console.error(`[${new Date().toISOString()}] No booking ID found in booking object:`, Object.keys(booking));
        continue;
      }

      // Subscription reminder for 7 days
      const title = "Subscription expiring soon";
      const endDateDisplay = parseEndDateIst(subsctiptionenddate)?.toFormat("d-MM-yyyy") || subsctiptionenddate;
      const message = `Your ParkMyWheels subscription will expire on ${endDateDisplay}. Renew now to continue uninterrupted service.`;

      try {
        const notif = new Notification({
          vendorId,
          userId,
          bookingId: String(finalBookingId),
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
        console.log(`[${new Date().toISOString()}] 7-day notification saved for subscription booking ${finalBookingId}`);
      } catch (err) {
        console.error("Failed saving 7-day notification for subscription booking", String(finalBookingId), err);
      }

      // Send FCM notification
      try {
        if (!userId) {
          console.log(`[${new Date().toISOString()}] No userId found for subscription booking ${finalBookingId} - skipping FCM notification`);
          continue;
        }

        console.log(`[${new Date().toISOString()}] Looking up user with ID: ${userId} (type: ${typeof userId})`);

        // Try different user ID field formats
        let user = await User.findOne({ uuid: userId }, { userfcmTokens: 1, userMobile: 1 });
        if (!user) {
          user = await User.findOne({ _id: userId }, { userfcmTokens: 1, userMobile: 1 });
        }
        if (!user) {
          user = await User.findOne({ userid: userId }, { userfcmTokens: 1, userMobile: 1 });
        }

        const tokens = user?.userfcmTokens || [];
        if (!tokens.length) {
          console.log(`[${new Date().toISOString()}] No FCM tokens found for user ${userId} (subscription booking ${finalBookingId})`);
          continue;
        }

        const payload = {
          notification: { title, body: message },
          android: { notification: { sound: "default", priority: "high" } },
          apns: { payload: { aps: { sound: "default" } } },
          data: {
            bookingId: String(finalBookingId),
            type: "subscription_expiry_7_days",
            bookingType: type,
            daysUntilExpiry: daysUntilExpiry.toString()
          },
        };

        const invalidTokens = [];
        for (const token of tokens) {
          try {
            await admin.messaging().send({ ...payload, token });
            console.log(`[${new Date().toISOString()}] 7-day FCM notification sent to token for subscription booking ${finalBookingId}`);
          } catch (sendErr) {
            console.error("FCM send error for token", token, sendErr?.errorInfo?.code || sendErr?.message || sendErr);
            if (sendErr?.errorInfo?.code === "messaging/registration-token-not-registered") {
              invalidTokens.push(token);
            }
          }
        }

        if (invalidTokens.length) {
          await User.updateOne({ uuid: userId }, { $pull: { userfcmTokens: { $in: invalidTokens } } });
          console.log(`[${new Date().toISOString()}] Removed invalid user FCM tokens:`, invalidTokens);
        }
      } catch (fcmErr) {
        console.error("Error sending 7-day FCM for subscription booking", String(finalBookingId), fcmErr);
      }
    }
    return { count: bookingsExpiring.length };
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error while processing 7-day subscription reminders:`, err);
    throw err;
  }
};

// ------------------------------------------------------------------
// ------------------------------------------------------------------
const triggerFiveDaySubscriptionReminders = async () => {
  try {
    const nowIst = DateTime.now().setZone("Asia/Kolkata").startOf("day");
    const fiveDaysFromNow = nowIst.plus({ days: 5 });

    console.log(`[${new Date().toISOString()}] Running 5-day subscription reminder check - finding subscriptions expiring within 5 days`);

    // Find subscription bookings
    const subscriptionCandidates = await Booking.find({
      sts: { $regex: /^subscription$/i },
      subsctiptionenddate: { $exists: true, $ne: null, $ne: "" },
    });

    // Find regular bookings that might need reminders based on parking date
    const regularCandidates = await Booking.find({
      sts: { $not: { $regex: /^subscription$/i } },
      parkingDate: { $exists: true, $ne: null, $ne: "" },
      parkingTime: { $exists: true, $ne: null, $ne: "" },
      status: { $nin: ["COMPLETED", "CANCELLED"] },
      reminderSent: { $ne: true }
    });

    console.log(`[${new Date().toISOString()}] Found ${subscriptionCandidates.length} subscription bookings and ${regularCandidates.length} regular bookings.`);

    const bookingsExpiring = [];
    let failedParsing = 0;

    // Process subscription bookings
    for (const b of subscriptionCandidates) {
      console.log(`[${new Date().toISOString()}] Checking subscription booking ${b._id}, end date: ${b.subsctiptionenddate}`);
      try {
        const endDtIst = parseEndDateIst(b.subsctiptionenddate);
        if (!endDtIst) {
          console.log(`[${new Date().toISOString()}] Failed to parse subscription end date for booking ${b._id}`);
          failedParsing++;
          continue;
        }

        // Check if subscription expires within 5 days (including today)
        const daysUntilExpiry = Math.ceil(endDtIst.diff(nowIst, 'days').days);

        // Adjust for user-friendly "days left" calculation - start from tomorrow
        const adjustedDaysUntilExpiry = Math.max(0, Math.floor(endDtIst.diff(nowIst.plus({ days: 1 }).startOf('day'), 'days').days));

        if (adjustedDaysUntilExpiry >= 0 && adjustedDaysUntilExpiry <= 5) {
          if (adjustedDaysUntilExpiry === 5) {
            console.log(`🎯 EXACT 5-DAY SUBSCRIPTION: ${b.vehicleNumber || 'No vehicle'} (${b._id}) - exactly 5 days left (expires: ${b.subsctiptionenddate})`);
          } else {
            console.log(`📅 SUBSCRIPTION: ${b.vehicleNumber || 'No vehicle'} (${b._id}) - ${adjustedDaysUntilExpiry} days left (expires: ${b.subsctiptionenddate})`);
          }
          bookingsExpiring.push({
            ...b.toObject(), // Convert Mongoose document to plain object
            _id: b._id, // Explicitly include _id
            daysUntilExpiry: adjustedDaysUntilExpiry, // Use adjusted value
            type: 'subscription',
            reminderType: 'subscription_expiry'
          });
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error processing subscription booking ${b._id}:`, error.message);
        failedParsing++;
      }
    }

    // Process regular bookings (check if parked more than 5 days ago)
    for (const b of regularCandidates) {
      console.log(`[${new Date().toISOString()}] Checking regular booking ${b._id}, parked date: ${b.parkingDate} ${b.parkingTime}`);
      try {
        const parkedDateTimeStr = `${b.parkingDate} ${b.parkingTime}`;
        const parkedDateTime = DateTime.fromFormat(parkedDateTimeStr, "dd-MM-yyyy hh:mm a", { zone: "Asia/Kolkata" });

        if (!parkedDateTime.isValid) {
          console.log(`[${new Date().toISOString()}] Failed to parse parking date for booking ${b._id}: ${parkedDateTimeStr}`);
          failedParsing++;
          continue;
        }

        const daysSinceParked = Math.floor(nowIst.diff(parkedDateTime.startOf('day'), 'days').days);

        // Adjust for user-friendly "days parked" calculation - start from day after parking
        const adjustedDaysSinceParked = Math.max(0, Math.floor(nowIst.diff(parkedDateTime.plus({ days: 1 }).startOf('day'), 'days').days));

        if (adjustedDaysSinceParked >= 5 && adjustedDaysSinceParked <= 7) {
          if (adjustedDaysSinceParked === 5) {
            console.log(`🎯 EXACT 5-DAY REGULAR: ${b.vehicleNumber || 'No vehicle'} (${b._id}) - parked exactly 5 days (since: ${b.parkingDate} ${b.parkingTime})`);
          } else {
            console.log(`🚗 REGULAR: ${b.vehicleNumber || 'No vehicle'} (${b._id}) - parked ${adjustedDaysSinceParked} days (since: ${b.parkingDate} ${b.parkingTime})`);
          }
          bookingsExpiring.push({
            ...b.toObject(), // Convert Mongoose document to plain object
            _id: b._id, // Explicitly include _id
            daysSinceParked: adjustedDaysSinceParked, // Use adjusted value
            type: 'regular',
            reminderType: 'parking_reminder'
          });
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error processing regular booking ${b._id}:`, error.message);
        failedParsing++;
      }
    }

    if (failedParsing > 0) {
      console.log(`[${new Date().toISOString()}] Failed to parse ${failedParsing} booking dates`);
    }

    if (bookingsExpiring.length) {
      console.log(`[${new Date().toISOString()}] Found ${bookingsExpiring.length} bookings requiring reminders within 5-7 days.`);
      // Group by type and days
      const byType = bookingsExpiring.reduce((acc, b) => {
        acc[b.type] = (acc[b.type] || 0) + 1;
        return acc;
      }, {});
      console.log(`[${new Date().toISOString()}] Breakdown by type:`, byType);

      // Enhanced summary table
      console.log(`\n📋 === BOOKING SUMMARY ===`);
      console.log(`🚗 VEHICLE    | 📅 DATE                    | ⏰ DAYS | TYPE`);
      console.log(`-------------|----------------------------|---------|------`);

      bookingsExpiring.forEach(booking => {
        const vehicleNum = booking.vehicleNumber || 'No vehicle';
        const bookingId = booking._id.toString().slice(-8); // Last 8 chars of ID

        if (booking.type === 'subscription') {
          const endDate = booking.subsctiptionenddate || 'Unknown';
          const days = booking.daysUntilExpiry || 0;
          console.log(`${vehicleNum.padEnd(12)} | ${endDate.padEnd(26)} | ${days.toString().padStart(7)} | SUBSCRIPTION`);
        } else {
          const parkDate = `${booking.parkingDate || ''} ${booking.parkingTime || ''}`.trim();
          const days = booking.daysSinceParked || 0;
          console.log(`${vehicleNum.padEnd(12)} | ${parkDate.padEnd(26)} | ${days.toString().padStart(7)} | REGULAR`);
        }
      });

      console.log(`📋 === END SUMMARY ===\n`);
    }

    // Process each booking requiring notification
    for (const booking of bookingsExpiring) {
      const {
        _id: bookingId,
        userid: userId,
        vendorId,
        vendorName,
        vehicleNumber,
        vehicleType,
        personName,
        mobileNumber,
        type,
        daysUntilExpiry,
        daysSinceParked
      } = booking;

      // Ensure bookingId is valid - try multiple ways to get the ID
      let finalBookingId = bookingId;
      if (!finalBookingId) {
        finalBookingId = booking._id || booking.id || booking.bookingId;
        console.log(`[${new Date().toISOString()}] Using fallback booking ID: ${finalBookingId} from keys:`, Object.keys(booking));
      }

      if (!finalBookingId) {
        console.error(`[${new Date().toISOString()}] No booking ID found in booking object:`, Object.keys(booking));
        continue;
      }

      let title, message, notificationType;

      if (type === 'subscription') {
        // Subscription reminder
        if (daysUntilExpiry === 0) {
          title = "Subscription expiring today";
          message = `Your ParkMyWheels subscription expires today. Renew now to continue uninterrupted service.`;
          notificationType = "subscription_expiry_today";
        } else if (daysUntilExpiry === 1) {
          title = "Subscription expiring tomorrow";
          message = `Your ParkMyWheels subscription expires tomorrow. Renew now to continue uninterrupted service.`;
          notificationType = "subscription_expiry_1_day";
        } else {
          title = "Subscription expiring soon";
          const endDateDisplay = parseEndDateIst(booking.subsctiptionenddate)?.toFormat("d-MM-yyyy") || booking.subsctiptionenddate;
          message = `Dear ${personName || "User"}, Your Parking subscription for ${vehicleNumber || ""} is expiring on ${endDateDisplay} at ${vendorName || "vendor"}. Renew now on ParkMyWheels app to enjoy hassle free parking.`;
          notificationType = "subscription_expiry_5_days";
        }
      } else {
        // Regular booking reminder (parked for 5+ days)
        title = "Vehicle still parked";
        message = `Your vehicle ${vehicleNumber || ""} has been parked for ${daysSinceParked} days. Please collect your vehicle or extend parking.`;
        notificationType = "parking_reminder";
      }

      try {
        const notif = new Notification({
          vendorId,
          userId,
          bookingId: String(finalBookingId),
          title,
          message,
          vehicleType,
          vehicleNumber,
          sts: booking.sts || "regular",
          bookingtype: booking.bookType || type,
          status: "info",
          notificationdtime: nowIst.toFormat("yyyy-MM-dd HH:mm"),
        });
        await notif.save();
        console.log(`[${new Date().toISOString()}] Notification saved for ${type} booking ${finalBookingId}`);

        // Mark reminder as sent for regular bookings
        if (type === 'regular') {
          await Booking.updateOne({ _id: finalBookingId }, { $set: { reminderSent: true } });
        }
      } catch (err) {
        console.error(`Failed saving notification for ${type} booking ${finalBookingId}:`, err);
      }

      // Send FCM notification
      try {
        if (!userId) {
          console.log(`[${new Date().toISOString()}] No userId found for ${type} booking ${finalBookingId} - skipping FCM notification`);
          continue;
        }

        console.log(`[${new Date().toISOString()}] Looking up user with ID: ${userId} (type: ${typeof userId})`);

        // Try different user ID field formats
        let user = await User.findOne({ uuid: userId }, { userfcmTokens: 1, userMobile: 1 });
        if (!user) {
          user = await User.findOne({ _id: userId }, { userfcmTokens: 1, userMobile: 1 });
        }
        if (!user) {
          user = await User.findOne({ userid: userId }, { userfcmTokens: 1, userMobile: 1 });
        }

        const tokens = user?.userfcmTokens || [];
        if (!tokens.length) {
          console.log(`[${new Date().toISOString()}] No FCM tokens found for user ${userId} (${type} booking ${finalBookingId})`);
          continue;
        }

        const payload = {
          notification: { title, body: message },
          android: { notification: { sound: "default", priority: "high" } },
          apns: { payload: { aps: { sound: "default" } } },
          data: {
            bookingId: String(finalBookingId),
            type: notificationType,
            bookingType: type,
            ...(type === 'subscription' ? { daysUntilExpiry: daysUntilExpiry.toString() } : { daysSinceParked: daysSinceParked.toString() })
          },
        };

        const invalidTokens = [];
        for (const token of tokens) {
          try {
            await admin.messaging().send({ ...payload, token });
            console.log(`[${new Date().toISOString()}] FCM notification sent to token for ${type} booking ${finalBookingId}`);
          } catch (sendErr) {
            console.error("FCM send error for token", token, sendErr?.errorInfo?.code || sendErr?.message || sendErr);
            if (sendErr?.errorInfo?.code === "messaging/registration-token-not-registered") {
              invalidTokens.push(token);
            }
          }
        }

        if (invalidTokens.length) {
          await User.updateOne({ uuid: userId }, { $pull: { userfcmTokens: { $in: invalidTokens } } });
          console.log(`[${new Date().toISOString()}] Removed invalid user FCM tokens:`, invalidTokens);
        }
      } catch (fcmErr) {
        console.error(`Error sending FCM for ${type} booking ${finalBookingId}:`, fcmErr);
      }

      // Send SMS reminder
      try {
        let targetMobile = mobileNumber;
        console.log(`[${new Date().toISOString()}] SMS Check for ${type} booking ${finalBookingId}:`);
        console.log(`  - mobileNumber from booking: ${mobileNumber || 'NOT FOUND'}`);
        console.log(`  - userId available: ${userId || 'NOT FOUND'}`);

        // Use mobile number directly from booking if available
        if (targetMobile) {
          console.log(`  - Using mobile number directly from booking: ${targetMobile}`);
        } else {
          // Check alternative mobile number field names in booking
          const alternativeFields = ['phoneNumber', 'phone', 'contactNumber', 'contact', 'mobile', 'phoneNo'];
          for (const field of alternativeFields) {
            if (booking[field]) {
              targetMobile = booking[field];
              console.log(`  - Found mobile in alternative field '${field}': ${targetMobile}`);
              break;
            }
          }
        }

        // If still no mobile and we have userId, try to find from User record
        if (!targetMobile && userId) {
          let user = await User.findOne({ uuid: userId }, { userMobile: 1, userPhone: 1, phone: 1, mobile: 1 });
          if (!user) {
            user = await User.findOne({ _id: userId }, { userMobile: 1, userPhone: 1, phone: 1, mobile: 1 });
          }
          if (!user) {
            user = await User.findOne({ userid: userId }, { userMobile: 1, userPhone: 1, phone: 1, mobile: 1 });
          }

          targetMobile = user?.userMobile || user?.userPhone || user?.phone || user?.mobile || "";
          console.log(`  - userMobile/userPhone/phone/mobile from User record: ${targetMobile || 'NOT FOUND'}`);
        }

        // Last attempt: check if booking has direct mobile fields
        if (!targetMobile) {
          const directFields = ['userPhone', 'userMobile', 'phone', 'phoneNumber', 'mobileNo', 'contactNo'];
          for (const field of directFields) {
            if (booking[field]) {
              targetMobile = booking[field];
              console.log(`  - Found mobile in booking field '${field}': ${targetMobile}`);
              break;
            }
          }
        }

        if (targetMobile) {
          let cleanedMobile = String(targetMobile).replace(/[^0-9]/g, "");
          if (cleanedMobile.length === 10) cleanedMobile = "91" + cleanedMobile;

          console.log(`  - Final mobile number: ${cleanedMobile}`);
          console.log(`  - SMS Text: "${message}"`);

          const smsText = message;
          const dltTemplateId = process.env.VISPL_TEMPLATE_ID_REMINDER || "YOUR_REMINDER_TEMPLATE_ID";

          const smsParams = {
            username: process.env.VISPL_USERNAME || "Vayusutha.trans",
            password: process.env.VISPL_PASSWORD || "pdizP",
            unicode: "false",
            from: process.env.VISPL_SENDER_ID || "PRMYWH",
            to: cleanedMobile,
            text: smsText,
            dltContentId: dltTemplateId,
          };

          const smsResponse = await axios.get("https://pgapi.vispl.in/fe/api/v1/send", {
            params: smsParams,
            paramsSerializer: (params) => qs.stringify(params, { encode: true }),
          });

          const smsStatus = smsResponse.data.STATUS || smsResponse.data.status || smsResponse.data.statusCode;
          const isSuccess = smsStatus === "SUCCESS" || smsStatus === 200 || smsStatus === 2000;

          console.log(`  - SMS API Response Status: ${smsStatus}`);
          console.log(`  - SMS API Response Data:`, smsResponse.data);

          if (!isSuccess) {
            console.warn(`❌ SMS failed to send for ${type} booking ${finalBookingId}:`, smsResponse.data);
            console.warn(`   API Response: ${JSON.stringify(smsResponse.data)}`);
            booking.smsFailed = true;
          } else {
            console.log(`✅ 5-DAY SMS SENT: ${vehicleNumber || 'No vehicle'} (${finalBookingId}) - ${type} reminder sent to ${cleanedMobile}`);
            console.log(`   SMS Text: "${message}"`);
            console.log(`   Mobile: ${cleanedMobile} | Days: ${type === 'subscription' ? daysUntilExpiry : daysSinceParked}`);
            console.log(`   API Response: ${JSON.stringify(smsResponse.data)}`);
            booking.smsSent = true;
            booking.smsMobile = cleanedMobile;
          }
        } else {
          console.warn(`⚠️ 5-DAY SMS NOT SENT: ${vehicleNumber || 'No vehicle'} (${finalBookingId}) - No mobile number found`);
          console.warn(`   Type: ${type} | Days: ${type === 'subscription' ? (daysUntilExpiry || 'N/A') : (daysSinceParked || 'N/A')}`);
          console.warn(`   All booking fields: ${Object.keys(booking).join(', ')}`);
          booking.smsFailed = true;
        }
      } catch (smsOuterErr) {
        console.error(`Error preparing SMS for ${type} booking ${finalBookingId}:`, smsOuterErr);
        booking.smsFailed = true;
      }
    }

    // Summary of SMS sending results
    console.log(`\n📱 === 5-DAY SMS SUMMARY ===`);
    console.log(`📊 Total bookings processed: ${bookingsExpiring.length}`);
    console.log(`✅ SMS sent: ${bookingsExpiring.filter(b => b.smsSent).length || 0}`);
    console.log(`❌ SMS failed (no mobile): ${bookingsExpiring.filter(b => b.smsFailed).length || 0}`);

    // Show details of successful SMS
    const successfulSMS = bookingsExpiring.filter(b => b.smsSent);
    if (successfulSMS.length > 0) {
      console.log(`\n📱 SMS Successfully Sent To:`);
      successfulSMS.forEach(booking => {
        const mobile = booking.smsMobile || 'Unknown';
        const vehicle = booking.vehicleNumber || 'No vehicle';
        const days = booking.type === 'subscription' ? booking.daysUntilExpiry : booking.daysSinceParked;
        console.log(`  ✅ ${vehicle} → ${mobile} (${days} days, ${booking.type})`);
      });
    }

    // Show details of failed SMS
    const failedSMS = bookingsExpiring.filter(b => b.smsFailed);
    if (failedSMS.length > 0) {
      console.log(`\n❌ SMS Failed (No Mobile):`);
      failedSMS.forEach(booking => {
        const vehicle = booking.vehicleNumber || 'No vehicle';
        const days = booking.type === 'subscription' ? (booking.daysUntilExpiry || 'N/A') : (booking.daysSinceParked || 'N/A');
        console.log(`  ❌ ${vehicle} (${days} days, ${booking.type}) - No mobile number found`);
      });
    }

    console.log(`📋 === END SMS SUMMARY ===\n`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error while processing 5-day subscription reminders:`, err);
    throw err;
  }
};
