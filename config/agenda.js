import cron from 'node-cron';  // Import node-cron
import mongoose from 'mongoose';
import Vendor from '../models/venderSchema.js';
import Booking from '../models/bookingSchema.js';
import Notification from '../models/notificationschema.js';
import User from '../models/userModel.js';
import admin from './firebaseAdmin.js';
import axios from 'axios';
import qs from 'qs';
import { DateTime } from 'luxon';
import dbConnect from './dbConnect.js';

dbConnect();

// Reusable date parser: normalizes various input formats to Luxon DateTime in IST at start of day
function parseEndDateIst(value) {
  if (!value) return null;
  const stringVal = String(value).trim();

  // Epoch milliseconds or seconds
  if (/^\d{13}$/.test(stringVal)) {
    return DateTime.fromMillis(Number(stringVal), { zone: 'Asia/Kolkata' }).startOf('day');
  }
  if (/^\d{10}$/.test(stringVal)) {
    return DateTime.fromSeconds(Number(stringVal), { zone: 'Asia/Kolkata' }).startOf('day');
  }

  // Try ISO
  let dt = DateTime.fromISO(stringVal, { zone: 'Asia/Kolkata' });
  if (dt.isValid) return dt.startOf('day');

  // Try multiple common patterns
  const patterns = [
    'yyyy-MM-dd',
    'yyyy/MM/dd',
    'dd/MM/yyyy',
    'MM/dd/yyyy',
    'dd-MM-yyyy',
    'MM-dd-yyyy',
    'd/M/yyyy',
    'M/d/yyyy',
    'dd LLL yyyy',           // 05 Jan 2025
    'LLL dd, yyyy',          // Jan 05, 2025
    'ccc, dd LLL yyyy',     // Sun, 05 Jan 2025
    'dd LLLL yyyy',          // 05 January 2025
  ];
  for (const fmt of patterns) {
    dt = DateTime.fromFormat(stringVal, fmt, { zone: 'Asia/Kolkata' });
    if (dt.isValid) return dt.startOf('day');
  }

  // Fallback: native Date
  const jsDate = new Date(stringVal);
  if (!isNaN(jsDate.getTime())) {
    return DateTime.fromJSDate(jsDate, { zone: 'Asia/Kolkata' }).startOf('day');
  }
  return null;
}

