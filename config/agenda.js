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

  // Try parsing as JavaScript Date object (before this, try our specific format)
  // First try dd-MM-yyyy hh:mm a format specifically (for user's format)
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

  // Also try with seconds
  const ddMmYyyyTimeWithSecondsMatch = stringVal.match(/^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)$/i);
  if (ddMmYyyyTimeWithSecondsMatch) {
    const [, day, month, year, hour, minute, second, ampm] = ddMmYyyyTimeWithSecondsMatch;
    let hour24 = parseInt(hour);
    if (ampm.toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12;
    if (ampm.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;

    try {
      const dt = DateTime.fromObject({
        year: parseInt(year),
        month: parseInt(month),
        day: parseInt(day),
        hour: hour24,
        minute: parseInt(minute),
        second: parseInt(second)
      }, { zone: "Asia/Kolkata" });

      if (dt.isValid) {
        console.log(`🔍 Debug: Parsed as dd-MM-yyyy hh:mm:ss a: ${dt.toISO()}`);
        return dt.startOf("day");
      }
    } catch (e) {
      console.log(`🔍 Debug: Failed to parse as dd-MM-yyyy hh:mm:ss a`);
    }
  }

  for (const fmt of patterns) {
    dt = DateTime.fromFormat(stringVal, fmt, { zone: "Asia/Kolkata" });
    if (dt.isValid) {
      console.log(`🔍 Debug: Parsed with format "${fmt}": ${dt.toISO()}`);
      return dt.startOf("day");
    }
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
};// ------------------------------------------------------------------
// Daily subscription reminders at 3:50 PM IST
cron.schedule("50 15 * * *", async () => {
  console.log(`[${new Date().toISOString()}] Running daily subscription reminder check at 3:50 PM IST...`);

  try {
    await triggerSevenDaySubscriptionReminders();
    await completeExpiredSubscriptions();
    await triggerFiveDaySubscriptionReminders();
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error while processing subscription notifications:`, err);
  }
});

console.log("Daily subscription reminder cron job scheduled at 4:05 PM.");

// ... (rest of the code remains the same)

// ------------------------------------------------------------------
// 7-day reminder function
// ------------------------------------------------------------------
const triggerSevenDaySubscriptionReminders = async () => {
  try {
    const nowIst = DateTime.now().setZone("Asia/Kolkata").startOf("day");

    console.log(`[${new Date().toISOString()}] Running 7-day subscription reminder check - finding subscriptions expiring within 7 days`);

    // Find subscription bookings
    const subscriptionCandidates = await Booking.find({
      sts: { $regex: /^subscription$/i },
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

        if (adjustedDaysUntilExpiry >= 6 && adjustedDaysUntilExpiry <= 7) {
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

    console.log(`[${new Date().toISOString()}] Running 5-day subscription reminder check - finding subscriptions expiring within 5 days`);

    // Find subscription bookings (try multiple field variations)
    const subscriptionCandidates = await Booking.find({
      $or: [
        { sts: { $regex: /^subscription$/i } },
        { bookingType: { $regex: /^subscription$/i } },
        { status: { $regex: /^subscription$/i } }
      ],
      subsctiptionenddate: { $exists: true, $ne: null, $ne: "" },
    });

    console.log(`[${new Date().toISOString()}] Found ${subscriptionCandidates.length} subscription bookings for 5-day check.`);

    // Debug: Log all found bookings
    subscriptionCandidates.forEach(b => {
      console.log(`   📋 Found: ${b.vehicleNumber} (${b._id}) - STS: "${b.sts}" - End: "${b.subsctiptionenddate}" - Mobile: "${b.mobileNumber}"`);
    });

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

        // Check if subscription expires within 6 days (5-day reminder threshold)
        const daysUntilExpiry = Math.ceil(endDtIst.diff(nowIst, 'days').days);

        // Debug: Log the exact calculation
        console.log(`🔢 DAYS CALCULATION: ${b.vehicleNumber || 'No vehicle'} (${b._id}) - raw days: ${daysUntilExpiry}, end: ${endDtIst.toISO()}, now: ${nowIst.toISO()}`);

        // Send reminder when 6 days or less remain (5-day reminder threshold)
        if (daysUntilExpiry <= 6 && daysUntilExpiry > 0) {
          console.log(`🎯 5-DAY SUBSCRIPTION: ${b.vehicleNumber || 'No vehicle'} (${b._id}) - ${daysUntilExpiry} days left (expires: ${b.subsctiptionenddate})`);

          // Enhanced mobile number detection
          let mobileNumber = b.mobileNumber;
          let userId = b.userid;

          console.log(`📱 MOBILE CHECK: ${b.vehicleNumber || 'No vehicle'} (${b._id})`);
          console.log(`   - Direct mobile: ${mobileNumber || 'NOT FOUND'}`);
          console.log(`   - User ID: ${userId || 'NOT FOUND'}`);

          // If no direct mobile, try to find from user record
          if (!mobileNumber && userId) {
            console.log(`   - Looking up user record for mobile...`);
            let user = await User.findOne({ uuid: userId }, { userMobile: 1, userPhone: 1, phone: 1, mobile: 1 });
            if (!user) {
              user = await User.findOne({ _id: userId }, { userMobile: 1, userPhone: 1, phone: 1, mobile: 1 });
            }
            if (!user) {
              user = await User.findOne({ userid: userId }, { userMobile: 1, userPhone: 1, phone: 1, mobile: 1 });
            }

            if (user) {
              mobileNumber = user.userMobile || user.userPhone || user.phone || user.mobile;
              console.log(`   - Found mobile from user: ${mobileNumber || 'NOT FOUND'}`);
            }
          }

          // Check alternative mobile fields in booking
          if (!mobileNumber) {
            const altFields = ['phoneNumber', 'phone', 'contactNumber', 'contact', 'mobile', 'userPhone', 'userMobile'];
            for (const field of altFields) {
              if (b[field]) {
                mobileNumber = b[field];
                console.log(`   - Found mobile in field '${field}': ${mobileNumber}`);
                break;
              }
            }
          }

          bookingsExpiring.push({
            ...b.toObject(),
            _id: b._id,
            daysUntilExpiry: daysUntilExpiry,
            mobileNumber: mobileNumber, // Store the found mobile number
            userId: userId,
            type: 'subscription',
            reminderType: 'subscription_expiry_5_days'
          });
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error processing subscription booking ${b._id}:`, error.message);
        failedParsing++;
      }
    }

    if (failedParsing > 0) {
      console.log(`[${new Date().toISOString()}] Failed to parse ${failedParsing} subscription dates`);
    }

    if (bookingsExpiring.length) {
      console.log(`[${new Date().toISOString()}] Found ${bookingsExpiring.length} 5-day subscription reminders to process.`);

      // Enhanced summary
      console.log(`\n📋 === 5-DAY SUBSCRIPTION SUMMARY ===`);
      console.log(`🚗 VEHICLE    | 📅 EXPIRES                | 📱 MOBILE        | ⏰ DAYS | STATUS`);
      console.log(`-------------|----------------------------|------------------|---------|--------`);

      bookingsExpiring.forEach(booking => {
        const vehicleNum = booking.vehicleNumber || 'No vehicle';
        const endDate = booking.subsctiptionenddate || 'Unknown';
        const mobile = booking.mobileNumber ? `${booking.mobileNumber.substring(0, 10)}...` : 'NO MOBILE';
        const days = booking.daysUntilExpiry || 0;
        const status = booking.mobileNumber ? 'READY FOR SMS' : 'NO SMS - NO MOBILE';
        console.log(`${vehicleNum.padEnd(12)} | ${endDate.padEnd(26)} | ${mobile.padEnd(16)} | ${days.toString().padStart(7)} | ${status}`);
      });
      console.log(`📋 === END 5-DAY SUMMARY ===\n`);
    }

    // Process SMS for 5-day reminders
    let smsSentCount = 0;
    let smsFailedCount = 0;

    for (const booking of bookingsExpiring) {
      const {
        _id: bookingId,
        vehicleNumber,
        mobileNumber,
        personName,
        vendorName,
        subsctiptionenddate,
        daysUntilExpiry
      } = booking;

      if (!mobileNumber) {
        console.log(`❌ SKIPPING SMS: ${vehicleNumber || 'No vehicle'} (${bookingId}) - No mobile number found`);
        smsFailedCount++;
        continue;
      }

      // Send SMS for 5-day reminder
      try {
        const endDateDisplay = parseEndDateIst(subsctiptionenddate)?.toFormat("d-MM-yyyy") || subsctiptionenddate;
        const message = `Dear ${personName || "User"}, Your Parking subscription for ${vehicleNumber || ""} is expiring on ${endDateDisplay}. Renew now on ParkMyWheels app to enjoy hassle free parking.`;

        // Format mobile number to match working API call (without country code)
        let cleanedMobile = String(mobileNumber).replace(/[^0-9]/g, "");
        console.log(`📱 SENDING SMS: ${vehicleNumber || 'No vehicle'} (${bookingId})`);
        console.log(`   - Mobile: ${cleanedMobile} (matching working API format)`);
        console.log(`   - Days: ${daysUntilExpiry}`);
        console.log(`   - Message: "${message}"`);

        const dltTemplateId = "1007408523316568326"; // Exact working template ID

        const smsParams = {
          username: process.env.VISPL_USERNAME || "Vayusutha.trans",
          password: process.env.VISPL_PASSWORD || "pdizP",
          unicode: "false",
          from: process.env.VISPL_SENDER_ID || "PRMYWH",
          to: cleanedMobile, // Without country code to match working URL
          text: message,
          dltContentId: dltTemplateId,
        };

        const smsResponse = await axios.get("https://pgapi.vispl.in/fe/api/v1/send", {
          params: smsParams,
          paramsSerializer: (params) => qs.stringify(params, { encode: true }),
        });

        const smsStatus = smsResponse.data.STATUS || smsResponse.data.status || smsResponse.data.statusCode;
        const isSuccess = smsStatus === "SUCCESS" || smsStatus === 200 || smsStatus === 2000;

        console.log(`   - SMS API Response Status: ${smsStatus}`);
        console.log(`   - SMS API Response Data:`, smsResponse.data);

        if (isSuccess) {
          console.log(`✅ 5-DAY SMS SENT: ${vehicleNumber || 'No vehicle'} (${bookingId}) to ${cleanedMobile}`);
          console.log(`   Transaction ID: ${smsResponse.data.transactionId}`);
          smsSentCount++;

          // Save notification
          try {
            const notif = new Notification({
              vendorId: booking.vendorId,
              userId: booking.userId,
              bookingId: String(bookingId),
              title: "Subscription expiring in 5 days",
              message: message,
              vehicleType: booking.vehicleType,
              vehicleNumber: vehicleNumber,
              sts: "subscription",
              bookingtype: "subscription",
              status: "info",
              notificationdtime: nowIst.toFormat("yyyy-MM-dd HH:mm"),
            });
            await notif.save();
            console.log(`   - Notification saved for ${vehicleNumber}`);
          } catch (notifErr) {
            console.error(`   - Failed to save notification:`, notifErr);
          }
        } else {
          console.warn(`❌ SMS FAILED: ${vehicleNumber || 'No vehicle'} (${bookingId}) - API returned error`);
          console.warn(`   API Response: ${JSON.stringify(smsResponse.data)}`);
          smsFailedCount++;
        }
      } catch (smsErr) {
        console.error(`❌ SMS ERROR: ${vehicleNumber || 'No vehicle'} (${bookingId}) -`, smsErr.message);
        smsFailedCount++;
      }
    }

    // Final summary
    console.log(`\n📊 === 5-DAY SMS FINAL SUMMARY ===`);
    console.log(`✅ Successfully sent: ${smsSentCount}`);
    console.log(`❌ Failed (no mobile/error): ${smsFailedCount}`);
    console.log(`📋 Total 5-day subscriptions: ${bookingsExpiring.length}`);
    console.log(`📋 === END FINAL SUMMARY ===\n`);

    return {
      count: bookingsExpiring.length,
      smsSent: smsSentCount,
      smsFailed: smsFailedCount
    };
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error while processing 5-day subscription reminders:`, err);
    throw err;
  }
};

const cancelPendingBookings = async () => {
  try {
    const now = DateTime.now().setZone("Asia/Kolkata");

    // Find both PENDING and APPROVED bookings that need to be checked
    const bookingsToCheck = await Booking.find({
      $or: [
        { status: "PENDING" },
        { status: "APPROVED" }
      ]
    });

    console.log(`[${new Date().toISOString()}] Found ${bookingsToCheck.length} bookings to check`);

    const bookingsToCancel = [];

    for (const booking of bookingsToCheck) {
      if (!booking.parkingDate || !booking.parkingTime) {
        console.warn(`[${new Date().toISOString()}] Booking ${booking._id} missing parkingDate or parkingTime, skipping...`);
        continue;
      }

      const dateStr = `${booking.parkingDate} ${booking.parkingTime}`;
      const parkedDateTime = DateTime.fromFormat(dateStr, "dd-MM-yyyy hh:mm a", { zone: "Asia/Kolkata" });

      if (!parkedDateTime.isValid) {
        console.warn(`[${new Date().toISOString()}] Booking ${booking._id} invalid parkedDateTime: ${dateStr}`);
        continue;
      }

      // For PENDING bookings, check if it's been more than 1 hour
      if (booking.status === "PENDING") {
        const expiryTime = parkedDateTime.plus({ hours: 1 });
        if (now > expiryTime) {
          bookingsToCancel.push({
            ...booking.toObject(),
            cancellationReason: "Auto-cancelled: No action taken within 1 hour of booking"
          });
        }
      }
      
      // For APPROVED bookings, check if it's been more than 10 minutes past scheduled time
      if (booking.status === "APPROVED") {
        const expiryTime = parkedDateTime.plus({ minutes: 10 });
        if (now > expiryTime) {
          bookingsToCancel.push({
            ...booking.toObject(),
            cancellationReason: "Auto-cancelled: No show within 10 minutes of scheduled time"
          });
        }
      }
    }

    console.log(`[${new Date().toISOString()}] Found ${bookingsToCancel.length} bookings to cancel (${bookingsToCheck.filter(b => b.status === 'PENDING').length} pending, ${bookingsToCheck.filter(b => b.status === 'APPROVED').length} approved)`);

    for (const booking of bookingsToCancel) {
      const nowJs = new Date();
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

      // First update the booking status to cancelled
      await Booking.updateOne(
        { _id: booking._id },
        {
          $set: {
            status: "Cancelled",
            cancelledStatus: "NoShow",
            cancelledDate,
            cancelledTime,
            cancellationReason: booking.cancellationReason || "Auto-cancelled due to no show",
            cancelledBy: "system"
          },
        }
      );

      console.log(`[${new Date().toISOString()}] Booking ${booking._id} auto-cancelled: ${booking.cancellationReason}`);

      // Send notification to customer
      const customer = await User.findOne({ uuid: booking.userid });
      if (customer && customer.userfcmTokens?.length > 0) {
        const customerToken = customer.userfcmTokens[0];
        const customerMessage = {
          token: customerToken,
          notification: {
            title: "Customer No-show",
            body: `You missed your parking window at ${booking.vendorName || 'Parking Location'}. Let us know if this was an error.`,
          },
          data: {
            bookingId: booking._id.toString(),
            status: "Cancelled",
            reason: "no_show",
            type: "customer_notification"
          },
        };

        try {
          await admin.messaging().send(customerMessage);
          console.log(`[${new Date().toISOString()}] No-show notification sent to customer ${customer.userMobile}`);
        } catch (err) {
          console.error(`[${new Date().toISOString()}] Error sending notification to customer:`, err);
        }
      }

      // Send notification to vendor if this was an approved booking
      if (booking.status === 'APPROVED' && booking.vendorId) {
        try {
          const vendor = await Vendor.findById(booking.vendorId);
          if (vendor && Array.isArray(vendor.fcmTokens) && vendor.fcmTokens.length > 0) {
            const vendorMessage = {
              notification: {
                title: "Vendor Alert - Customer No-show",
                body: `The customer hasn't arrived for the booking scheduled at ${booking.parkingTime}.`,
              },
              data: {
                bookingId: booking._id.toString(),
                status: "Cancelled",
                reason: "customer_no_show",
                type: "vendor_notification",
                vendorAlert: "true"
              },
            };

            // Send to all vendor's devices
            const sendPromises = vendor.fcmTokens.map(token => {
              if (token) {
                return admin.messaging().send({
                  ...vendorMessage,
                  token: token
                }).catch(err => {
                  console.error(`[${new Date().toISOString()}] Error sending to vendor device:`, err);
                  return null;
                });
              }
              return Promise.resolve();
            });

            await Promise.all(sendPromises);
            console.log(`[${new Date().toISOString()}] No-show notifications sent to ${vendor.fcmTokens.length} device(s) for vendor ${vendor.businessName || vendor._id}`);
          }
        } catch (err) {
          console.error(`[${new Date().toISOString()}] Error sending notification to vendor:`, err);
        }
      }
    }

    return { cancelledCount: bookingsToCancel.length };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error cancelling unresponsive bookings:`, error);
    throw error;
  }
};

// Schedule the job to run every minute
cron.schedule("* * * * *", async () => {
  console.log(`[${new Date().toISOString()}] Running pending booking cancellation check...`);
  await cancelPendingBookings();
});

console.log("Pending booking cancellation cron job scheduled.");

// Daily subscription reminders at 3:50 PM IST
cron.schedule("50 15 * * *", async () => {
  console.log(`[${new Date().toISOString()}] Running daily subscription reminder check at 3:50 PM IST...`);

  try {
    await triggerSevenDaySubscriptionReminders();
    await completeExpiredSubscriptions();
    await triggerFiveDaySubscriptionReminders();
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error while processing subscription notifications:`, err);
  }
});