// Cron job definition
cron.schedule("59 23 * * *", async () => {  
  console.log(`[${new Date().toISOString()}] Running subscription decrement job...`);

  try {
    const vendors = await Vendor.find({ subscription: 'true', subscriptionleft: { $gt: 0 } });

    console.log(`Found ${vendors.length} vendors with active subscriptions.`);

    for (const vendor of vendors) {
      console.log(`[${new Date().toISOString()}] Processing vendor: ${vendor._id} | Subscription left: ${vendor.subscriptionleft}`);

      // Decrease subscription days
      vendor.subscriptionleft -= 1; 

      // If subscription left is 0, set subscription to false
      if (vendor.subscriptionleft === 0) {
        vendor.subscription = 'false';
        console.log(`[${new Date().toISOString()}] Vendor ${vendor._id} subscription expired. Subscription set to false.`);
      }

      // Save updated vendor
      await vendor.save();
      
      // Log the updated details for the vendor
      console.log(`[${new Date().toISOString()}] Vendor ${vendor._id} | Updated Days left: ${vendor.subscriptionleft} | Subscription: ${vendor.subscription}`);
    }

    console.log('All subscription days updated successfully.');
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

console.log('Cron job scheduled.');  // To confirm that the job is scheduled

// ------------------------------------------------------------------
// 7-day reminder function
// ------------------------------------------------------------------
async function triggerSevenDaySubscriptionReminders() {
  try {
    const nowIst = DateTime.now().setZone('Asia/Kolkata').startOf('day');
    const targetIst = nowIst.plus({ days: 7 });

    const candidates = await Booking.find({
      sts: { $regex: /^subscription$/i },
      subsctiptionenddate: { $exists: true, $ne: null, $ne: '' },
    });

    const bookingsExpiring = [];
    for (const b of candidates) {
      const endDtIst = parseEndDateIst(b.subsctiptionenddate);
      if (!endDtIst) continue;
      if (endDtIst.hasSame(targetIst, 'day')) bookingsExpiring.push(b);
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
        mobileNumber,
      } = booking;

      const title = 'Subscription expiring soon';
      const endDateDisplay = parseEndDateIst(subsctiptionenddate)?.toFormat('d-MM-yyyy') || subsctiptionenddate;
      const message = `Your ParkMyWheels subscription will expire on ${endDateDisplay}. Renew now to continue uninterrupted service.`;

      // Save to Notification collection
      try {
        const notif = new Notification({
          vendorId,
          userId,
          bookingId: String(bookingId),
          title,
          message,
          vehicleType,
          vehicleNumber,
          sts: 'subscription',
          bookingtype: booking.bookType || 'subscription',
          status: 'info',
          notificationdtime: `${subsctiptionenddate} 00:00`,
        });
        await notif.save();
      } catch (err) {
        console.error('Failed saving notification for booking', String(bookingId), err);
      }

      // Send FCM to user (by uuid -> userfcmTokens)
      try {
        const user = await User.findOne({ uuid: userId }, { userfcmTokens: 1 });
        const tokens = user?.userfcmTokens || [];
        if (!tokens.length) continue;

        const payload = {
          notification: {
            title,
            body: message,
          },
          android: { notification: { sound: 'default', priority: 'high' } },
          apns: { payload: { aps: { sound: 'default' } } },
          data: {
            bookingId: String(bookingId),
            type: 'subscription_expiry_7_days',
          },
        };

        const invalidTokens = [];
        for (const token of tokens) {
          try {
            await admin.messaging().send({ ...payload, token });
          } catch (sendErr) {
            console.error('FCM send error for token', token, sendErr?.errorInfo?.code || sendErr?.message || sendErr);
            if (sendErr?.errorInfo?.code === 'messaging/registration-token-not-registered') {
              invalidTokens.push(token);
            }
          }
        }

        if (invalidTokens.length) {
          await User.updateOne(
            { uuid: userId },
            { $pull: { userfcmTokens: { $in: invalidTokens } } }
          );
          console.log('Removed invalid user FCM tokens:', invalidTokens);
        }
      } catch (fcmErr) {
        console.error('Error while sending FCM for booking', String(bookingId), fcmErr);
      }

      // (Optional) Add SMS logic here if needed, similar to 5-day reminder
    }
    return { targetDate: targetIst.toISODate(), count: bookingsExpiring.length };
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error while processing 7-days-left subscription notifications:`, err);
    throw err;
  }
}

// ------------------------------------------------------------------
// 5-day reminder function (existing)
// ------------------------------------------------------------------
async function triggerFiveDaySubscriptionReminders() {
  // Find bookings with 5 days left (normalize arbitrary date formats)
  // Comparison is done at Asia/Kolkata 00:00 (start of day)
  try {
    const nowIst = DateTime.now().setZone('Asia/Kolkata').startOf('day');
    const targetIst = nowIst.plus({ days: 5 });

    // Pull candidates with any subsctiptionenddate present, then filter in app layer
    const candidates = await Booking.find({
      sts: { $regex: /^subscription$/i },
      subsctiptionenddate: { $exists: true, $ne: null, $ne: '' },
    });

    const bookingsExpiring = [];
    for (const b of candidates) {
      const endDtIst = parseEndDateIst(b.subsctiptionenddate);
      if (!endDtIst) continue;
      if (endDtIst.hasSame(targetIst, 'day')) bookingsExpiring.push(b);
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

      const title = 'Subscription expiring soon';
      const endDateDisplay = parseEndDateIst(subsctiptionenddate)?.toFormat('d-MM-yyyy') || subsctiptionenddate;
      const message = `Dear ${personName || 'User'}, Your Parking subscription for ${vehicleNumber || ''} is expiring on ${endDateDisplay} at ${vendorName || 'vendor'}. Renew now on ParkMyWheels app to enjoy hassle free parking.`;

      // Save to Notification collection
      try {
        const notif = new Notification({
          vendorId,
          userId,
          bookingId: String(bookingId),
          title,
          message,
          vehicleType,
          vehicleNumber,
          sts: 'subscription',
          bookingtype: booking.bookType || 'subscription',
          status: 'info',
          notificationdtime: `${subsctiptionenddate} 00:00`,
        });
        await notif.save();
      } catch (err) {
        console.error('Failed saving notification for booking', String(bookingId), err);
      }

      // Send FCM to user (by uuid -> userfcmTokens)
      try {
        const user = await User.findOne({ uuid: userId }, { userfcmTokens: 1 });
        const tokens = user?.userfcmTokens || [];
        if (!tokens.length) continue;

        const payload = {
          notification: {
            title,
            body: message,
          },
          android: { notification: { sound: 'default', priority: 'high' } },
          apns: { payload: { aps: { sound: 'default' } } },
          data: {
            bookingId: String(bookingId),
            type: 'subscription_expiry_5_days',
          },
        };

        const invalidTokens = [];
        for (const token of tokens) {
          try {
            await admin.messaging().send({ ...payload, token });
          } catch (sendErr) {
            console.error('FCM send error for token', token, sendErr?.errorInfo?.code || sendErr?.message || sendErr);
            if (sendErr?.errorInfo?.code === 'messaging/registration-token-not-registered') {
              invalidTokens.push(token);
            }
          }
        }

        if (invalidTokens.length) {
          await User.updateOne(
            { uuid: userId },
            { $pull: { userfcmTokens: { $in: invalidTokens } } }
          );
          console.log('Removed invalid user FCM tokens:', invalidTokens);
        }
      } catch (fcmErr) {
        console.error('Error while sending FCM for booking', String(bookingId), fcmErr);
      }

      // Send SMS reminder to the user (VISPL)
      try {
        // Prefer booking.mobileNumber; fallback to user's mobile from DB if needed
        let targetMobile = mobileNumber;
        if (!targetMobile) {
          const userDoc = await User.findOne({ uuid: userId }, { userMobile: 1 });
          targetMobile = userDoc?.userMobile || '';
        }

        if (targetMobile) {
          let cleanedMobile = String(targetMobile).replace(/[^0-9]/g, '');
          if (cleanedMobile.length === 10) cleanedMobile = '91' + cleanedMobile;

          const smsText = `Dear ${personName || 'User'}, Your Parking subscription for ${vehicleNumber || ''} is expiring on ${endDateDisplay} at ${vendorName || 'vendor'}. Renew now on ParkMyWheels app to enjoy hassle free parking.`;
          const dltTemplateId = process.env.VISPL_TEMPLATE_ID_REMINDER || process.env.VISPL_TEMPLATE_ID_REMINDER || 'YOUR_SUBSCRIPTION_TEMPLATE_ID';

          const smsParams = {
            username: process.env.VISPL_USERNAME || 'Vayusutha.trans',
            password: process.env.VISPL_PASSWORD || 'pdizP',
            unicode: 'false',
            from: process.env.VISPL_SENDER_ID || 'PRMYWH',
            to: cleanedMobile,
            text: smsText,
            dltContentId: dltTemplateId,
          };

          try {
            const smsResponse = await axios.get('https://pgapi.vispl.in/fe/api/v1/send', {
              params: smsParams,
              paramsSerializer: (params) => qs.stringify(params, { encode: true }),
              headers: { 'User-Agent': 'Mozilla/5.0 (Node.js)' },
            });

            const smsStatus = smsResponse.data.STATUS || smsResponse.data.status || smsResponse.data.statusCode;
            const isSuccess = smsStatus === 'SUCCESS' || smsStatus === 200 || smsStatus === 2000;
            if (!isSuccess) {
              console.warn('❌ SMS failed to send:', smsResponse.data);
            } else {
              console.log('✅ SMS reminder sent successfully!');
            }
          } catch (smsErr) {
            console.error('📛 SMS sending error:', smsErr?.message || smsErr);
          }
        } else {
          console.warn('⚠️ No mobile number found for booking/user', String(bookingId));
        }
      } catch (smsOuterErr) {
        console.error('Error while preparing SMS for booking', String(bookingId), smsOuterErr);
      }
    }
    return { targetDate: targetIst.toISODate(), count: bookingsExpiring.length };
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error while processing 5-days-left subscription notifications:`, err);
    throw err;
  }
}

export { };