console.log("Daily subscription reminder cron job scheduled at 3:50 PM IST.");

// Daily subscription decrement at 11:59 PM IST
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

const getSubscriptionReport = async () => {
  try {
    console.log(`[${new Date().toISOString()}] Generating subscription report...`);

    // Find all subscription bookings
    const subscriptionBookings = await Booking.find({
      sts: { $regex: /^subscription$/i },
      subsctiptionenddate: { $exists: true, $ne: null, $ne: "" },
    });

    console.log(`📋 Found ${subscriptionBookings.length} subscription bookings`);

    const report = [];

    for (const booking of subscriptionBookings) {
      try {
        // Parse the end date
        const endDtIst = parseEndDateIst(booking.subsctiptionenddate);
        if (!endDtIst) {
          console.log(`❌ Failed to parse end date for ${booking.vehicleNumber} (${booking._id})`);
          continue;
        }

        // Calculate days left
        const nowIst = DateTime.now().setZone("Asia/Kolkata").startOf("day");
        const daysLeft = Math.ceil(endDtIst.diff(nowIst, 'days').days);

        // Get mobile number (enhanced detection)
        let mobileNumber = booking.mobileNumber;
        let userId = booking.userid;

        // If no direct mobile, try to find from user record
        if (!mobileNumber && userId) {
          let user = await User.findOne({ uuid: userId }, { userMobile: 1, userPhone: 1, phone: 1, mobile: 1 });
          if (!user) {
            user = await User.findOne({ _id: userId }, { userMobile: 1, userPhone: 1, phone: 1, mobile: 1 });
          }
          if (!user) {
            user = await User.findOne({ userid: userId }, { userMobile: 1, userPhone: 1, phone: 1, mobile: 1 });
          }

          if (user) {
            mobileNumber = user.userMobile || user.userPhone || user.phone || user.mobile;
          }
        }

        // Check alternative mobile fields in booking
        if (!mobileNumber) {
          const altFields = ['phoneNumber', 'phone', 'contactNumber', 'contact', 'mobile', 'userPhone', 'userMobile'];
          for (const field of altFields) {
            if (booking[field]) {
              mobileNumber = booking[field];
              break;
            }
          }
        }

        // Calculate parking date (start date)
        let parkingDate = booking.parkingDate || booking.bookingDate;
        if (booking.createdAt) {
          const createdDate = new Date(booking.createdAt);
          if (!parkingDate) {
            parkingDate = createdDate.toLocaleDateString('en-IN');
          }
        }

        const reportItem = {
          _id: booking._id,
          vehicleNumber: booking.vehicleNumber || 'No vehicle',
          parkingDate: parkingDate || 'Unknown',
          exitDate: booking.subsctiptionenddate,
          daysLeft: daysLeft,
          mobileNumber: mobileNumber || 'No mobile',
          status: booking.status,
          sts: booking.sts,
          personName: booking.personName || 'No name',
          vendorName: booking.vendorName || 'No vendor'
        };

        report.push(reportItem);

      } catch (error) {
        console.error(`❌ Error processing booking ${booking._id}:`, error.message);
      }
    }

    // Sort by days left (ascending - most urgent first)
    report.sort((a, b) => a.daysLeft - b.daysLeft);

    // Display the report
    console.log(`\n📊 === SUBSCRIPTION REPORT ===`);
    console.log(`🚗 VEHICLE    | 📅 START      | 📅 EXPIRES    | ⏰ DAYS | 📱 MOBILE        | 👤 NAME      | 🏢 VENDOR`);
    console.log(`-------------|---------------|---------------|---------|------------------|--------------|-----------`);

    report.forEach(item => {
      const vehicleNum = item.vehicleNumber.padEnd(12);
      const startDate = item.parkingDate.padEnd(13);
      const endDate = item.exitDate.padEnd(13);
      const days = item.daysLeft.toString().padStart(7);
      const mobile = item.mobileNumber ? item.mobileNumber.substring(0, 16).padEnd(16) : 'NO MOBILE'.padEnd(16);
      const name = item.personName.substring(0, 12).padEnd(12);
      const vendor = item.vendorName.substring(0, 10).padEnd(10);

      const statusIndicator = item.daysLeft <= 0 ? '❌' :
                             item.daysLeft <= 2 ? '🚨' :
                             item.daysLeft <= 5 ? '⚠️' : '✅';

      console.log(`${vehicleNum} | ${startDate} | ${endDate} | ${days} | ${mobile} | ${name} | ${vendor} ${statusIndicator}`);
    });

    // Summary
    const urgent = report.filter(item => item.daysLeft <= 2).length;
    const soon = report.filter(item => item.daysLeft > 2 && item.daysLeft <= 5).length;
    const normal = report.filter(item => item.daysLeft > 5).length;
    const noMobile = report.filter(item => !item.mobileNumber || item.mobileNumber === 'No mobile').length;

    console.log(`\n📋 === SUMMARY ===`);
    console.log(`🚨 Urgent (≤2 days): ${urgent}`);
    console.log(`⚠️  Soon (3-5 days): ${soon}`);
    console.log(`✅ Normal (>5 days): ${normal}`);
    console.log(`📱 No mobile: ${noMobile}`);
    console.log(`📊 Total subscriptions: ${report.length}`);
    console.log(`📋 === END REPORT ===\n`);

    return report;

  } catch (error) {
    console.error(`❌ Error generating subscription report:`, error);
    throw error;
  }
};

module.exports = {
  triggerFiveDaySubscriptionReminders,
  triggerSevenDaySubscriptionReminders,
  completeExpiredSubscriptions,
  cancelPendingBookings,
  getSubscriptionReport
};
