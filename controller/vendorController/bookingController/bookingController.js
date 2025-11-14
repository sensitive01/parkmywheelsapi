const mongoose = require("mongoose");
const Booking = require("../../../models/bookingSchema");
const vendorModel = require("../../../models/venderSchema");
const Settlement = require("../../../models/settlementSchema");
const axios = require('axios');
const userModel = require("../../../models/userModel");
const moment = require("moment");
const admin = require("../../../config/firebaseAdmin"); // Use the singleton
const Notification = require("../../../models/notificationschema"); // Adjust the path as necessary
const { v4: uuidv4 } = require('uuid');
const qs = require("qs");
const Parkingcharges = require("../../../models/chargesSchema");
const Vehicle = require("../../../models/vehicleModel");
const User = require("../../../models/userModel");




const Gstfee = require("../../../models/gstfeeschema"); // Adjust path as per your project

// 📌 Parse "DD-MM-YYYY" string safely
function parseDDMMYYYY(dateStr) {
  if (!dateStr) return null;

  // Match DD-MM-YYYY
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dateStr);
  if (match) {
    const [_, day, month, year] = match;
    return new Date(`${year}-${month}-${day}`); // ✅ JS accepts YYYY-MM-DD
  }

  // Fallback: try letting JS parse it
  return new Date(dateStr);
}

exports.createBooking = async (req, res) => {
  try {
    const {
      userid,
      vendorId,
      vendorName,
      amount,
      hour,
      personName,
      mobileNumber,
      vehicleType,
      carType,
      vehicleNumber,
      bookingDate,
      bookingTime,
      parkingDate,
      parkingTime,
      tenditivecheckout,
      subsctiptiontype,
      status,
      sts,
      exitvehicledate,
      exitvehicletime,
      approvedDate = null,
      approvedTime = null,
      parkedDate = null,
      parkedTime = null,
      bookType,
      invoice,
    } = req.body;

    console.log("Booking data:", req.body);

    // Check available slots
    const vendorData = await vendorModel.findOne(
      { _id: vendorId },
      { parkingEntries: 1, fcmTokens: 1, platformfee: 1, spaceid: 1 }
    );

    if (!vendorData) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Check if subscription booking with spaceid - skip notifications if true
    const isSubscriptionWithSpaceid = (sts || "").toLowerCase() === "subscription" && vendorData.spaceid;

    const parkingEntries = vendorData.parkingEntries.reduce((acc, entry) => {
      const type = entry.type.trim();
      acc[type] = parseInt(entry.count) || 0;
      return acc;
    }, {});

    const totalAvailableSlots = {
      Cars: parkingEntries["Cars"] || 0,
      Bikes: parkingEntries["Bikes"] || 0,
      Others: parkingEntries["Others"] || 0,
    };

    const aggregationResult = await Booking.aggregate([
      { $match: { vendorId: vendorId, status: "PENDING" } },
      { $group: { _id: "$vehicleType", count: { $sum: 1 } } },
    ]);

    let bookedSlots = { Cars: 0, Bikes: 0, Others: 0 };
    aggregationResult.forEach(({ _id, count }) => {
      if (_id === "Car") bookedSlots.Cars = count;
      else if (_id === "Bike") bookedSlots.Bikes = count;
      else bookedSlots.Others = count;
    });

    const availableSlots = {
      Cars: totalAvailableSlots.Cars - bookedSlots.Cars,
      Bikes: totalAvailableSlots.Bikes - bookedSlots.Bikes,
      Others: totalAvailableSlots.Others - bookedSlots.Others,
    };

    if (vehicleType === "Car" && availableSlots.Cars <= 0)
      return res.status(400).json({ message: "No available slots for Cars" });
    if (vehicleType === "Bike" && availableSlots.Bikes <= 0)
      return res.status(400).json({ message: "No available slots for Bikes" });
    if (vehicleType === "Others" && availableSlots.Others <= 0)
      return res.status(400).json({ message: "No available slots for Others" });

    // Fetch GST and Handling Fee
    const gstFeeData = await Gstfee.findOne({});
    if (!gstFeeData) {
      return res.status(400).json({ message: "GST and handling fee data not found" });
    }

    // Financial calculations
    const bookingAmount = parseFloat(amount) || 0;
    const gstPercentage = parseFloat(gstFeeData.gst) || 0;
    const gstAmount = (bookingAmount * gstPercentage) / 100;
    const handlingFee = parseFloat(gstFeeData.handlingfee) || 0;
    const totalAmount = (bookingAmount + gstAmount + handlingFee).toFixed(2);

    let platformFeePercentage = parseFloat(vendorData.platformfee) || 0;
    const platformFee = (parseFloat(totalAmount) * platformFeePercentage) / 100;
    const releaseFee = platformFee.toFixed(2);
    const receivableAmount = (parseFloat(totalAmount) - platformFee).toFixed(2);
    const payableAmount = receivableAmount;

    const otp = Math.floor(100000 + Math.random() * 900000);

    let subscriptionEndDate = null;
if ((sts || "").toLowerCase() === "subscription" && parkingDate) {
  const date = parseDDMMYYYY(parkingDate); // ✅ safe parser
  date.setDate(date.getDate() + 30);
  subscriptionEndDate = date.toISOString().split("T")[0];
}

    const newBooking = new Booking({
      userid,
      vendorId,
      vendorName,
      amount: bookingAmount.toFixed(2),
      totalamout: totalAmount,
      gstamout: gstAmount.toFixed(2),
      handlingfee: handlingFee.toFixed(2),
      releasefee: releaseFee,
      recievableamount: receivableAmount,
      payableamout: payableAmount,
      hour,
        invoice, 
      personName,
      mobileNumber,
      vehicleType,
      carType,
      vehicleNumber,
      bookingDate,
      bookingTime,
      parkingDate,
      parkingTime,
      tenditivecheckout,
      subsctiptiontype,
      status,
      sts,
      otp,
      approvedDate,
      approvedTime,
      cancelledDate: null,
      cancelledTime: null,
      parkedDate,
      parkedTime,
      settlemtstatus: "pending",
      exitvehicledate,
      exitvehicletime,
      bookType,
      subsctiptionenddate: subscriptionEndDate,
    });

    await newBooking.save();

    // Feedback is now stored directly in the booking document (initialized with default values)
    // No need to create separate feedback entry

    // Skip all notifications if subscription booking with spaceid
    if (!isSubscriptionWithSpaceid) {
    // Vendor Notification
    const vendorNotification = new Notification({
      vendorId,
      userId: userid,
      bookingId: newBooking._id,
      title: "New Booking Received",
      message: `New booking received from ${personName} for ${parkingDate} at ${parkingTime}`,
      vehicleType,
      vehicleNumber,
      createdAt: new Date(),
      read: false,
      sts,
      bookingtype: bookType,
      otp: otp.toString(),
      vendorname: vendorName,
      parkingDate,
      parkingTime,
      bookingdate: bookingDate,
      schedule: `${parkingDate} ${parkingTime}`,
      notificationdtime: `${bookingDate} ${bookingTime}`,
      status,
    });

    await vendorNotification.save();

    // User Notification
    const userNotification = new Notification({
      vendorId,
      userId: userid,
      bookingId: newBooking._id,
      title: "Booking Confirmed",
      message: `Your booking with ${vendorName} has been successfully confirmed for ${parkingDate} at ${parkingTime}`,
      vehicleType,
      vehicleNumber,
      createdAt: new Date(),
      read: false,
      sts,
      bookingtype: bookType,
      otp: otp.toString(),
      vendorname: vendorName,
      parkingDate,
      parkingTime,
      bookingdate: bookingDate,
      notificationdtime: `${bookingDate} ${bookingTime}`,
      schedule: `${parkingDate} ${parkingTime}`,
      status,
    });

    await userNotification.save();

    // Check if this is user's first booking and send first-time booking notification
    try {
      const previousBookingCount = await Booking.countDocuments({ userid: userid });
      if (previousBookingCount === 1) {
        // This is the first booking (current booking is the only one)
        const firstTimeNotification = new Notification({
          vendorId,
          userId: userid,
          bookingId: newBooking._id,
          title: "First-time Booking",
          message: `You're all set! Congratulations on your 1st booking with parkmywheels @ ${vendorName}`,
          vehicleType,
          vehicleNumber,
          createdAt: new Date(),
          read: false,
          sts,
          bookingtype: bookType,
          vendorname: vendorName,
          parkingDate,
          parkingTime,
          bookingdate: bookingDate,
          notificationdtime: `${bookingDate} ${bookingTime}`,
          schedule: `${parkingDate} ${parkingTime}`,
          status,
        });
        await firstTimeNotification.save();
        console.log(`[${new Date().toISOString()}] ✅ First-time booking notification saved for user ${userid}`);

        // Send FCM notification for first-time booking
        const user = await userModel.findOne({ uuid: userid }, { userfcmTokens: 1 });
        if (user?.userfcmTokens?.length > 0) {
          const firstTimeFcmMessage = {
            notification: {
              title: "First-time Booking",
              body: `You're all set! Congratulations on your 1st booking with parkmywheels @ ${vendorName}`,
            },
            data: {
              bookingId: newBooking._id.toString(),
              vehicleType,
              type: "first_booking",
            },
            android: { notification: { sound: "default", priority: "high" } },
            apns: { payload: { aps: { sound: "default" } } },
          };
          const invalidTokens = [];
          for (const token of user.userfcmTokens) {
            try {
              await admin.messaging().send({ ...firstTimeFcmMessage, token });
            } catch (error) {
              if (error.errorInfo?.code === "messaging/registration-token-not-registered") {
                invalidTokens.push(token);
              }
            }
          }
          if (invalidTokens.length > 0) {
            await userModel.updateOne(
              { uuid: userid },
              { $pull: { userfcmTokens: { $in: invalidTokens } } }
            );
          }
        }
      }
    } catch (firstTimeErr) {
      console.error(`[${new Date().toISOString()}] ❌ Error sending first-time booking notification:`, firstTimeErr);
    }

    // Send GST Invoice Ready Notification for subscription bookings
    if ((sts || "").toLowerCase() === "subscription" && !isSubscriptionWithSpaceid) {
      try {
        await sendInvoiceReadyNotification(newBooking, newBooking._id);
      } catch (invoiceErr) {
        console.error(`[${new Date().toISOString()}] ❌ Error sending invoice notification after subscription booking creation:`, invoiceErr);
      }
    }

    // FCM Notifications
    const sendFcmNotification = async (tokens, messageTemplate, model, idField, idType = '_id') => {
      const invalidTokens = [];
      const promises = tokens.map(async (token) => {
        try {
          await admin.messaging().send({ ...messageTemplate, token });
        } catch (error) {
          if (error.errorInfo?.code === "messaging/registration-token-not-registered") {
            invalidTokens.push(token);
          }
        }
      });
      await Promise.all(promises);
      if (invalidTokens.length > 0) {
        await model.updateOne(
          { [idType]: idField },
          { $pull: { fcmTokens: { $in: invalidTokens } } }
        );
      }
    };

    if (vendorData.fcmTokens?.length > 0) {
      const vendorFcmMessage = {
        notification: { title: "New Booking Received", body: `New booking from ${personName}` },
        android: { notification: { sound: "default", priority: "high" } },
        apns: { payload: { aps: { sound: "default" } } },
      };
      await sendFcmNotification(vendorData.fcmTokens, vendorFcmMessage, vendorModel, vendorId, '_id');
    }

    const user = await userModel.findOne({ uuid: userid }, { userfcmTokens: 1 });
    if (user?.userfcmTokens?.length > 0) {
      const userFcmMessage = {
        notification: { title: "Booking Confirmed", body: `Your booking with ${vendorName} is confirmed` },
        data: { bookingId: newBooking._id.toString(), vehicleType },
        android: { notification: { sound: "default", priority: "high" } },
        apns: { payload: { aps: { sound: "default" } } },
      };
      await sendFcmNotification(user.userfcmTokens, userFcmMessage, userModel, userid, 'uuid');
    }

    // --- Subscription SMS Handling ---
    if (mobileNumber && (sts || "").toLowerCase() === "subscription" && !isSubscriptionWithSpaceid) {
      let cleanedMobile = mobileNumber.replace(/[^0-9]/g, "");
      if (cleanedMobile.length === 10) {
        cleanedMobile = "91" + cleanedMobile;
      }

      // 1️⃣ First subscription SMS
      const smsText1 = `Dear ${personName}, ${hour || "30 days"} Parking subscription for ${vehicleNumber} from ${parkingDate} to ${newBooking.subsctiptionenddate || ""} at ${vendorName} is confirmed. Fees paid: ${amount}. View invoice on ParkMyWheels app.`;
      const dltTemplateId1 = process.env.VISPL_TEMPLATE_ID_SUBSCRIPTION || "YOUR_SUBSCRIPTION_TEMPLATE_ID";
      await sendSMS(cleanedMobile, smsText1, dltTemplateId1);

      // 2️⃣ Second subscription receipt SMS
      const smsText2 = `Dear ${personName}, your monthly parking subscription confirmed. Period ${parkingDate} to ${newBooking.subsctiptionenddate || ""} at location ${vendorName}. Fees paid ${amount}. Transaction ID ${newBooking.invoice}. Download invoice from ParkMyWheels app. Issued by ParkMyWheels-Smart Parking Made Easy.`;
      const dltTemplateId2 = process.env.VISPL_TEMPLATE_SUNRECEIPT || "1007109197298830403";
      await sendSMS(cleanedMobile, smsText2, dltTemplateId2);
    }
    } // End of notification skip block

    res.status(200).json({
      message: "Booking created successfully",
      bookingId: newBooking._id,
      booking: {
        invoice: newBooking.invoice,
        _id: newBooking._id,
        amount: newBooking.amount,
        totalamout: newBooking.totalamout,
        gstamout: newBooking.gstamout,
        handlingfee: newBooking.handlingfee,
        releasefee: newBooking.releasefee,
        recievableamount: newBooking.recievableamount,
        payableamout: newBooking.payableamout,
        subscriptionenddate: newBooking.subsctiptionenddate,
      },
      otp,
      bookType,
      sts,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: error.message });
  }
};

// 📦 Common SMS sender
async function sendSMS(to, text, dltContentId) {
  const smsParams = {
    username: process.env.VISPL_USERNAME || "Vayusutha.trans",
    password: process.env.VISPL_PASSWORD || "pdizP",
    unicode: "false",
    from: process.env.VISPL_SENDER_ID || "PRMYWH",
    to,
    text,
    dltContentId,
  };

  try {
    const smsResponse = await axios.get("https://pgapi.vispl.in/fe/api/v1/send", {
      params: smsParams,
      paramsSerializer: (params) => qs.stringify(params, { encode: true }),
      headers: { "User-Agent": "Mozilla/5.0 (Node.js)" },
    });

    console.log("📬 SMS API Response:", smsResponse.data);
  } catch (err) {
    console.error("📛 SMS sending error:", err.message || err);
  }
}


exports.vendorcreateBooking = async (req, res) => {
  try {
    const {
      userid,
      vendorId,
      vendorName,
      amount,
      hour,
      personName,
      mobileNumber,
      vehicleType,
      carType,
      vehicleNumber,
      bookingDate,
      bookingTime,
      parkingDate,
      parkingTime,
      tenditivecheckout,
      subsctiptiontype,
      subsctiptionenddate,
      status,
      sts,
      exitvehicledate,
      exitvehicletime,
      approvedDate = null,
      approvedTime = null,
      parkedDate = null,
      parkedTime = null,
      bookType,
    } = req.body;

    console.log("Booking data:", req.body);

    // ✅ Check available slots before creating a booking
    const vendorData = await vendorModel.findOne(
      { _id: vendorId },
      { parkingEntries: 1, fcmTokens: 1, platformfee: 1 }
    );

    if (!vendorData) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const parkingEntries = vendorData.parkingEntries.reduce((acc, entry) => {
      const type = entry.type.trim();
      acc[type] = parseInt(entry.count) || 0;
      return acc;
    }, {});

    const totalAvailableSlots = {
      Cars: parkingEntries["Cars"] || 0,
      Bikes: parkingEntries["Bikes"] || 0,
      Others: parkingEntries["Others"] || 0,
    };

    const aggregationResult = await Booking.aggregate([
      { $match: { vendorId: vendorId, status: "PENDING" } },
      { $group: { _id: "$vehicleType", count: { $sum: 1 } } },
    ]);

    let bookedSlots = { Cars: 0, Bikes: 0, Others: 0 };

    aggregationResult.forEach(({ _id, count }) => {
      if (_id === "Car") bookedSlots.Cars = count;
      else if (_id === "Bike") bookedSlots.Bikes = count;
      else bookedSlots.Others = count;
    });

    const availableSlots = {
      Cars: totalAvailableSlots.Cars - bookedSlots.Cars,
      Bikes: totalAvailableSlots.Bikes - bookedSlots.Bikes,
      Others: totalAvailableSlots.Others - bookedSlots.Others,
    };

    if (vehicleType === "Car" && availableSlots.Cars <= 0) {
      return res.status(400).json({ message: "No available slots for Cars" });
    } else if (vehicleType === "Bike" && availableSlots.Bikes <= 0) {
      return res.status(400).json({ message: "No available slots for Bikes" });
    } else if (vehicleType === "Others" && availableSlots.Others <= 0) {
      return res.status(400).json({ message: "No available slots for Others" });
    }

    // ✅ Initialize booking financials
    let bookingAmount = 0;
    let totalAmount = 0;
    let gstAmount = 0;
    let handlingFee = 0;
    let releaseFee = 0;
    let receivableAmount = 0;
    let payableAmount = 0;

    // ✅ Calculate amounts
    const roundedAmount = Math.ceil(parseFloat(amount) || 0);
    bookingAmount = roundedAmount.toFixed(2);
    totalAmount = bookingAmount;

    // Platform fee calculation
    let platformFeePercentage = parseFloat(vendorData.platformfee) || 0;
    platformFeePercentage = Math.ceil(platformFeePercentage);

    const platformFee = (roundedAmount * platformFeePercentage) / 100;
    releaseFee = platformFee.toFixed(2);

    const receivable = roundedAmount - platformFee;
    receivableAmount = receivable.toFixed(2);
    payableAmount = receivableAmount;

    const otp = Math.floor(100000 + Math.random() * 900000);

    const newBooking = new Booking({
      userid,
      vendorId,
      vendorName,
      amount: bookingAmount,
      totalamout: totalAmount,
      gstamout: gstAmount,
      handlingfee: handlingFee,
      releasefee: releaseFee,
      recievableamount: receivableAmount,
      payableamout: payableAmount,
      hour,
      personName,
      mobileNumber,
      vehicleType,
      carType,
      vehicleNumber,
      bookingDate,
      bookingTime,
      parkingDate,
      parkingTime,
      tenditivecheckout,
      subsctiptiontype,
      subsctiptionenddate,
      status,
      sts,
      otp,
      approvedDate,
      approvedTime,
      cancelledDate: null,
      cancelledTime: null,
      parkedDate,
      parkedTime,
      exitvehicledate,
      exitvehicletime,
      bookType,
    });

    await newBooking.save();

    // Feedback is now stored directly in the booking document (initialized with default values)
    // No need to create separate feedback entry

    // ✅ Send notifications for subscription bookings
    if ((sts || "").toLowerCase() === "subscription") {
      // Vendor notification for subscription start
      const vendorSubscriptionNotification = {
        notification: {
          title: "Subscription Booking Started",
          body: `${personName}'s subscription booking has started.`,
        },
        android: {
          notification: {
            sound: "default",
            priority: "high",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
            },
          },
        },
      };

      const vendorFcmTokens = vendorData.fcmTokens || [];
      const vendorInvalidTokens = [];

      if (vendorFcmTokens.length > 0) {
        const vendorPromises = vendorFcmTokens.map(async (token) => {
          try {
            const message = { ...vendorSubscriptionNotification, token };
            const response = await admin.messaging().send(message);
            console.log(`Vendor subscription notification sent to token: ${token}`, response);
          } catch (error) {
            console.error(`Error sending vendor subscription notification to token: ${token}`, error);
            if (error.errorInfo?.code === "messaging/registration-token-not-registered") {
              vendorInvalidTokens.push(token);
            }
          }
        });

        await Promise.all(vendorPromises);

        if (vendorInvalidTokens.length > 0) {
          await vendorModel.updateOne(
            { _id: vendorId },
            { $pull: { fcmTokens: { $in: vendorInvalidTokens } } }
          );
          console.log("Removed invalid vendor FCM tokens:", vendorInvalidTokens);
        }
      } else {
        console.warn("No FCM tokens available for this vendor for subscription notification.");
      }

      // Customer notification for subscription start
      const matchedUsers = await User.find({
        $or: [{ userMobile: mobileNumber }, { vehicleNumber: vehicleNumber }],
      });

      if (matchedUsers && matchedUsers.length > 0) {
        const userSubscriptionNotification = {
          notification: {
            title: "Parking Started!",
            body: `Your subscription parking at ${vendorName} has begun.`,
          },
          android: {
            notification: {
              sound: "default",
              priority: "high",
            },
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
              },
            },
          },
        };

        const allUserTokens = [];
        const userTokenMap = new Map();

        matchedUsers.forEach((user) => {
          if (user.userfcmTokens?.length > 0) {
            user.userfcmTokens.forEach((token) => {
              allUserTokens.push(token);
              userTokenMap.set(token, user._id);
            });
          }
        });

        if (allUserTokens.length > 0) {
          const userInvalidTokens = [];
          const userNotificationPromises = allUserTokens.map(async (token) => {
            try {
              const message = { ...userSubscriptionNotification, token };
              const response = await admin.messaging().send(message);
              console.log(`User subscription notification sent to token: ${token}`, response);
            } catch (error) {
              console.error(`Error sending user subscription notification to token: ${token}`, error);
              if (error.errorInfo?.code === "messaging/registration-token-not-registered") {
                userInvalidTokens.push(token);
              }
            }
          });

          await Promise.all(userNotificationPromises);

          if (userInvalidTokens.length > 0) {
            const userUpdatePromises = [];
            const tokensByUser = new Map();

            userInvalidTokens.forEach((token) => {
              const userId = userTokenMap.get(token);
              if (userId) {
                if (!tokensByUser.has(userId)) {
                  tokensByUser.set(userId, []);
                }
                tokensByUser.get(userId).push(token);
              }
            });

            for (const [userId, tokens] of tokensByUser) {
              userUpdatePromises.push(
                User.updateOne(
                  { _id: userId },
                  { $pull: { userfcmTokens: { $in: tokens } } }
                )
              );
            }

            await Promise.all(userUpdatePromises);
            console.log("Removed invalid user FCM tokens:", userInvalidTokens);
          }
        } else {
          console.warn(`No FCM tokens found for matched users with mobile: ${mobileNumber} or vehicle: ${vehicleNumber}`);
        }
      } else {
        console.warn(`No matching user found for mobile: ${mobileNumber} or vehicle: ${vehicleNumber}`);
      }
    }

    // ✅ Existing notification for booking success
    const vendorNotification = new Notification({
      vendorId: vendorId,
      userId: userid,
      bookingId: newBooking._id,
      title: "Booking Successful",
      message: `Booking successful for vehicle ${vehicleNumber} on ${parkingDate} at ${parkingTime}.`,
      vehicleType: vehicleType,
      vehicleNumber: vehicleNumber,
      createdAt: new Date(),
      read: false,
      sts: sts,
      bookingtype: bookType,
      otp: otp.toString(),
      vendorname: vendorName,
      parkingDate: parkingDate,
      parkingTime: parkingTime,
      bookingdate: bookingDate,
      schedule: `${parkingDate} ${parkingTime}`,
      notificationdtime: `${bookingDate} ${bookingTime}`,
      status: status,
    });

    await vendorNotification.save();

    // Check if this is user's first booking and send first-time booking notification
    if (userid) {
      try {
        const previousBookingCount = await Booking.countDocuments({ userid: userid });
        if (previousBookingCount === 1) {
          // This is the first booking (current booking is the only one)
          const firstTimeNotification = new Notification({
            vendorId: vendorId,
            userId: userid,
            bookingId: newBooking._id,
            title: "First-time Booking",
            message: `You're all set! Congratulations on your 1st booking with parkmywheels @ ${vendorName}`,
            vehicleType: vehicleType,
            vehicleNumber: vehicleNumber,
            createdAt: new Date(),
            read: false,
            sts: sts,
            bookingtype: bookType,
            vendorname: vendorName,
            parkingDate: parkingDate,
            parkingTime: parkingTime,
            bookingdate: bookingDate,
            notificationdtime: `${bookingDate} ${bookingTime}`,
            schedule: `${parkingDate} ${parkingTime}`,
            status: status,
          });
          await firstTimeNotification.save();
          console.log(`[${new Date().toISOString()}] ✅ First-time booking notification saved for user ${userid}`);

          // Send FCM notification for first-time booking
          const user = await userModel.findOne({ uuid: userid }, { userfcmTokens: 1 });
          if (user?.userfcmTokens?.length > 0) {
            const firstTimeFcmMessage = {
              notification: {
                title: "First-time Booking",
                body: `You're all set! Congratulations on your 1st booking with parkmywheels @ ${vendorName}`,
              },
              data: {
                bookingId: newBooking._id.toString(),
                vehicleType,
                type: "first_booking",
              },
              android: { notification: { sound: "default", priority: "high" } },
              apns: { payload: { aps: { sound: "default" } } },
            };
            const invalidTokens = [];
            for (const token of user.userfcmTokens) {
              try {
                await admin.messaging().send({ ...firstTimeFcmMessage, token });
              } catch (error) {
                if (error.errorInfo?.code === "messaging/registration-token-not-registered") {
                  invalidTokens.push(token);
                }
              }
            }
            if (invalidTokens.length > 0) {
              await userModel.updateOne(
                { uuid: userid },
                { $pull: { userfcmTokens: { $in: invalidTokens } } }
              );
            }
          }
        }
      } catch (firstTimeErr) {
        console.error(`[${new Date().toISOString()}] ❌ Error sending first-time booking notification:`, firstTimeErr);
      }
    }

    // Send GST Invoice Ready Notification for subscription bookings
    if ((sts || "").toLowerCase() === "subscription") {
      try {
        await sendInvoiceReadyNotification(newBooking, newBooking._id);
      } catch (invoiceErr) {
        console.error(`[${new Date().toISOString()}] ❌ Error sending invoice notification after subscription booking creation:`, invoiceErr);
      }
    }

    const vendorNotificationMessage = {
      notification: {
        title: "Booking Successful",
        body: `Booking successful for vehicle ${vehicleNumber} on ${parkingDate} at ${parkingTime}.`,
      },
      android: {
        notification: {
          sound: "default",
          priority: "high",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    };

    const vendorFcmTokens = vendorData.fcmTokens || [];
    const vendorInvalidTokens = [];

    if (vendorFcmTokens.length > 0) {
      const vendorPromises = vendorFcmTokens.map(async (token) => {
        try {
          const message = { ...vendorNotificationMessage, token };
          const response = await admin.messaging().send(message);
          console.log(`Vendor notification sent to token: ${token}`, response);
        } catch (error) {
          console.error(`Error sending vendor notification to token: ${token}`, error);
          if (error.errorInfo?.code === "messaging/registration-token-not-registered") {
            vendorInvalidTokens.push(token);
          }
        }
      });

      await Promise.all(vendorPromises);

      if (vendorInvalidTokens.length > 0) {
        await vendorModel.updateOne(
          { _id: vendorId },
          { $pull: { fcmTokens: { $in: vendorInvalidTokens } } }
        );
        console.log("Removed invalid vendor FCM tokens:", vendorInvalidTokens);
      }
    } else {
      console.warn("No FCM tokens available for this vendor.");
    }

    if (mobileNumber) {
      // Clean mobile number
      let cleanedMobile = mobileNumber.replace(/[^0-9]/g, "");
      if (cleanedMobile.length === 10) {
        cleanedMobile = "91" + cleanedMobile;
      }

      // --- Subscription SMS Handling ---
      if ((sts || "").toLowerCase() === "subscription") {
        // 1️⃣ First subscription SMS
        let smsText1 = `Dear ${personName}, ${hour || "30 days"} Parking subscription for ${vehicleNumber} from ${parkingDate} to ${subsctiptionenddate || ""} at ${vendorName} is confirmed. Fees paid: ${amount}. View invoice on ParkMyWheels app.`;
        let dltTemplateId1 = process.env.VISPL_TEMPLATE_ID_SUBSCRIPTION || "YOUR_SUBSCRIPTION_TEMPLATE_ID";
        await sendSMS(cleanedMobile, smsText1, dltTemplateId1);

        // 2️⃣ Second subscription receipt SMS
        let smsText2 = `Dear ${personName}, your monthly parking subscription confirmed. Period ${parkingDate} to ${subsctiptionenddate || ""} at location ${vendorName}. Fees paid ${amount}. Transaction ID ${newBooking._id}. Download invoice from ParkMyWheels app. Issued by ParkMyWheels-Smart Parking Made Easy.`;
        let dltTemplateId2 = process.env.VISPL_TEMPLATE_SUNRECEIPT || "1007109197298830403";
        await sendSMS(cleanedMobile, smsText2, dltTemplateId2);
      } else {
        // Non-subscription SMS
        let smsText = `Hi, your vehicle spot at ${vendorName} on ${parkingDate} at ${parkingTime} for your vehicle: ${vehicleNumber} is confirmed. Drive in & park smart with ParkMyWheels.`;
        let dltTemplateId = process.env.VISPL_TEMPLATE_ID_BOOKING || "YOUR_BOOKING_TEMPLATE_ID";
        await sendSMS(cleanedMobile, smsText, dltTemplateId);
      }

      const matchedUsers = await User.find({
        $or: [{ userMobile: mobileNumber }, { vehicleNumber: vehicleNumber }],
      });

      if (matchedUsers && matchedUsers.length > 0) {
        const userNotificationMessage = {
          notification: {
            title: "Booking Confirmed",
            body: `Your booking for ${vehicleNumber} at ${vendorName} on ${parkingDate} ${parkingTime} is confirmed.`,
          },
          android: {
            notification: { sound: "default", priority: "high" },
          },
          apns: {
            payload: { aps: { sound: "default" } },
          },
        };

        const allUserTokens = [];
        const userTokenMap = new Map();

        matchedUsers.forEach((user) => {
          if (user.userfcmTokens?.length > 0) {
            user.userfcmTokens.forEach((token) => {
              allUserTokens.push(token);
              userTokenMap.set(token, user._id);
            });
          }
        });

        if (allUserTokens.length > 0) {
          const userInvalidTokens = [];
          const userNotificationPromises = allUserTokens.map(async (token) => {
            try {
              const message = { ...userNotificationMessage, token };
              const response = await admin.messaging().send(message);
              console.log(`User notification sent to token: ${token}`, response);
            } catch (error) {
              console.error(`Error sending user notification to token: ${token}`, error);
              if (error.errorInfo?.code === "messaging/registration-token-not-registered") {
                userInvalidTokens.push(token);
              }
            }
          });

          await Promise.all(userNotificationPromises);

          if (userInvalidTokens.length > 0) {
            const userUpdatePromises = [];
            const tokensByUser = new Map();

            userInvalidTokens.forEach((token) => {
              const userId = userTokenMap.get(token);
              if (userId) {
                if (!tokensByUser.has(userId)) {
                  tokensByUser.set(userId, []);
                }
                tokensByUser.get(userId).push(token);
              }
            });

            for (const [userId, tokens] of tokensByUser) {
              userUpdatePromises.push(
                User.updateOne(
                  { _id: userId },
                  { $pull: { userfcmTokens: { $in: tokens } } }
                )
              );
            }

            await Promise.all(userUpdatePromises);
            console.log("Removed invalid user FCM tokens:", userInvalidTokens);
          }
        } else {
          console.warn(`No FCM tokens found for matched users with mobile: ${cleanedMobile} or vehicle: ${vehicleNumber}`);
        }
      } else {
        console.warn(`No matching user found for mobile: ${cleanedMobile} or vehicle: ${vehicleNumber}`);
      }
    }

    res.status(200).json({
      message: "Booking created successfully",
      bookingId: newBooking._id,
      booking: {
        _id: newBooking._id,
        amount: newBooking.amount,
        totalamout: newBooking.totalamout,
        gstamout: newBooking.gstamout,
        handlingfee: newBooking.handlingfee,
        releasefee: newBooking.releasefee,
        recievableamount: newBooking.recievableamount,
        payableamout: newBooking.payableamout,
        subscriptionenddate: newBooking.subsctiptionenddate,
      },
      otp,
      bookType,
      sts,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: error.message });
  }
};

// 📦 Common SMS sender
async function sendSMS(to, text, dltContentId) {
  const smsParams = {
    username: process.env.VISPL_USERNAME || "Vayusutha.trans",
    password: process.env.VISPL_PASSWORD || "pdizP",
    unicode: "false",
    from: process.env.VISPL_SENDER_ID || "PRMYWH",
    to,
    text,
    dltContentId,
  };

  try {
    const smsResponse = await axios.get("https://pgapi.vispl.in/fe/api/v1/send", {
      params: smsParams,
      paramsSerializer: (params) => qs.stringify(params, { encode: true }),
      headers: { "User-Agent": "Mozilla/5.0 (Node.js)" },
    });

    console.log("📬 SMS API Response:", smsResponse.data);
  } catch (err) {
    console.error("📛 SMS sending error:", err.message || err);
  }
}
exports.getBookingsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const bookings = await Booking.find({ status });
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
//sndjdn
exports.livecreateBooking = async (req, res) => {
  try {
    const {
      userid,
      vendorId,
      vendorName,
      amount,
      hour,
      personName,
      mobileNumber,
      vehicleType,
      carType,
      vehicleNumber,
      bookingDate,
      bookingTime,
      parkingDate,
      parkingTime,
      tenditivecheckout,
      subsctiptiontype,
      status,
      sts,
      exitvehicledate,
      exitvehicletime,
      approvedDate,
      approvedTime,
      parkedDate,
      parkedTime,
      bookType,
    } = req.body;

    console.log("Booking data:", req.body);

    // Step 1: Check vendor and available slots
    const vendorData = await vendorModel.findOne({ _id: vendorId }, { parkingEntries: 1, fcmTokens: 1 });
    if (!vendorData) return res.status(404).json({ message: "Vendor not found" });

    const parkingEntries = vendorData.parkingEntries.reduce((acc, entry) => {
      const type = entry.type.trim();
      acc[type] = parseInt(entry.count) || 0;
      return acc;
    }, {});

    const totalAvailableSlots = {
      Cars: parkingEntries["Cars"] || 0,
      Bikes: parkingEntries["Bikes"] || 0,
      Others: parkingEntries["Others"] || 0,
    };

    const aggregationResult = await Booking.aggregate([
      {
        $match: {
          vendorId: vendorId,
          status: "PENDING",
        },
      },
      {
        $group: {
          _id: "$vehicleType",
          count: { $sum: 1 },
        },
      },
    ]);

    let bookedSlots = {
      Cars: 0,
      Bikes: 0,
      Others: 0,
    };

    aggregationResult.forEach(({ _id, count }) => {
      if (_id === "Car") {
        bookedSlots.Cars = count;
      } else if (_id === "Bike") {
        bookedSlots.Bikes = count;
      } else {
        bookedSlots.Others = count;
      }
    });

    const availableSlots = {
      Cars: totalAvailableSlots.Cars - bookedSlots.Cars,
      Bikes: totalAvailableSlots.Bikes - bookedSlots.Bikes,
      Others: totalAvailableSlots.Others - bookedSlots.Others,
    };
    console.log("Available slots:", availableSlots);
    console.log("Booked slots:", bookedSlots);

    if (vehicleType === "Car" && availableSlots.Cars <= 0) {
      return res.status(400).json({ message: "No available slots for Cars" });
    } else if (vehicleType === "Bike" && availableSlots.Bikes <= 0) {
      return res.status(400).json({ message: "No available slots for Bikes" });
    } else if (vehicleType === "Others" && availableSlots.Others <= 0) {
      return res.status(400).json({ message: "No available slots for Others" });
    }

    // Step 2: Generate OTP and create booking
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Calculate subscription end date for subscriptions
    let subscriptionEndDate = null;
    if ((sts || "").toLowerCase() === "subscription" && parkingDate) {
      const date = new Date(parkingDate);
      date.setDate(date.getDate() + 30);
      subscriptionEndDate = date.toISOString().split("T")[0];
    }

    const newBooking = new Booking({
      userid,
      vendorId,
      amount,
      hour,
      personName,
      vehicleType,
      vendorName,
      mobileNumber,
      carType,
      vehicleNumber,
      bookingDate,
      bookingTime,
      parkingDate,
      parkingTime,
      tenditivecheckout,
      subsctiptiontype,
      status,
      sts,
      otp,
      approvedDate,
      approvedTime,
      parkedDate,
      parkedTime,
      cancelledDate: null,
      cancelledTime: null,
      settlemtstatus: "PARKED",
      exitvehicledate,
      exitvehicletime,
      bookType,
      subsctiptionenddate: subscriptionEndDate,
    });

    await newBooking.save();

    // Feedback is now stored directly in the booking document (initialized with default values)
    // No need to create separate feedback entry

    // Step 3: Create Notifications (Database)
    const vendorNotif = new Notification({
      vendorId,
      userId: userid,
      bookingId: newBooking._id,
      title: "Vehicle Parked",
      message: `New booking started from ${personName} for ${parkingDate} at ${parkingTime}`,
      vehicleType,
      vehicleNumber,
      createdAt: new Date(),
      read: false,
      sts,
      bookingtype: bookType,
      otp: otp.toString(),
      vendorname: vendorName,
      parkingDate,
      parkingTime,
      bookingdate: bookingDate,
      schedule: `${parkingDate} ${parkingTime}`,
      notificationdtime: `${bookingDate} ${bookingTime}`,
      status,
    });

    const userNotif = new Notification({
      vendorId,
      userId: userid,
      bookingId: newBooking._id,
      title: "Vehicle Parked",
      message: `Your booking with ${vendorName} has been successfully confirmed for ${parkingDate} at ${parkingTime}`,
      vehicleType,
      vehicleNumber,
      createdAt: new Date(),
      read: false,
      sts,
      bookingtype: bookType,
      otp: otp.toString(),
      vendorname: vendorName,
      parkingDate,
      parkingTime,
      bookingdate: bookingDate,
      schedule: `${parkingDate} ${parkingTime}`,
      notificationdtime: `${bookingDate} ${bookingTime}`,
      status,
    });

    await vendorNotif.save();
    await userNotif.save();

    // Check if this is user's first booking and send first-time booking notification
    if (userid) {
      try {
        const previousBookingCount = await Booking.countDocuments({ userid: userid });
        if (previousBookingCount === 1) {
          // This is the first booking (current booking is the only one)
          const firstTimeNotification = new Notification({
            vendorId,
            userId: userid,
            bookingId: newBooking._id,
            title: "First-time Booking",
            message: `You're all set! Congratulations on your 1st booking with parkmywheels @ ${vendorName}`,
            vehicleType,
            vehicleNumber,
            createdAt: new Date(),
            read: false,
            sts,
            bookingtype: bookType,
            vendorname: vendorName,
            parkingDate,
            parkingTime,
            bookingdate: bookingDate,
            notificationdtime: `${bookingDate} ${bookingTime}`,
            schedule: `${parkingDate} ${parkingTime}`,
            status,
          });
          await firstTimeNotification.save();
          console.log(`[${new Date().toISOString()}] ✅ First-time booking notification saved for user ${userid}`);

          // Send FCM notification for first-time booking
          const user = await userModel.findOne({ uuid: userid }, { userfcmTokens: 1 });
          if (user?.userfcmTokens?.length > 0) {
            const firstTimeFcmMessage = {
              notification: {
                title: "First-time Booking",
                body: `You're all set! Congratulations on your 1st booking with parkmywheels @ ${vendorName}`,
              },
              data: {
                bookingId: newBooking._id.toString(),
                vehicleType,
                type: "first_booking",
              },
              android: { notification: { sound: "default", priority: "high" } },
              apns: { payload: { aps: { sound: "default" } } },
            };
            const invalidTokens = [];
            for (const token of user.userfcmTokens) {
              try {
                await admin.messaging().send({ ...firstTimeFcmMessage, token });
              } catch (error) {
                if (error.errorInfo?.code === "messaging/registration-token-not-registered") {
                  invalidTokens.push(token);
                }
              }
            }
            if (invalidTokens.length > 0) {
              await userModel.updateOne(
                { uuid: userid },
                { $pull: { userfcmTokens: { $in: invalidTokens } } }
              );
            }
          }
        }
      } catch (firstTimeErr) {
        console.error(`[${new Date().toISOString()}] ❌ Error sending first-time booking notification:`, firstTimeErr);
      }
    }

    // Send GST Invoice Ready Notification for subscription bookings
    if ((sts || "").toLowerCase() === "subscription") {
      try {
        await sendInvoiceReadyNotification(newBooking, newBooking._id);
      } catch (invoiceErr) {
        console.error(`[${new Date().toISOString()}] ❌ Error sending invoice notification after subscription booking creation:`, invoiceErr);
      }
    }

    // Step 4: Define FCM payloads
    const vendorNotificationMessage = {
      notification: {
        title: "New Booking Received",
        body: `New booking from ${personName} for ${parkingDate} at ${parkingTime}`,
      },
      android: { notification: { sound: "default", priority: "high" } },
      apns: { payload: { aps: { sound: "default" } } },
    };

    const userNotificationMessage = {
      notification: {
        title: "Booking Confirmed",
        body: `Booking with ${vendorName} confirmed for ${parkingDate} at ${parkingTime}`,
      },
      android: { notification: { sound: "default", priority: "high" } },
      apns: { payload: { aps: { sound: "default" } } },
    };

    // Step 5: Send Vendor Notifications via FCM
    const vendorFcmTokens = vendorData.fcmTokens || [];
    const vendorInvalidTokens = [];

    if (vendorFcmTokens.length) {
      const vendorPromises = vendorFcmTokens.map(async (token) => {
        try {
          await admin.messaging().send({ ...vendorNotificationMessage, token });
        } catch (error) {
          if (error.errorInfo?.code === "messaging/registration-token-not-registered") {
            vendorInvalidTokens.push(token);
          }
        }
      });
      await Promise.all(vendorPromises);
      if (vendorInvalidTokens.length) {
        await vendorModel.updateOne(
          { _id: vendorId },
          { $pull: { fcmTokens: { $in: vendorInvalidTokens } } }
        );
      }
    }

    // Step 6: Send User Notifications via FCM
    const user = await userModel.findOne({ uuid: userid }, { userfcmTokens: 1 });
    if (user) {
      const userFcmTokens = user.userfcmTokens || [];
      const userInvalidTokens = [];

      if (userFcmTokens.length) {
        const userPromises = userFcmTokens.map(async (token) => {
          try {
            await admin.messaging().send({ ...userNotificationMessage, token });
          } catch (error) {
            if (error.errorInfo?.code === "messaging/registration-token-not-registered") {
              userInvalidTokens.push(token);
            }
          }
        });
        await Promise.all(userPromises);
        if (userInvalidTokens.length) {
          await userModel.updateOne(
            { uuid: userid },
            { $pull: { userfcmTokens: { $in: userInvalidTokens } } }
          );
        }
      }
    }

    // Step 7: Send SMS for subscription bookings
    if (mobileNumber && (sts || "").toLowerCase() === "subscription") {
      let cleanedMobile = mobileNumber.replace(/[^0-9]/g, "");
      if (cleanedMobile.length === 10) {
        cleanedMobile = "91" + cleanedMobile;
      }

      // 1️⃣ First subscription SMS
      const smsText1 = `Dear ${personName}, ${hour || "30 days"} Parking subscription for ${vehicleNumber} from ${parkingDate} to ${subscriptionEndDate || ""} at ${vendorName} is confirmed. Fees paid: ${amount}. View invoice on ParkMyWheels app.`;
      const dltTemplateId1 = process.env.VISPL_TEMPLATE_ID_SUBSCRIPTION || "YOUR_SUBSCRIPTION_TEMPLATE_ID";
      await sendSMS(cleanedMobile, smsText1, dltTemplateId1);

      // 2️⃣ Second subscription receipt SMS
      const smsText2 = `Dear ${personName}, your monthly parking subscription confirmed. Period ${parkingDate} to ${subscriptionEndDate || ""} at location ${vendorName}. Fees paid ${amount}. Transaction ID ${newBooking._id}. Download invoice from ParkMyWheels app. Issued by ParkMyWheels-Smart Parking Made Easy.`;
      const dltTemplateId2 = process.env.VISPL_TEMPLATE_SUNRECEIPT || "1007109197298830403";
      await sendSMS(cleanedMobile, smsText2, dltTemplateId2);
    }

    // ✅ Response
    res.status(200).json({
      message: "Booking created successfully",
      bookingId: newBooking._id,
      otp,
      bookType,
      sts,
    });

  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: error.message });
  }
};

// 📦 Common SMS sender
async function sendSMS(to, text, dltContentId) {
  const smsParams = {
    username: process.env.VISPL_USERNAME || "Vayusutha.trans",
    password: process.env.VISPL_PASSWORD || "pdizP",
    unicode: "false",
    from: process.env.VISPL_SENDER_ID || "PRMYWH",
    to,
    text,
    dltContentId,
  };

  try {
    const smsResponse = await axios.get("https://pgapi.vispl.in/fe/api/v1/send", {
      params: smsParams,
      paramsSerializer: (params) => qs.stringify(params, { encode: true }),
      headers: { "User-Agent": "Mozilla/5.0 (Node.js)" },
    });

    console.log("📬 SMS API Response:", smsResponse.data);
  } catch (err) {
    console.error("📛 SMS sending error:", err.message || err);
  }
}

exports.userupdateCancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("BOOKING ID", id);

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(400).json({ success: false, message: "Booking not found" });
    }

    const cancelledDate = moment().format("DD-MM-YYYY");
    const cancelledTime = moment().format("hh:mm A");

    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      {
        status: "Cancelled",
        cancelledStatus: "NoShow",
        cancelledDate,
        cancelledTime
      },
      { new: true }
    );

    // Notification to Vendor: "[Customer Name] has cancelled their booking for [Date & Time]."
    const newNotificationForVendor = new Notification({
      vendorId: booking.vendorId,
      userId: booking.userid,
      bookingId: updatedBooking._id,
      title: "Booking Cancelled by Customer",
      message: `${booking.personName || "A customer"} has cancelled their booking for ${booking.bookingDate || cancelledDate} at ${booking.bookingTime || cancelledTime}.`,
      vehicleType: updatedBooking.vehicleType,
      vehicleNumber: updatedBooking.vehicleNumber,
      sts: updatedBooking.sts,
      createdAt: new Date(),
      read: false,
    });

    await newNotificationForVendor.save();

    // Send notification to vendor via FCM
    const vendorData = await vendorModel.findById(booking.vendorId, { fcmTokens: 1 });
    const fcmTokens = vendorData?.fcmTokens || [];

    if (fcmTokens.length > 0) {
      const invalidTokens = [];

      const promises = fcmTokens.map(async (token) => {
        try {
          const response = await admin.messaging().send({
            token: token,
            notification: {
              title: "Booking Cancelled by Customer",
              body: `${booking.personName || "A customer"} has cancelled their booking for ${booking.bookingDate || cancelledDate} at ${booking.bookingTime || cancelledTime}.`,
            },
            data: {
              bookingId: updatedBooking._id.toString(),
              vehicleType: updatedBooking.vehicleType,
            },
          });
          console.log(`Notification sent to token: ${token}`, response);
        } catch (error) {
          console.error(`Error sending notification to token: ${token}`, error);
          if (error.errorInfo?.code === "messaging/registration-token-not-registered") {
            invalidTokens.push(token);
          }
        }
      });

      await Promise.all(promises);

      if (invalidTokens.length > 0) {
        await vendorModel.updateOne(
          { _id: booking.vendorId },
          { $pull: { fcmTokens: { $in: invalidTokens } } }
        );
        console.log("Removed invalid FCM tokens:", invalidTokens);
      }
    } else {
      console.warn("No FCM tokens available for this vendor.");
    }

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: updatedBooking,
    });
  } catch (error) {
    console.log("err", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.updateApproveBooking = async (req, res) => {
  try {
    console.log("BOOKING ID", req.params);
    const { id } = req.params;
    const { approvedDate, approvedTime } = req.body; // Get manual values from request

    if (!approvedDate || !approvedTime) {
      return res.status(400).json({ success: false, message: "Approved date and time are required" });
    }

    const booking = await Booking.findById(id).populate('vendorId', 'vendorName');
    if (!booking) {
      return res.status(400).json({ success: false, message: "Booking not found" });
    }

    if (booking.status !== "PENDING") {
      return res.status(400).json({ success: false, message: "Only pending bookings can be approved" });
    }

    console.log("approvedDate", approvedDate, "approvedTime", approvedTime);
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { 
        status: "Approved", 
        approvedDate, 
        approvedTime 
      },
      { new: true }
    );

    // Prepare and save user notification to Notification collection
    const userNotification = new Notification({
      vendorId: booking.vendorId._id,
      userId: booking.userid, // Store user's UUID as string
      bookingId: booking._id,
      title: "Booking Approved",
      message: `Your booking with ${booking.vendorName} has been approved for ${approvedDate} at ${approvedTime}`,
      vehicleType: booking.vehicleType,
      vehicleNumber: booking.vehicleNumber,
      createdAt: new Date(),
        notificationdtime:`${approvedDate} ${approvedTime}`,
      read: false,
    });

    await userNotification.save();
    console.log("User notification saved:", userNotification);

    // Prepare FCM notification message for user
    const userNotificationMessage = {
      notification: {
        title: "Booking Approved",
        body: `Your booking with ${booking.vendorName} has been approved for ${approvedDate} at ${approvedTime}`,
      },
      data: {
        bookingId: booking._id.toString(),
        vehicleType: booking.vehicleType,
      },
      android: {
        notification: {
          sound: 'default',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            // badge: 0,
          },
        },
      },
    };

    // Send notification to user
    let sentToUserByUuid = false;
    const user = await userModel.findOne({ uuid: booking.userid }, { userfcmTokens: 1 });
    if (user) {
      const userFcmTokens = user.userfcmTokens || [];
      const userInvalidTokens = [];

      if (userFcmTokens.length > 0) {
        sentToUserByUuid = true;
        const userPromises = userFcmTokens.map(async (token) => {
          try {
            const message = { ...userNotificationMessage, token };
            const response = await admin.messaging().send(message);
            console.log(`✅ User notification sent to ${token}`, response);
          } catch (error) {
            console.error(`❌ Error sending to user token: ${token}`, error);
            if (error.errorInfo?.code === 'messaging/registration-token-not-registered') {
              userInvalidTokens.push(token);
            }
          }
        });

        await Promise.all(userPromises);

        if (userInvalidTokens.length > 0) {
          await userModel.updateOne(
            { uuid: booking.userid },
            { $pull: { userfcmTokens: { $in: userInvalidTokens } } }
          );
          console.log("🧹 Removed invalid user tokens:", userInvalidTokens);
        }
      } else {
        console.warn("ℹ️ No FCM tokens for this user.");
      }
    } else {
      console.warn("⚠️ User not found with UUID:", booking.userid);
    }

    // Fallback: match by mobile number OR vehicle number and send notification
    if (!sentToUserByUuid) {
      try {
        const rawMobile = booking.mobileNumber || '';
        const cleanedMobile = String(rawMobile).replace(/\D/g, '');
        
        // Find users by mobile number OR vehicle number
        const matchedUsers = await userModel.find({
          $or: [
            { userMobile: cleanedMobile },
            { vehicleNumber: booking.vehicleNumber }
          ]
        }, { userfcmTokens: 1 });

        if (matchedUsers && matchedUsers.length > 0) {
          // Collect all FCM tokens from matched users
          const allUserTokens = [];
          const userTokenMap = new Map(); // To track which tokens belong to which user

          matchedUsers.forEach(user => {
            if (user.userfcmTokens?.length > 0) {
              user.userfcmTokens.forEach(token => {
                allUserTokens.push(token);
                userTokenMap.set(token, user._id);
              });
            }
          });

          if (allUserTokens.length > 0) {
            const fallbackInvalidTokens = [];
            const fallbackPromises = allUserTokens.map(async (token) => {
              try {
                const message = { ...userNotificationMessage, token };
                const response = await admin.messaging().send(message);
                console.log(`📲 Fallback (mobile/vehicle) user notification sent to ${token}`, response);
              } catch (error) {
                console.error(`Error sending fallback notification to token: ${token}`, error);
                if (error.errorInfo?.code === 'messaging/registration-token-not-registered') {
                  fallbackInvalidTokens.push(token);
                }
              }
            });

            await Promise.all(fallbackPromises);

            // Remove invalid tokens from respective users
            if (fallbackInvalidTokens.length > 0) {
              const userUpdatePromises = [];
              const tokensByUser = new Map();

              // Group invalid tokens by user
              fallbackInvalidTokens.forEach(token => {
                const userId = userTokenMap.get(token);
                if (userId) {
                  if (!tokensByUser.has(userId)) {
                    tokensByUser.set(userId, []);
                  }
                  tokensByUser.get(userId).push(token);
                }
              });

              // Update each user to remove their invalid tokens
              for (const [userId, tokens] of tokensByUser) {
                userUpdatePromises.push(
                  userModel.updateOne(
                    { _id: userId },
                    { $pull: { userfcmTokens: { $in: tokens } } }
                  )
                );
              }

              await Promise.all(userUpdatePromises);
              console.log("Removed invalid user FCM tokens (mobile/vehicle fallback):", fallbackInvalidTokens);
            }
          } else {
            console.warn(`No FCM tokens found for matched users with mobile: ${cleanedMobile} or vehicle: ${booking.vehicleNumber}`);
          }
        } else {
          console.warn(`No matching user found for mobile: ${cleanedMobile} or vehicle: ${booking.vehicleNumber}`);
        }
      } catch (fallbackErr) {
        console.error("Fallback mobile/vehicle notification error:", fallbackErr);
      }
    }

    res.status(200).json({
      success: true,
      message: "Booking approved successfully",
      data: updatedBooking,
    });
  } catch (error) {
    console.log("err", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCancelBooking = async (req, res) => {
  try {
    console.log("BOOKING ID", req.params);
    const { id } = req.params;

    const booking = await Booking.findById(id).populate('vendorId', 'vendorName');
    if (!booking) {
      return res.status(400).json({ success: false, message: "Booking not found" });
    }

    if (booking.status !== "PENDING") {
      return res.status(400).json({ success: false, message: "Only pending bookings can be cancelled" });
    }

    const cancelledDate = moment().format("DD-MM-YYYY");
    const cancelledTime = moment().format("hh:mm A");

    console.log("cancelledDate", cancelledDate, "cancelledTime", cancelledTime);

    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      {
        status: "Cancelled",
        cancelledDate,
        cancelledTime
      },
      { new: true }
    );

    // Save user notification in Notification collection
    const userNotification = new Notification({
      vendorId: booking.vendorId._id,
      userId: booking.userid,
      bookingId: booking._id,
      title: "Booking Cancelled",
      message: `Your booking with ${booking.vendorId.vendorName} has been cancelled on ${cancelledDate} at ${cancelledTime}`,
      vehicleType: booking.vehicleType,
      vehicleNumber: booking.vehicleNumber,
      createdAt: new Date(),
      notificationdtime: `${cancelledDate} ${cancelledTime}`,
      read: false,
    });

    await userNotification.save();
    console.log("User cancellation notification saved:", userNotification);

    // Prepare FCM message
    const userNotificationMessage = {
      notification: {
        title: "Booking Cancelled",
        body: `Your booking with ${booking.vendorId.vendorName} has been cancelled.`,
      },
      data: {
        bookingId: booking._id.toString(),
        vehicleType: booking.vehicleType,
      },
      android: {
        notification: {
          sound: 'default',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            // badge: 0,
          },
        },
      },
    };

    let sentToUserByUuid = false;
    const user = await userModel.findOne({ uuid: booking.userid }, { userfcmTokens: 1 });
    if (user) {
      const userFcmTokens = user.userfcmTokens || [];
      const userInvalidTokens = [];

      if (userFcmTokens.length > 0) {
        sentToUserByUuid = true;
        const userPromises = userFcmTokens.map(async (token) => {
          try {
            const message = { ...userNotificationMessage, token };
            const response = await admin.messaging().send(message);
            console.log(`✅ Cancellation notification sent to ${token}`, response);
          } catch (error) {
            console.error(`❌ Error sending to token: ${token}`, error);
            if (error.errorInfo?.code === 'messaging/registration-token-not-registered') {
              userInvalidTokens.push(token);
            }
          }
        });

        await Promise.allSettled(userPromises);

        if (userInvalidTokens.length > 0) {
          await userModel.updateOne(
            { uuid: booking.userid },
            { $pull: { userfcmTokens: { $in: userInvalidTokens } } }
          );
          console.log("🧹 Removed invalid user tokens:", userInvalidTokens);
        }
      } else {
        console.warn("ℹ️ No FCM tokens for this user.");
      }
    } else {
      console.warn("⚠️ User not found with UUID:", booking.userid);
    }

    // Fallback: match by mobile number OR vehicle number and send notification
    if (!sentToUserByUuid) {
      try {
        const rawMobile = booking.mobileNumber || '';
        const cleanedMobile = String(rawMobile).replace(/\D/g, '');
        
        // Find users by mobile number OR vehicle number
        const matchedUsers = await userModel.find({
          $or: [
            { userMobile: cleanedMobile },
            { vehicleNumber: booking.vehicleNumber }
          ]
        }, { userfcmTokens: 1 });

        if (matchedUsers && matchedUsers.length > 0) {
          // Collect all FCM tokens from matched users
          const allUserTokens = [];
          const userTokenMap = new Map(); // To track which tokens belong to which user

          matchedUsers.forEach(user => {
            if (user.userfcmTokens?.length > 0) {
              user.userfcmTokens.forEach(token => {
                allUserTokens.push(token);
                userTokenMap.set(token, user._id);
              });
            }
          });

          if (allUserTokens.length > 0) {
            const fallbackInvalidTokens = [];
            const fallbackPromises = allUserTokens.map(async (token) => {
              try {
                const message = { ...userNotificationMessage, token };
                const response = await admin.messaging().send(message);
                console.log(`📲 Fallback (mobile/vehicle) cancellation sent to ${token}`, response);
              } catch (error) {
                console.error(`Error sending fallback cancellation to token: ${token}`, error);
                if (error.errorInfo?.code === 'messaging/registration-token-not-registered') {
                  fallbackInvalidTokens.push(token);
                }
              }
            });

            await Promise.allSettled(fallbackPromises);

            // Remove invalid tokens from respective users
            if (fallbackInvalidTokens.length > 0) {
              const userUpdatePromises = [];
              const tokensByUser = new Map();

              // Group invalid tokens by user
              fallbackInvalidTokens.forEach(token => {
                const userId = userTokenMap.get(token);
                if (userId) {
                  if (!tokensByUser.has(userId)) {
                    tokensByUser.set(userId, []);
                  }
                  tokensByUser.get(userId).push(token);
                }
              });

              // Update each user to remove their invalid tokens
              for (const [userId, tokens] of tokensByUser) {
                userUpdatePromises.push(
                  userModel.updateOne(
                    { _id: userId },
                    { $pull: { userfcmTokens: { $in: tokens } } }
                  )
                );
              }

              await Promise.all(userUpdatePromises);
              console.log("Removed invalid user FCM tokens (mobile/vehicle fallback):", fallbackInvalidTokens);
            }
          } else {
            console.warn(`No FCM tokens found for matched users with mobile: ${cleanedMobile} or vehicle: ${booking.vehicleNumber}`);
          }
        } else {
          console.warn(`No matching user found for mobile: ${cleanedMobile} or vehicle: ${booking.vehicleNumber}`);
        }
      } catch (fallbackErr) {
        console.error("Fallback mobile/vehicle cancellation notification error:", fallbackErr);
      }
    }

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: updatedBooking,
    });
  } catch (error) {
    console.log("err", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNotificationsByVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const notifications = await Notification.find({ vendorId }).sort({ createdAt: -1 });

    if (!notifications || notifications.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No notifications found",
      });
    }

    res.status(200).json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateApprovedCancelBooking = async (req, res) => {
  try {
    console.log("BOOKING ID", req.params);
    const { id } = req.params;

    const booking = await Booking.findById(id).populate('vendorId', 'vendorName');
    if (!booking) {
      return res.status(400).json({ success: false, message: "Booking not found" });
    }

    if (booking.status !== "Approved") {
      return res.status(400).json({ success: false, message: "Only approved bookings can be cancelled" });
    }

    const cancelledDate = moment().format("DD-MM-YYYY");
    const cancelledTime = moment().format("hh:mm A");

    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      {
        status: "Cancelled",
        cancelledDate,
        cancelledTime
      },
      { new: true }
    );

    // Save user notification to DB
    const userNotification = new Notification({
      vendorId: booking.vendorId._id,
      userId: booking.userid,
      bookingId: booking._id,
      title: "Booking Cancelled",
      message: `Your  booking at ${booking.vendorName}  has been cancelled by the vendor."`,
      vehicleType: booking.vehicleType,
      vehicleNumber: booking.vehicleNumber,
      createdAt: new Date(),
      notificationdtime: `${cancelledDate} ${cancelledTime}`,
      read: false,
    });

    await userNotification.save();
    console.log("User cancellation notification saved:", userNotification);

    // Prepare FCM message
    const userNotificationMessage = {
      notification: {
        title: "Booking Cancelled",
        body: `Your  booking at ${booking.vendorName}  has been cancelled by the vendor."`,
      },
      data: {
        bookingId: booking._id.toString(),
        vehicleType: booking.vehicleType,
      },
      android: {
        notification: {
          sound: 'default',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            // badge: 0,
          },
        },
      },
    };

    // Send push notification
    let sentToUserByUuid = false;
    const user = await userModel.findOne({ uuid: booking.userid }, { userfcmTokens: 1 });
    if (user) {
      const userFcmTokens = user.userfcmTokens || [];
      const userInvalidTokens = [];

      if (userFcmTokens.length > 0) {
        sentToUserByUuid = true;
        const sendPromises = userFcmTokens.map(async (token) => {
          try {
            const message = { ...userNotificationMessage, token };
            const response = await admin.messaging().send(message);
            console.log(`✅ Cancelled notification sent to ${token}`, response);
          } catch (error) {
            console.error(`❌ Error sending to token: ${token}`, error);
            if (error.errorInfo?.code === 'messaging/registration-token-not-registered') {
              userInvalidTokens.push(token);
            }
          }
        });

        await Promise.allSettled(sendPromises);

        if (userInvalidTokens.length > 0) {
          await userModel.updateOne(
            { uuid: booking.userid },
            { $pull: { userfcmTokens: { $in: userInvalidTokens } } }
          );
          console.log("🧹 Removed invalid user tokens:", userInvalidTokens);
        }
      } else {
        console.warn("ℹ️ No FCM tokens for this user.");
      }
    } else {
      console.warn("⚠️ User not found with UUID:", booking.userid);
    }

    // Fallback: match by mobile number OR vehicle number and send notification
    if (!sentToUserByUuid) {
      try {
        const rawMobile = booking.mobileNumber || '';
        const cleanedMobile = String(rawMobile).replace(/\D/g, '');
        
        // Find users by mobile number OR vehicle number
        const matchedUsers = await userModel.find({
          $or: [
            { userMobile: cleanedMobile },
            { vehicleNumber: booking.vehicleNumber }
          ]
        }, { userfcmTokens: 1 });

        if (matchedUsers && matchedUsers.length > 0) {
          // Collect all FCM tokens from matched users
          const allUserTokens = [];
          const userTokenMap = new Map(); // To track which tokens belong to which user

          matchedUsers.forEach(user => {
            if (user.userfcmTokens?.length > 0) {
              user.userfcmTokens.forEach(token => {
                allUserTokens.push(token);
                userTokenMap.set(token, user._id);
              });
            }
          });

          if (allUserTokens.length > 0) {
            const fallbackInvalidTokens = [];
            const fallbackPromises = allUserTokens.map(async (token) => {
              try {
                const message = { ...userNotificationMessage, token };
                const response = await admin.messaging().send(message);
                console.log(`📲 Fallback (mobile/vehicle) cancelled notification sent to ${token}`, response);
              } catch (error) {
                console.error(`Error sending fallback cancelled notification to token: ${token}`, error);
                if (error.errorInfo?.code === 'messaging/registration-token-not-registered') {
                  fallbackInvalidTokens.push(token);
                }
              }
            });

            await Promise.allSettled(fallbackPromises);

            // Remove invalid tokens from respective users
            if (fallbackInvalidTokens.length > 0) {
              const userUpdatePromises = [];
              const tokensByUser = new Map();

              // Group invalid tokens by user
              fallbackInvalidTokens.forEach(token => {
                const userId = userTokenMap.get(token);
                if (userId) {
                  if (!tokensByUser.has(userId)) {
                    tokensByUser.set(userId, []);
                  }
                  tokensByUser.get(userId).push(token);
                }
              });

              // Update each user to remove their invalid tokens
              for (const [userId, tokens] of tokensByUser) {
                userUpdatePromises.push(
                  userModel.updateOne(
                    { _id: userId },
                    { $pull: { userfcmTokens: { $in: tokens } } }
                  )
                );
              }

              await Promise.all(userUpdatePromises);
              console.log("Removed invalid user FCM tokens (mobile/vehicle fallback):", fallbackInvalidTokens);
            }
          } else {
            console.warn(`No FCM tokens found for matched users with mobile: ${cleanedMobile} or vehicle: ${booking.vehicleNumber}`);
          }
        } else {
          console.warn(`No matching user found for mobile: ${cleanedMobile} or vehicle: ${booking.vehicleNumber}`);
        }
      } catch (fallbackErr) {
        console.error("Fallback mobile/vehicle cancelled notification error:", fallbackErr);
      }
    }

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: updatedBooking,
    });
  } catch (error) {
    console.log("err", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.allowParking = async (req, res) => {
  try {
    console.log("BOOKING ID", req.params);
    const { id } = req.params;
    const { parkedDate, parkedTime } = req.body; // Get date and time from frontend

    // Validate if date and time are provided
    if (!parkedDate || !parkedTime) {
      return res.status(400).json({
        success: false,
        message: "Parked date and parked time are required",
      });
    }

    // Find the booking and populate vendor details
    const booking = await Booking.findById(id).populate('vendorId', 'vendorName');
    if (!booking) {
      return res.status(400).json({ success: false, message: "Booking not found" });
    }

    // Check if the booking is in Approved status
    if (booking.status !== "Approved") {
      return res.status(400).json({ success: false, message: "Only Approved bookings are allowed for parking" });
    }

    // Update the booking status to PARKED
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      {
        status: "PARKED",
        parkedDate,
        parkedTime,
      },
      { new: true }
    );

    // Create a new notification for the customer
    const userNotification = new Notification({
      vendorId: booking.vendorId._id,
      userId: booking.userid,
      bookingId: updatedBooking._id,
      title: "Parking Started!",
      message: `Your parking time has begun at ${booking.vendorName || 'Parking Location'}.`,
      vehicleType: booking.vehicleType,
      vehicleNumber: booking.vehicleNumber,
      createdAt: new Date(),
      notificationdtime: `${parkedDate} ${parkedTime}`,
      read: false,
      sts: booking.sts,
      bookingtype: booking.bookType,
      vendorname: booking.vendorId.vendorName,
      parkingDate: parkedDate,
      parkingTime: parkedTime,
      status: updatedBooking.status,
    });

    await userNotification.save();
    console.log("Customer parking start notification saved:", userNotification);

    // Prepare FCM notification message for the customer
    const userNotificationMessage = {
      notification: {
        title: "Parking Started!",
        body: `Your parking time has begun at ${booking.vendorName || 'Parking Location'}.`,
      },
      data: {
        bookingId: updatedBooking._id.toString(),
        vehicleType: booking.vehicleType,
      },
      android: {
        notification: {
          sound: 'default',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            // badge: 0,
          },
        },
      },
    };

    // Send push notification to the customer
    let sentToUserByUuid = false;
    const user = await userModel.findOne({ uuid: booking.userid }, { userfcmTokens: 1 });
    if (user) {
      const userFcmTokens = user.userfcmTokens || [];
      const userInvalidTokens = [];

      if (userFcmTokens.length > 0) {
        sentToUserByUuid = true;
        const userPromises = userFcmTokens.map(async (token) => {
          try {
            const message = { ...userNotificationMessage, token };
            const response = await admin.messaging().send(message);
            console.log(`✅ Customer parking start notification sent to ${token}`, response);
          } catch (error) {
            console.error(`❌ Error sending to customer token: ${token}`, error);
            if (error.errorInfo?.code === 'messaging/registration-token-not-registered') {
              userInvalidTokens.push(token);
            }
          }
        });

        await Promise.all(userPromises);

        // Remove invalid tokens if any
        if (userInvalidTokens.length > 0) {
          await userModel.updateOne(
            { uuid: booking.userid },
            { $pull: { userfcmTokens: { $in: userInvalidTokens } } }
          );
          console.log("🧹 Removed invalid customer tokens:", userInvalidTokens);
        }
      } else {
        console.warn("ℹ️ No FCM tokens for this customer.");
      }
    } else {
      console.warn("⚠️ Customer not found with UUID:", booking.userid);
    }

    // Fallback: match by mobile number OR vehicle number and send notification
    if (!sentToUserByUuid) {
      try {
        const rawMobile = booking.mobileNumber || '';
        const cleanedMobile = String(rawMobile).replace(/\D/g, '');
        
        // Find users by mobile number OR vehicle number
        const matchedUsers = await userModel.find({
          $or: [
            { userMobile: cleanedMobile },
            { vehicleNumber: booking.vehicleNumber }
          ]
        }, { userfcmTokens: 1 });

        if (matchedUsers && matchedUsers.length > 0) {
          // Collect all FCM tokens from matched users
          const allUserTokens = [];
          const userTokenMap = new Map(); // To track which tokens belong to which user

          matchedUsers.forEach(user => {
            if (user.userfcmTokens?.length > 0) {
              user.userfcmTokens.forEach(token => {
                allUserTokens.push(token);
                userTokenMap.set(token, user._id);
              });
            }
          });

          if (allUserTokens.length > 0) {
            const fallbackInvalidTokens = [];
            const fallbackPromises = allUserTokens.map(async (token) => {
              try {
                const message = { ...userNotificationMessage, token };
                const response = await admin.messaging().send(message);
                console.log(`📲 Fallback (mobile/vehicle) parking started sent to ${token}`, response);
              } catch (error) {
                console.error(`Error sending fallback parking started to token: ${token}`, error);
                if (error.errorInfo?.code === 'messaging/registration-token-not-registered') {
                  fallbackInvalidTokens.push(token);
                }
              }
            });

            await Promise.all(fallbackPromises);

            // Remove invalid tokens from respective users
            if (fallbackInvalidTokens.length > 0) {
              const userUpdatePromises = [];
              const tokensByUser = new Map();

              // Group invalid tokens by user
              fallbackInvalidTokens.forEach(token => {
                const userId = userTokenMap.get(token);
                if (userId) {
                  if (!tokensByUser.has(userId)) {
                    tokensByUser.set(userId, []);
                  }
                  tokensByUser.get(userId).push(token);
                }
              });

              // Update each user to remove their invalid tokens
              for (const [userId, tokens] of tokensByUser) {
                userUpdatePromises.push(
                  userModel.updateOne(
                    { _id: userId },
                    { $pull: { userfcmTokens: { $in: tokens } } }
                  )
                );
              }

              await Promise.all(userUpdatePromises);
              console.log("Removed invalid user FCM tokens (mobile/vehicle fallback):", fallbackInvalidTokens);
            }
          } else {
            console.warn(`No FCM tokens found for matched users with mobile: ${cleanedMobile} or vehicle: ${booking.vehicleNumber}`);
          }
        } else {
          console.warn(`No matching user found for mobile: ${cleanedMobile} or vehicle: ${booking.vehicleNumber}`);
        }
      } catch (fallbackErr) {
        console.error("Fallback mobile/vehicle parking started notification error:", fallbackErr);
      }
    }

    // Send subscription notifications if booking is subscription with spaceid
    if ((booking.sts || "").toLowerCase() === "subscription") {
      try {
        // Check if vendor has spaceid
        const vendorIdToFind = booking.vendorId._id || booking.vendorId;
        const vendor = await vendorModel.findOne({ _id: vendorIdToFind }, { spaceid: 1, vendorName: 1, fcmTokens: 1 });
        
        if (vendor && vendor.spaceid) {
          console.log("📧 Sending subscription notifications for spaceid booking at allowParking time");
          
          // Send subscription SMS messages
          if (booking.mobileNumber) {
            let cleanedMobile = booking.mobileNumber.replace(/[^0-9]/g, "");
            if (cleanedMobile.length === 10) {
              cleanedMobile = "91" + cleanedMobile;
            }

            // 1️⃣ First subscription SMS
            const smsText1 = `Dear ${booking.personName}, ${booking.hour || "30 days"} Parking subscription for ${booking.vehicleNumber} from ${booking.parkingDate} to ${booking.subsctiptionenddate || ""} at ${booking.vendorName || vendor.vendorName} is confirmed. Fees paid: ${booking.amount}. View invoice on ParkMyWheels app.`;
            const dltTemplateId1 = process.env.VISPL_TEMPLATE_ID_SUBSCRIPTION || "YOUR_SUBSCRIPTION_TEMPLATE_ID";
            await sendSMS(cleanedMobile, smsText1, dltTemplateId1);

            // 2️⃣ Second subscription receipt SMS
            const smsText2 = `Dear ${booking.personName}, your monthly parking subscription confirmed. Period ${booking.parkingDate} to ${booking.subsctiptionenddate || ""} at location ${booking.vendorName || vendor.vendorName}. Fees paid ${booking.amount}. Transaction ID ${booking.invoice || updatedBooking._id}. Download invoice from ParkMyWheels app. Issued by ParkMyWheels-Smart Parking Made Easy.`;
            const dltTemplateId2 = process.env.VISPL_TEMPLATE_SUNRECEIPT || "1007109197298830403";
            await sendSMS(cleanedMobile, smsText2, dltTemplateId2);
          }

          // Send invoice ready notification
          try {
            await sendInvoiceReadyNotification(updatedBooking, updatedBooking._id);
          } catch (invoiceErr) {
            console.error(`[${new Date().toISOString()}] ❌ Error sending invoice notification:`, invoiceErr);
          }

          // Send vendor notification (database)
          const vendorNotification = new Notification({
            vendorId: booking.vendorId._id || booking.vendorId,
            userId: booking.userid,
            bookingId: updatedBooking._id,
            title: "New Booking Received",
            message: `New booking received from ${booking.personName} for ${booking.parkingDate} at ${booking.parkingTime}`,
            vehicleType: booking.vehicleType,
            vehicleNumber: booking.vehicleNumber,
            createdAt: new Date(),
            read: false,
            sts: booking.sts,
            bookingtype: booking.bookType,
            otp: booking.otp?.toString() || "",
            vendorname: booking.vendorName || vendor.vendorName,
            parkingDate: booking.parkingDate,
            parkingTime: booking.parkingTime,
            bookingdate: booking.bookingDate,
            schedule: `${booking.parkingDate} ${booking.parkingTime}`,
            notificationdtime: `${booking.bookingDate} ${booking.bookingTime}`,
            status: booking.status,
          });
          await vendorNotification.save();

          // Send user notification (database) - booking confirmed
          const userBookingNotification = new Notification({
            vendorId: booking.vendorId._id || booking.vendorId,
            userId: booking.userid,
            bookingId: updatedBooking._id,
            title: "Booking Confirmed",
            message: `Your booking with ${booking.vendorName || vendor.vendorName} has been successfully confirmed for ${booking.parkingDate} at ${booking.parkingTime}`,
            vehicleType: booking.vehicleType,
            vehicleNumber: booking.vehicleNumber,
            createdAt: new Date(),
            read: false,
            sts: booking.sts,
            bookingtype: booking.bookType,
            otp: booking.otp?.toString() || "",
            vendorname: booking.vendorName || vendor.vendorName,
            parkingDate: booking.parkingDate,
            parkingTime: booking.parkingTime,
            bookingdate: booking.bookingDate,
            notificationdtime: `${booking.bookingDate} ${booking.bookingTime}`,
            schedule: `${booking.parkingDate} ${booking.parkingTime}`,
            status: booking.status,
          });
          await userBookingNotification.save();

          // Send FCM notification to vendor
          if (vendor.fcmTokens && vendor.fcmTokens.length > 0) {
            const sendFcmNotification = async (tokens, messageTemplate, model, idField, idType = '_id') => {
              const invalidTokens = [];
              const promises = tokens.map(async (token) => {
                try {
                  await admin.messaging().send({ ...messageTemplate, token });
                } catch (error) {
                  if (error.errorInfo?.code === "messaging/registration-token-not-registered") {
                    invalidTokens.push(token);
                  }
                }
              });
              await Promise.all(promises);
              if (invalidTokens.length > 0) {
                await model.updateOne(
                  { [idType]: idField },
                  { $pull: { fcmTokens: { $in: invalidTokens } } }
                );
              }
            };

            const vendorFcmMessage = {
              notification: { title: "New Booking Received", body: `New booking from ${booking.personName}` },
              android: { notification: { sound: "default", priority: "high" } },
              apns: { payload: { aps: { sound: "default" } } },
            };
            await sendFcmNotification(vendor.fcmTokens, vendorFcmMessage, vendorModel, booking.vendorId._id || booking.vendorId, '_id');
          }

          // Send FCM notification to user
          const user = await userModel.findOne({ uuid: booking.userid }, { userfcmTokens: 1 });
          if (user?.userfcmTokens?.length > 0) {
            const sendFcmNotification = async (tokens, messageTemplate, model, idField, idType = '_id') => {
              const invalidTokens = [];
              const promises = tokens.map(async (token) => {
                try {
                  await admin.messaging().send({ ...messageTemplate, token });
                } catch (error) {
                  if (error.errorInfo?.code === "messaging/registration-token-not-registered") {
                    invalidTokens.push(token);
                  }
                }
              });
              await Promise.all(promises);
              if (invalidTokens.length > 0) {
                await model.updateOne(
                  { [idType]: idField },
                  { $pull: { userfcmTokens: { $in: invalidTokens } } }
                );
              }
            };

            const userFcmMessage = {
              notification: { title: "Booking Confirmed", body: `Your booking with ${booking.vendorName || vendor.vendorName} is confirmed` },
              data: { bookingId: updatedBooking._id.toString(), vehicleType: booking.vehicleType },
              android: { notification: { sound: "default", priority: "high" } },
              apns: { payload: { aps: { sound: "default" } } },
            };
            await sendFcmNotification(user.userfcmTokens, userFcmMessage, userModel, booking.userid, 'uuid');
          }
        }
      } catch (subscriptionNotifErr) {
        console.error(`[${new Date().toISOString()}] ❌ Error sending subscription notifications at allowParking:`, subscriptionNotifErr);
      }
    }

    // Send response
    res.status(200).json({
      success: true,
      message: "Vehicle Parked Successfully",
      data: updatedBooking,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.directallowParking = async (req, res) => {
  try {
    console.log("BOOKING ID", req.params);
    const { id } = req.params;
    const { parkedDate, parkedTime } = req.body; // Get date and time from frontend

    // Validate if date and time are provided
    if (!parkedDate || !parkedTime) {
      return res.status(400).json({
        success: false,
        message: "Parked date and parked time are required",
      });
    }

    // Find the booking and populate vendor details
    const booking = await Booking.findById(id).populate('vendorId', 'vendorName');
    if (!booking) {
      return res.status(400).json({ success: false, message: "Booking not found" });
    }



    // Update the booking status to PARKED
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      {
        status: "PARKED",
        parkedDate,
        parkedTime,
      },
      { new: true }
    );

    // Create a new notification for the customer
    const userNotification = new Notification({
      vendorId: booking.vendorId._id,
      userId: booking.userid,
      bookingId: updatedBooking._id,
      title: "Parking Started!",
      message: `Your parking time has begun at ${booking.vendorName || 'Parking Location'}.`,
      vehicleType: booking.vehicleType,
      vehicleNumber: booking.vehicleNumber,
      createdAt: new Date(),
      notificationdtime: `${parkedDate} ${parkedTime}`,
      read: false,
      sts: booking.sts,
      bookingtype: booking.bookType,
      vendorname: booking.vendorId.vendorName,
      parkingDate: parkedDate,
      parkingTime: parkedTime,
      status: updatedBooking.status,
    });

    await userNotification.save();
    console.log("Customer parking start notification saved:", userNotification);

    // Prepare FCM notification message for the customer
    const userNotificationMessage = {
      notification: {
        title: "Parking Started!",
        body: `Your parking time has begun at ${booking.vendorName || 'Parking Location'}.`,
      },
      data: {
        bookingId: updatedBooking._id.toString(),
        vehicleType: booking.vehicleType,
      },
      android: {
        notification: {
          sound: 'default',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            // badge: 0,
          },
        },
      },
    };

    // Send push notification to the customer
    let sentToUserByUuid = false;
    const user = await userModel.findOne({ uuid: booking.userid }, { userfcmTokens: 1 });
    if (user) {
      const userFcmTokens = user.userfcmTokens || [];
      const userInvalidTokens = [];

      if (userFcmTokens.length > 0) {
        sentToUserByUuid = true;
        const userPromises = userFcmTokens.map(async (token) => {
          try {
            const message = { ...userNotificationMessage, token };
            const response = await admin.messaging().send(message);
            console.log(`✅ Customer parking start notification sent to ${token}`, response);
          } catch (error) {
            console.error(`❌ Error sending to customer token: ${token}`, error);
            if (error.errorInfo?.code === 'messaging/registration-token-not-registered') {
              userInvalidTokens.push(token);
            }
          }
        });

        await Promise.all(userPromises);

        // Remove invalid tokens if any
        if (userInvalidTokens.length > 0) {
          await userModel.updateOne(
            { uuid: booking.userid },
            { $pull: { userfcmTokens: { $in: userInvalidTokens } } }
          );
          console.log("🧹 Removed invalid customer tokens:", userInvalidTokens);
        }
      } else {
        console.warn("ℹ️ No FCM tokens for this customer.");
      }
    } else {
      console.warn("⚠️ Customer not found with UUID:", booking.userid);
    }

    // Fallback: match by mobile number and send notification
    if (!sentToUserByUuid) {
      try {
        const rawMobile = booking.mobileNumber || '';
        const cleanedMobile = String(rawMobile).replace(/\D/g, '');
        if (cleanedMobile) {
          const matchedUserByMobile = await userModel.findOne({ userMobile: cleanedMobile }, { userfcmTokens: 1 });
          if (matchedUserByMobile && matchedUserByMobile.userfcmTokens?.length > 0) {
            const fallbackInvalidTokens = [];
            const fallbackPromises = matchedUserByMobile.userfcmTokens.map(async (token) => {
              try {
                const message = { ...userNotificationMessage, token };
                const response = await admin.messaging().send(message);
                console.log(`📲 Fallback (mobile) parking started sent to ${token}`, response);
              } catch (error) {
                console.error(`Error sending fallback (mobile) parking started to token: ${token}`, error);
                if (error.errorInfo?.code === 'messaging/registration-token-not-registered') {
                  fallbackInvalidTokens.push(token);
                }
              }
            });

            await Promise.all(fallbackPromises);

            if (fallbackInvalidTokens.length > 0) {
              await userModel.updateOne(
                { userMobile: cleanedMobile },
                { $pull: { userfcmTokens: { $in: fallbackInvalidTokens } } }
              );
              console.log("Removed invalid user FCM tokens (mobile fallback):", fallbackInvalidTokens);
            }
          } else {
            console.warn(`No matching user or no FCM tokens found for mobile: ${cleanedMobile}`);
          }
        }
      } catch (fallbackErr) {
        console.error("Fallback mobile parking started notification error:", fallbackErr);
      }
    }

    // Send response
    res.status(200).json({
      success: true,
      message: "Vehicle Parked Successfully",
      data: updatedBooking,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.getBookingsByVendorId = async (req, res) => {
  try {
    const { id } = req.params; 

    const bookings = await Booking.find({ vendorId: id });

    if (!bookings || bookings.length === 0) {
      return res.status(400).json({ message: "No bookings found for this vendor" });
    }
    res.status(200).json({ bookings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBookingsparked = async (req, res) => {
  try {
    const { id } = req.params; 

    const bookings = await Booking.find({ 
      vendorId: id,
      status: { $in: ['PARKED', 'Parked'] } 
    });

    if (!bookings || bookings.length === 0) {
      return res.status(400).json({ message: "No parked bookings found for this vendor" });
    }
    res.status(200).json({ bookings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.getBookingsByuserid = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch user's mobile number
    const user = await User.findOne({ uuid: id }, "userMobile");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const userMobile = user.userMobile;

    // Fetch user's vehicles
    const vehicles = await Vehicle.find({ userId: id }, "vehicleNo");
    const vehicleNumbers = vehicles.map(v => v.vehicleNo);

    // Fetch bookings by userid OR mobileNumber OR vehicleNumber
    const bookings = await Booking.find({
      $or: [
        { userid: id },
        { mobileNumber: userMobile },
        { vehicleNumber: { $in: vehicleNumbers } }
      ]
    });

    if (!bookings || bookings.length === 0) {
      return res.status(200).json({ message: "No bookings found for this user" });
    }

    const convertTo24Hour = (time) => {
      if (!time) return '00:00'; // Default if time is missing
      const [timePart, modifier] = time.split(' ');
      let [hours, minutes] = timePart.split(':');
      if (modifier === 'PM' && hours !== '12') {
        hours = parseInt(hours, 10) + 12;
      }
      if (modifier === 'AM' && hours === '12') {
        hours = '00';
      }
      return `${hours}:${minutes}`;
    };

    // Sort by bookingDate + bookingTime (latest first)
    bookings.sort((a, b) => {
      const dateA = new Date(`${a.bookingDate.split('-').reverse().join('-')}T${convertTo24Hour(a.bookingTime)}`);
      const dateB = new Date(`${b.bookingDate.split('-').reverse().join('-')}T${convertTo24Hour(b.bookingTime)}`);
      return dateB - dateA;
    });

    res.status(200).json({ bookings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.fetchmonthlysubuser = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch user's mobile number
    const user = await User.findOne({ uuid: id }, "userMobile");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const userMobile = user.userMobile;

    // Fetch user's vehicles
    const vehicles = await Vehicle.find({ userId: id }, "vehicleNo");
    const vehicleNumbers = vehicles.map(v => v.vehicleNo);

    // Fetch bookings that are Subscription type only
    const bookings = await Booking.find({
      sts: "Subscription",
      $or: [
        { userid: id },
        { mobileNumber: userMobile },
        { vehicleNumber: { $in: vehicleNumbers } }
      ]
    });

    if (!bookings || bookings.length === 0) {
      return res.status(200).json({ message: "No subscription bookings found for this user" });
    }

    // Enhanced matching display
    console.log(`\n📋 === MONTHLY SUBSCRIPTION BOOKING MATCHING SUMMARY ===`);
    console.log(`User ID: ${id}`);
    console.log(`User Mobile: ${userMobile}`);
    console.log(`User Vehicles: ${vehicleNumbers.join(', ') || 'None'}`);
    console.log(`\n📋 === MATCHED SUBSCRIPTION BOOKINGS ===`);
    console.log(`🚗 VEHICLE NUMBER | 📱 MOBILE NUMBER      | MATCH TYPE`);
    console.log(`-----------------|----------------------|------------`);

    bookings.forEach((booking) => {
      const vehicleNum = (booking.vehicleNumber || 'No vehicle').padEnd(15);
      const mobile = (booking.mobileNumber || 'NO MOBILE').padEnd(20);
      
      // Determine match type
      let matchType = '';
      if (booking.userid === id) {
        matchType = 'USER ID';
      } else if (booking.mobileNumber === userMobile) {
        matchType = 'MOBILE';
      } else if (vehicleNumbers.includes(booking.vehicleNumber)) {
        matchType = 'VEHICLE';
      } else {
        matchType = 'UNKNOWN';
      }
      
      console.log(`${vehicleNum} | ${mobile} | ${matchType}`);
    });

    // Show breakdown
    const matchedByUserId = bookings.filter(b => b.userid === id).length;
    const matchedByMobile = bookings.filter(b => b.mobileNumber === userMobile && b.userid !== id).length;
    const matchedByVehicle = bookings.filter(b => vehicleNumbers.includes(b.vehicleNumber) && b.userid !== id && b.mobileNumber !== userMobile).length;

    console.log(`\n📊 Breakdown:`);
    console.log(`   - Matched by User ID: ${matchedByUserId}`);
    console.log(`   - Matched by Mobile: ${matchedByMobile}`);
    console.log(`   - Matched by Vehicle: ${matchedByVehicle}`);
    console.log(`   - Total: ${bookings.length}`);
    console.log(`📋 === END MONTHLY SUBSCRIPTION MATCHING SUMMARY ===\n`);

    const convertTo24Hour = (time) => {
      if (!time) return '00:00'; 
      const [timePart, modifier] = time.split(' ');
      let [hours, minutes] = timePart.split(':');
      if (modifier === 'PM' && hours !== '12') hours = parseInt(hours, 10) + 12;
      if (modifier === 'AM' && hours === '12') hours = '00';
      return `${hours}:${minutes}`;
    };

    // Sort by bookingDate + bookingTime (latest first)
    bookings.sort((a, b) => {
      const dateA = new Date(`${a.bookingDate.split('-').reverse().join('-')}T${convertTo24Hour(a.bookingTime)}`);
      const dateB = new Date(`${b.bookingDate.split('-').reverse().join('-')}T${convertTo24Hour(b.bookingTime)}`);
      return dateB - dateA;
    });

    // Add spaceid from vendor collection to each booking
    const bookingsWithSpaceid = await Promise.all(
      bookings.map(async (booking) => {
        const bookingObj = booking.toObject ? booking.toObject() : booking;
        
        // Fetch vendor by vendorId to get spaceid
        if (booking.vendorId) {
          const vendor = await vendorModel.findOne({ vendorId: booking.vendorId });
          if (vendor && vendor.spaceid) {
            bookingObj.spaceid = vendor.spaceid;
          }
        }
        
        return bookingObj;
      })
    );

    res.status(200).json({ bookings: bookingsWithSpaceid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.withoutsubgetBookingsByuserid = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the user to get their mobile number
    const user = await User.findOne({ uuid: id }, "userMobile");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const userMobile = user.userMobile;

    // Fetch user's vehicles to get vehicle numbers
    const vehicles = await Vehicle.find({ userId: id }, "vehicleNo");
    const vehicleNumbers = vehicles.map(v => v.vehicleNo);

    // Find bookings where:
    // 1. userid matches OR
    // 2. mobileNumber matches OR
    // 3. vehicleNumber matches user's vehicles
    // Excluding Subscription bookings
    const bookings = await Booking.find({
      $and: [
        { sts: { $ne: "Subscription" } },
        {
          $or: [
            { userid: id },
            { mobileNumber: userMobile },
            { vehicleNumber: { $in: vehicleNumbers } }
          ]
        }
      ]
    });

    if (!bookings || bookings.length === 0) {
      return res.status(200).json({ message: "No bookings found for this user" });
    }

    // Log bookings matched by mobile number only
    const mobileMatchedBookings = bookings.filter(
      booking => booking.mobileNumber === userMobile && booking.userid !== id
    );
    console.log("Bookings matched by mobile number only:", mobileMatchedBookings);

    // Robust timestamp generator (handles various date/time formats)
    const getSortTimestamp = (booking) => {
      const dateStr = booking.bookingDate || "";
      const timeStr = booking.bookingTime || "";
      const patterns = [
        "DD-MM-YYYY hh:mm A",
        "DD/MM/YYYY hh:mm A",
        "DD-MM-YYYY HH:mm",
        "DD/MM/YYYY HH:mm",
        "YYYY-MM-DD HH:mm",
        "YYYY/MM/DD HH:mm",
        "DD-MM-YYYY",
        "DD/MM/YYYY",
        "YYYY-MM-DD",
        "YYYY/MM/DD"
      ];
      const combined = `${dateStr} ${timeStr}`.trim();
      let m = moment(combined, patterns, true);
      if (!m.isValid()) {
        m = moment(dateStr, patterns, true);
      }
      if (!m.isValid()) {
        if (booking.createdAt) {
          const created = moment(booking.createdAt);
          if (created.isValid()) return created.valueOf();
        }
        return 0;
      }
      return m.valueOf();
    };

    // Sort bookings by parsed timestamp (descending): latest first
    bookings.sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a));

    // Return all matched bookings
    res.status(200).json({ bookings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id); 

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.status(200).json({ booking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find();

    if (bookings.length === 0) {
      return res.status(404).json({ message: "No bookings found" });
    }

    res.status(200).json({ bookings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.status(200).json({ message: "Booking deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateBookingStatus = async(req,res)=>{
  try{
    console.log("Parking Started to update status")

  }catch(err){
    console.log("err in updare the status",err)
  }
}

exports.updateBooking = async (req, res) => {
  try {
    const { carType, personName, mobileNumber, vehicleNumber, isSubscription, bookingDate, bookingTime } = req.body;

    if (!carType || !personName || !mobileNumber || !vehicleNumber || !bookingDate) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id, 
      {
        carType,
        personName,
        mobileNumber,
        vehicleNumber,
        isSubscription,
        bookingDate,
        bookingTime
      },
      { new: true }
    );

    if (!updatedBooking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.status(200).json({ message: "Booking updated successfully", booking: updatedBooking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.updateBookingAmountAndHour = async (req, res) => {
  try {
    const { amount, hour, gstamout, totalamout, handlingfee } = req.body;

    if (amount === undefined || hour === undefined) {
      return res.status(400).json({ error: "Amount and hour are required" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Fetch vendor details to get platform fee percentage
    const vendor = await vendorModel.findById(booking.vendorId);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // Always round UP the platform fee percentage (e.g., 1.05 → 2, 2.4 → 3, 2.6 → 3)
    let platformFeePercentage = parseFloat(vendor.platformfee) || 0;
    platformFeePercentage = Math.ceil(platformFeePercentage);

    // Round up amounts to the next whole number
    const roundedAmount = Math.ceil(parseFloat(amount) || 0);
    const roundedGstAmount =
      gstamout !== undefined
        ? Math.ceil(parseFloat(gstamout) || 0)
        : undefined;
    const roundedTotalAmount =
      totalamout !== undefined
        ? Math.ceil(parseFloat(totalamout) || 0)
        : roundedAmount;

    // Calculate platform fee and receivable amount using rounded total amount
    const platformfee = (roundedTotalAmount * platformFeePercentage) / 100;
    const receivableAmount = roundedTotalAmount - platformfee;

    // Get India date & time without moment.js
    const nowInIndia = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const [datePart, timePart] = nowInIndia.split(", "); // "DD/MM/YYYY", "HH:MM:SS AM/PM"

    // Convert DD/MM/YYYY to DD-MM-YYYY
    const [day, month, year] = datePart.split("/");
    const exitvehicledate = `${day}-${month}-${year}`;
    
    // Format time as "HH:MM AM/PM" (remove seconds if present)
    const parts = timePart.split(" ");
    const ampm = parts[parts.length - 1]; // Get AM/PM from the end
    const timeOnly = parts.slice(0, -1).join(" "); // Get time part (everything except AM/PM)
    const timeComponents = timeOnly.split(":");
    const hours = timeComponents[0];
    const minutes = timeComponents[1];
    const exitvehicletime = `${hours}:${minutes} ${ampm}`; // Format: "HH:MM AM/PM"

    // Update booking fields
    booking.amount = roundedAmount.toFixed(2);
    booking.hour = hour;
    booking.exitvehicledate = exitvehicledate;
    booking.exitvehicletime = exitvehicletime;
    booking.status = "COMPLETED";

    // Optional fields
    if (roundedGstAmount !== undefined)
      booking.gstamout = roundedGstAmount.toFixed(2);
    if (roundedTotalAmount !== undefined)
      booking.totalamout = roundedTotalAmount.toFixed(2);
    if (handlingfee !== undefined)
      booking.handlingfee = parseFloat(handlingfee).toFixed(2);

    // Add calculated fields (round to 2 decimals)
    booking.releasefee = platformfee.toFixed(2);
    booking.recievableamount = receivableAmount.toFixed(2);
    booking.payableamout = receivableAmount.toFixed(2);

    const updatedBooking = await booking.save();
    if (updatedBooking.mobileNumber) {
      const smsText = `Hi ${updatedBooking.personName || "Customer"}, your vehicle ${updatedBooking.vehicleNumber} has exited from ${updatedBooking.vendorName} on ${updatedBooking.exitvehicledate}. Parking duration ${updatedBooking.hour} hrs. Amount paid ₹${updatedBooking.totalamout}. Thank you for parking with ParkMyWheels.`;

      await sendSMS(
        updatedBooking.mobileNumber,
        smsText,
        process.env.VISPL_TEMPLATE_ID_EXIT || "1207163034300843873"
      );
    }

    // Send Invoice Ready Notification after exit
    try {
      await sendInvoiceReadyNotification(updatedBooking, updatedBooking._id);
    } catch (invoiceErr) {
      console.error(`[${new Date().toISOString()}] ❌ Error sending invoice notification after exit:`, invoiceErr);
    }

    res.status(200).json({
      message: "Booking updated successfully",
      booking: {
        _id: updatedBooking._id.toString(), // Include booking ID for feedback
        amount: updatedBooking.amount,
        hour: updatedBooking.hour,
        gstamout: updatedBooking.gstamout,
        totalamout: updatedBooking.totalamout,
        handlingfee: updatedBooking.handlingfee,
        releasefee: updatedBooking.releasefee,
        recievableamount: updatedBooking.recievableamount,
        payableamout: updatedBooking.payableamout,
        exitvehicledate: updatedBooking.exitvehicledate,
        exitvehicletime: updatedBooking.exitvehicletime,
        status: updatedBooking.status,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

async function sendSMS(to, text, dltContentId) {
  const smsParams = {
    username: process.env.VISPL_USERNAME || "Vayusutha.trans",
    password: process.env.VISPL_PASSWORD || "pdizP",
    unicode: "true", // enable for ₹ symbol
    from: process.env.VISPL_SENDER_ID || "PRMYWH",
    to,
    text,
    dltContentId,
  };

  try {
    const smsResponse = await axios.post(
      "https://pgapi.vispl.in/fe/api/v1/send",
      qs.stringify(smsParams),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    console.log("📬 SMS API Response:", smsResponse.data);
  } catch (err) {
    console.error("📛 SMS sending error:", err.response?.data || err.message || err);
  }
}

// ------------------------------------------------------------------
// Helper function: Send Invoice Ready Notification
// ------------------------------------------------------------------
const sendInvoiceReadyNotification = async (booking, bookingId) => {
  try {
    const invoiceId = booking.invoiceid || booking.invoice || bookingId || booking._id;
    const title = "GST Invoice Ready";
    const message = `Your invoice for ${invoiceId} is ready. Download now.`;
    
    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const [datePart, timePart] = now.split(", ");
    const [day, month, year] = datePart.split("/");
    const notificationdtime = `${day}-${month}-${year} ${timePart}`;

    // Save notification to database
    try {
      const notification = new Notification({
        vendorId: booking.vendorId || "",
        userId: booking.userid || "",
        bookingId: String(bookingId),
        title,
        message,
        vehicleType: booking.vehicleType || "",
        vehicleNumber: booking.vehicleNumber || "",
        sts: "invoice_ready",
        bookingtype: booking.bookType || booking.sts || "booking",
        status: "info",
        read: false,
        notificationdtime,
        vendorname: booking.vendorName || "",
      });
      await notification.save();
      console.log(`[${new Date().toISOString()}] ✅ Invoice ready notification saved for booking ${bookingId}`);
    } catch (notifErr) {
      console.error(`[${new Date().toISOString()}] ❌ Failed to save invoice notification for booking ${bookingId}:`, notifErr);
    }

    // Send FCM notification to customer
    if (booking.userid) {
      try {
        const user = await userModel.findOne(
          { uuid: booking.userid },
          { userfcmTokens: 1, userMobile: 1 }
        );

        if (!user) {
          // Try alternative user ID fields
          const user2 = await userModel.findOne(
            { _id: booking.userid },
            { userfcmTokens: 1, userMobile: 1 }
          );
          if (!user2) {
            const user3 = await userModel.findOne(
              { userid: booking.userid },
              { userfcmTokens: 1, userMobile: 1 }
            );
            if (user3) {
              const tokens = user3.userfcmTokens || [];
              if (tokens.length > 0) {
                const fcmPayload = {
                  notification: { title, body: message },
                  android: { notification: { sound: "default", priority: "high" } },
                  apns: { payload: { aps: { sound: "default" } } },
                  data: {
                    bookingId: String(bookingId),
                    invoiceId: String(invoiceId),
                    type: "invoice_ready",
                    bookingType: booking.bookType || booking.sts || "booking",
                  },
                };

                const invalidTokens = [];
                for (const token of tokens) {
                  try {
                    await admin.messaging().send({ ...fcmPayload, token });
                    console.log(`[${new Date().toISOString()}] ✅ Invoice FCM sent to customer for booking ${bookingId}`);
                  } catch (fcmErr) {
                    if (fcmErr?.errorInfo?.code === "messaging/registration-token-not-registered") {
                      invalidTokens.push(token);
                    }
                    console.error(`[${new Date().toISOString()}] ❌ FCM error for invoice notification:`, fcmErr?.errorInfo?.code || fcmErr?.message);
                  }
                }

                if (invalidTokens.length > 0) {
                  await userModel.updateOne(
                    { userid: booking.userid },
                    { $pull: { userfcmTokens: { $in: invalidTokens } } }
                  );
                }
              }
            }
          } else {
            const tokens = user2.userfcmTokens || [];
            if (tokens.length > 0) {
              const fcmPayload = {
                notification: { title, body: message },
                android: { notification: { sound: "default", priority: "high" } },
                apns: { payload: { aps: { sound: "default" } } },
                data: {
                  bookingId: String(bookingId),
                  invoiceId: String(invoiceId),
                  type: "invoice_ready",
                  bookingType: booking.bookType || booking.sts || "booking",
                },
              };

              const invalidTokens = [];
              for (const token of tokens) {
                try {
                  await admin.messaging().send({ ...fcmPayload, token });
                  console.log(`[${new Date().toISOString()}] ✅ Invoice FCM sent to customer for booking ${bookingId}`);
                } catch (fcmErr) {
                  if (fcmErr?.errorInfo?.code === "messaging/registration-token-not-registered") {
                    invalidTokens.push(token);
                  }
                  console.error(`[${new Date().toISOString()}] ❌ FCM error for invoice notification:`, fcmErr?.errorInfo?.code || fcmErr?.message);
                }
              }

              if (invalidTokens.length > 0) {
                await userModel.updateOne(
                  { _id: booking.userid },
                  { $pull: { userfcmTokens: { $in: invalidTokens } } }
                );
              }
            }
          }
        } else {
          const tokens = user.userfcmTokens || [];
          if (tokens.length > 0) {
            const fcmPayload = {
              notification: { title, body: message },
              android: { notification: { sound: "default", priority: "high" } },
              apns: { payload: { aps: { sound: "default" } } },
              data: {
                bookingId: String(bookingId),
                invoiceId: String(invoiceId),
                type: "invoice_ready",
                bookingType: booking.bookType || booking.sts || "booking",
              },
            };

            const invalidTokens = [];
            for (const token of tokens) {
              try {
                await admin.messaging().send({ ...fcmPayload, token });
                console.log(`[${new Date().toISOString()}] ✅ Invoice FCM sent to customer for booking ${bookingId}`);
              } catch (fcmErr) {
                if (fcmErr?.errorInfo?.code === "messaging/registration-token-not-registered") {
                  invalidTokens.push(token);
                }
                console.error(`[${new Date().toISOString()}] ❌ FCM error for invoice notification:`, fcmErr?.errorInfo?.code || fcmErr?.message);
              }
            }

            if (invalidTokens.length > 0) {
              await userModel.updateOne(
                { uuid: booking.userid },
                { $pull: { userfcmTokens: { $in: invalidTokens } } }
              );
            }
          } else {
            console.log(`[${new Date().toISOString()}] ⚠️ No FCM tokens found for user ${booking.userid} (booking ${bookingId})`);
          }
        }
      } catch (fcmErr) {
        console.error(`[${new Date().toISOString()}] ❌ Error sending invoice FCM notification:`, fcmErr);
      }
    } else {
      console.log(`[${new Date().toISOString()}] ⚠️ No userId found for booking ${bookingId} - skipping invoice FCM`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error in sendInvoiceReadyNotification:`, error);
  }
};

exports.exitvendorsub = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // ✅ Get India date & time (without moment.js)
    const nowInIndia = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const [datePart, timePart] = nowInIndia.split(", "); // "DD/MM/YYYY", "HH:MM:SS AM/PM"

    // ✅ Convert DD/MM/YYYY → DD-MM-YYYY
    const [day, month, year] = datePart.split("/");
    const exitvehicledate = `${day}-${month}-${year}`;
    
    // Format time as "HH:MM AM/PM" (remove seconds if present)
    const parts = timePart.split(" ");
    const ampm = parts[parts.length - 1]; // Get AM/PM from the end
    const timeOnly = parts.slice(0, -1).join(" "); // Get time part (everything except AM/PM)
    const timeComponents = timeOnly.split(":");
    const hours = timeComponents[0];
    const minutes = timeComponents[1];
    const exitvehicletime = `${hours}:${minutes} ${ampm}`; // Format: "HH:MM AM/PM"

    // ✅ Only update status + exit date/time
    booking.status = "COMPLETED";
    booking.exitvehicledate = exitvehicledate;
    booking.exitvehicletime = exitvehicletime;

    const updatedBooking = await booking.save();

    // Send Invoice Ready Notification after subscription exit
    try {
      await sendInvoiceReadyNotification(updatedBooking, updatedBooking._id);
    } catch (invoiceErr) {
      console.error(`[${new Date().toISOString()}] ❌ Error sending invoice notification after subscription exit:`, invoiceErr);
    }

    res.status(200).json({
      message: "Booking marked as completed",
      booking: {
        exitvehicledate: updatedBooking.exitvehicledate,
        exitvehicletime: updatedBooking.exitvehicletime,
        status: updatedBooking.status,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Suggested backend endpoint for renewal (add this to your Node.js exports)
exports.renewSubscription = async (req, res) => {
  try {
    const { 
      gst_amount, 
      handling_fee, 
      total_additional, 
      new_total_amount, 
      new_subscription_enddate 
    } = req.body;

    if (new_total_amount === undefined || new_subscription_enddate === undefined) {
      return res.status(400).json({ error: "New total amount and new end date are required" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Fetch vendor details
    const vendor = await vendorModel.findById(booking.vendorId);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // Always round UP the platform fee %
    let platformFeePercentage = parseFloat(vendor.platformfee) || 0;
    platformFeePercentage = Math.ceil(platformFeePercentage);

    // ✅ Round inputs
    const roundedNewTotal = Math.ceil(parseFloat(new_total_amount) || 0); // base subscription
    const roundedTotalAdditional = total_additional !== undefined 
      ? Math.ceil(parseFloat(total_additional) || 0) 
      : 0;
    const roundedGstAmount = gst_amount !== undefined ? Math.ceil(parseFloat(gst_amount) || 0) : 0;
    const roundedHandlingFee = handling_fee !== undefined ? Math.ceil(parseFloat(handling_fee) || 0) : 0;

    // ✅ amount = only new subscription cost
    booking.amount = (
      parseFloat(booking.amount || 0) + roundedNewTotal
    ).toFixed(2);

    // ✅ totalamout = base + additional charges
    booking.totalamout = (
      parseFloat(booking.totalamout || 0) + roundedNewTotal + roundedTotalAdditional
    ).toFixed(2);

    // ✅ Always update subscription end date
    booking.subsctiptionenddate = new_subscription_enddate;

    // ✅ Accumulate GST & handling
    booking.gstamout = (
      parseFloat(booking.gstamout || 0) + roundedGstAmount
    ).toFixed(2);

    booking.handlingfee = (
      parseFloat(booking.handlingfee || 0) + roundedHandlingFee
    ).toFixed(2);

    // ✅ Platform fee based only on additional
    const platformfee = (roundedTotalAdditional * platformFeePercentage) / 100;
    booking.releasefee = (
      parseFloat(booking.releasefee || 0) + platformfee
    ).toFixed(2);

    // ✅ Receivable = total_additional - platform fee
    const additionalReceivable = roundedTotalAdditional - platformfee;
    booking.recievableamount = (
      parseFloat(booking.recievableamount || 0) + additionalReceivable
    ).toFixed(2);

    // ✅ Payable = receivable
    booking.payableamout = booking.recievableamount;

    // (Optional tracking for audits/debugging)
    booking.lastRenewTotal = roundedNewTotal;
    booking.lastAdditional = roundedTotalAdditional;

    const updatedBooking = await booking.save();

    // Send Invoice Ready Notification after monthly renewal
    try {
      await sendInvoiceReadyNotification(updatedBooking, updatedBooking._id);
    } catch (invoiceErr) {
      console.error(`[${new Date().toISOString()}] ❌ Error sending invoice notification after renewal:`, invoiceErr);
    }

    res.status(200).json({
      message: "Subscription renewed successfully",
      booking: {
        amount: updatedBooking.amount,             // ✅ only base
        totalamout: updatedBooking.totalamout,     // ✅ base + additional
        gstamout: updatedBooking.gstamout,
        handlingfee: updatedBooking.handlingfee,
        releasefee: updatedBooking.releasefee,
        recievableamount: updatedBooking.recievableamount,
        payableamout: updatedBooking.payableamout,
        subscriptionenddate: updatedBooking.subsctiptionenddate,
        lastRenewTotal: updatedBooking.lastRenewTotal,
        lastAdditional: updatedBooking.lastAdditional,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};




exports.getParkedVehicleCount = async (req, res) => {
  try {
    const { vendorId } = req.params;

    console.log("Received vendorId:", vendorId);

    const trimmedVendorId = vendorId.trim();
    console.log("Trimmed vendorId:", trimmedVendorId);

    const aggregationResult = await Booking.aggregate([
      {
        $match: { 
          vendorId: trimmedVendorId,
          status: "PARKED"
        }
      },
      {
        $group: {
          _id: "$vehicleType",
          count: { $sum: 1 }
        }
      }
    ]);

    console.log("Aggregation Result:", aggregationResult);

    let response = {
      totalCount: 0,
      Cars: 0,
      Bikes: 0,
      Others: 0
    };

    aggregationResult.forEach(({ _id, count }) => {
      response.totalCount += count;
      if (_id === "Car") {
        response.Cars = count;
      } else if (_id === "Bike") {
        response.Bikes = count;
      } else {
        response.Others += count;
      }
    });

    console.log("Final Response:", response);

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching parked vehicle count for vendor ID:", vendorId, error);
    res.status(500).json({ error: error.message });
  }
};

exports.getAvailableSlotCount = async (req, res) => {
  try {
    const { vendorId } = req.params;

    console.log("Received Vendor ID:", vendorId); 
    const trimmedVendorId = vendorId.trim(); 

    console.log("Trimmed Vendor ID:", trimmedVendorId); 

    const vendorData = await vendorModel.findOne({ _id: trimmedVendorId }, { parkingEntries: 1 });

    if (!vendorData) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const parkingEntries = vendorData.parkingEntries.reduce((acc, entry) => {
      const type = entry.type.trim();
      acc[type] = parseInt(entry.count) || 0;
      return acc;
    }, {});

    const totalAvailableSlots = {
      Cars: parkingEntries["Cars"] || 0,
      Bikes: parkingEntries["Bikes"] || 0,
      Others: parkingEntries["Others"] || 0
    };

    const aggregationResult = await Booking.aggregate([
      {
        $match: { 
          vendorId: trimmedVendorId,
          status: "PARKED"
        }
      },
      {
        $group: {
          _id: "$vehicleType",
          count: { $sum: 1 }
        }
      }
    ]);

    let bookedSlots = {
      Cars: 0,
      Bikes: 0,
      Others: 0
    };

    aggregationResult.forEach(({ _id, count }) => {
      if (_id === "Car") {
        bookedSlots.Cars = count;
      } else if (_id === "Bike") {
        bookedSlots.Bikes = count;
      } else {
        bookedSlots.Others = count;
      }
    });

    const availableSlots = {
      Cars: totalAvailableSlots.Cars - bookedSlots.Cars,
      Bikes: totalAvailableSlots.Bikes - bookedSlots.Bikes,
      Others: totalAvailableSlots.Others - bookedSlots.Others
    };

    availableSlots.Cars = Math.max(availableSlots.Cars, 0);
    availableSlots.Bikes = Math.max(availableSlots.Bikes, 0);
    availableSlots.Others = Math.max(availableSlots.Others, 0);

    return res.status(200).json({
      totalCount: availableSlots.Cars + availableSlots.Bikes + availableSlots.Others,
      Cars: availableSlots.Cars,
      Bikes: availableSlots.Bikes,
      Others: availableSlots.Others
    });

  } catch (error) {
    console.error("Error fetching available slot count for vendor ID:", req.params.vendorId, error);
    res.status(500).json({ error: error.message });
  }
};

// exports.getReceivableAmount = async (req, res) => {
//   try {
//     const { vendorId } = req.params;
//     if (!vendorId) {
//       return res.status(400).json({ success: false, message: "Vendor ID is required" });
//     }
//     const vendor = await vendorModel.findById(vendorId);
//     if (!vendor) {
//       return res.status(404).json({ success: false, message: "Vendor not found" });
//     }

//     const platformFeePercentage = parseFloat(vendor.platformfee) || 0;
//     const completedBookings = await Booking.find({ vendorId, status: "COMPLETED" });

//     if (completedBookings.length === 0) {
//       return res.status(404).json({ success: false, message: "No completed bookings found" });
//     }
//     const bookingsWithUpdatedPlatformFee = await Promise.all(
//       completedBookings.map(async (booking) => {
//         const amount = parseFloat(booking.amount); 
//         const platformfee = (amount * platformFeePercentage) / 100;
//         const receivableAmount = amount - platformfee;
//         booking.platformfee = platformfee.toFixed(2);
//         await booking.save();

//         return {
//           _id: booking._id,
//           amount,
//           platformfee: booking.platformfee,
//           receivableAmount: receivableAmount.toFixed(2),
//           amount :booking.amount,
//           gstamout: booking.gstamout,
//           totalamout: booking.totalamout,
//           handlingfee: booking.handlingfee,
//           vehicleNumber: booking.vehicleNumber,
//           vehicleType: booking.vehicleType,
//           bookingDate: booking.bookingDate,
//           parkingDate: booking.parkingDate,
//           parkingTime: booking.parkingTime,
//         };
//       })
//     );
//     const totalAmount = bookingsWithUpdatedPlatformFee.reduce((sum, b) => sum + parseFloat(b.amount), 0);
//     const totalReceivable = bookingsWithUpdatedPlatformFee.reduce((sum, b) => sum + parseFloat(b.receivableAmount), 0);
//     res.status(200).json({
//       success: true,
//       message: "Platform fees updated and receivable amounts calculated successfully",
//       data: {
//         platformFeePercentage,
//         totalAmount: totalAmount.toFixed(2),
//         totalReceivable: totalReceivable.toFixed(2),
//         bookings: bookingsWithUpdatedPlatformFee,
//       },
//     });
//   } catch (error) {
//     console.error("Error updating platform fees:", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

exports.getUserCancelledCount = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: "User ID is required" 
      });
    }

    const cancelledCount = await Booking.countDocuments({
      userid: userId,
      status: "Cancelled"
    });

    res.status(200).json({
      success: true,
      totalCancelledCount: cancelledCount
    });

  } catch (error) {
    console.error("Error fetching cancelled count:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
// GET /api/parking/vendors/summary
exports.getVendorParkingSummaryByType = async (req, res) => {
  try {
    const { vendorId, vehicleType } = req.query;

    // 1. Validation
    if (!vendorId || !vehicleType) {
      return res.status(400).json({ error: "vendorId and vehicleType are required" });
    }

    // 2. Fetch vendor
    const vendor = await vendorModel.findById(
      vendorId,
      { _id: 1, vendorName: 1, parkingEntries: 1 }
    );

    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // 3. Build parking entry count map (e.g., "Cars": 20)
    const parkingEntries = vendor.parkingEntries.reduce((acc, entry) => {
      const type = entry.type.trim(); // e.g., "Cars"
      acc[type] = parseInt(entry.count) || 0;
      return acc;
    }, {});

    // 4. Aggregate bookings (e.g., pending Car bookings)
    const bookings = await Booking.aggregate([
      {
        $match: {
          vendorId: vendorId,
          status: "PENDING",
          vehicleType: vehicleType,
        },
      },
      {
        $group: {
          _id: "$vehicleType",
          count: { $sum: 1 },
        },
      },
    ]);

    const bookedCount = bookings.length > 0 ? bookings[0].count : 0;

    // 5. Match pluralized vehicle type to entry map key
    const pluralVehicleType = vehicleType.endsWith("s") ? vehicleType : vehicleType + "s";
    const totalSlots = parkingEntries[pluralVehicleType] || 0;

    const availableSlots = totalSlots - bookedCount;

    // 6. Response
    res.status(200).json({
      availableSlots,
      // You can uncomment below if needed
      // vendorId: vendor._id,
      // vendorName: vendor.vendorName,
      // vehicleType: vehicleType,
      // totalSlots,
      // bookedSlots: bookedCount,
    });

  } catch (error) {
    console.error("Error in getVendorParkingSummaryByType:", error); // Helpful for debugging
    res.status(500).json({ error: error.message });
  }
};

exports.getNotificationsByUser = async (req, res) => {
  try {
    const { uuid } = req.params;

    const notifications = await Notification.find({ userId: uuid }).sort({ createdAt: -1 });

    if (!notifications || notifications.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No notifications found for this user",
      });
    }

    res.status(200).json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.clearNotificationById = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const deleted = await Notification.findByIdAndDelete(notificationId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification cleared successfully",
    });
  } catch (error) {
    console.error("Error clearing notification:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.clearAllNotificationsByVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const result = await Notification.deleteMany({ vendorId });

    res.status(200).json({
      success: true,
      message: "All notifications cleared successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error clearing all notifications:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.clearUserNotifications = async (req, res) => {
  try {
    const { uuid } = req.params;

    // Validate UUID
    if (!uuid) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Delete all notifications for the user
    const result = await Notification.deleteMany({ userId: uuid });

    // Check if any notifications were deleted
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No notifications found to clear for this user",
      });
    }

    res.status(200).json({
      success: true,
      message: "All notifications cleared successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error clearing user notifications:", error);
    res.status(500).json({
      success: false,
      message: `Failed to clear notifications: ${error.message}`,
    });
  }
};
exports.getVendorcBookingDetails = async (req, res) => {
  try {
    const { vendorId } = req.params;

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "Vendor ID is required" });
    }

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    // Fetch bookings with userid, completed status, and settlement pending
const bookings = await Booking.find({
  vendorId,
  status: "COMPLETED",
  userid: { $exists: true, $ne: "" },
  $or: [
    { settlemtstatus: { $regex: /^pending$/i } },
    { settlemtstatus: { $exists: false } }, // Optional: If you want to include unset values too
  ],
});


    if (bookings.length === 0) {
      return res.status(404).json({ success: false, message: "No unsettled completed bookings found" });
    }

 const bookingData = bookings.map((b) => ({
  _id: b._id,
  userid: b.userid,
  vendorId: b.vendorId,
  vendorName: b.vendorName || null,
  vehicleType: b.vehicleType || null,
  vehicleNumber: b.vehicleNumber || null,
  personName: b.personName || null,
  mobileNumber: b.mobileNumber || null,
  carType: b.carType || null,

  status: b.status,
  bookingDate: b.bookingDate || null,
  bookingTime: b.bookingTime || null,
  parkingDate: b.parkingDate || null,
  parkingTime: b.parkingTime || null,
  exitvehicledate: b.exitvehicledate || null,
  exitvehicletime: b.exitvehicletime || null,
  parkedDate: b.parkedDate || null,
  parkedTime: b.parkedTime || null,
  tenditivecheckout: b.tenditivecheckout || null,
  approvedDate: b.approvedDate || null,
  approvedTime: b.approvedTime || null,
  cancelledDate: b.cancelledDate || null,
  cancelledTime: b.cancelledTime || null,

  amount: b.amount || "0.00",
  totalamount: b.totalamout || "0.00",       // <- fixed
  gstamount: b.gstamout || "0.00",           // <- fixed
  handlingfee: b.handlingfee || "0.00",
  releasefee: b.releasefee || "0.00",
  recievableamount: b.recievableamount || "0.00",
  payableamount: b.payableamout || "0.00",   // <- fixed
  settlementstatus: b.settlemtstatus || "pending", // <- fixed

  subscriptiontype: b.subsctiptiontype || null, // <- fixed
}));


    return res.status(200).json({
      success: true,
      message: "Booking details retrieved successfully",
      count: bookingData.length,
      data: bookingData,
    });
  } catch (error) {
    console.error("Error fetching vendor booking details:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.updateVendorBookingsSettlement = async (req, res) => {
  try {
    const { bookingIds } = req.body;
    const { vendorId } = req.params;

    // Validate inputs
    if (!vendorId) {
      return res.status(400).json({ success: false, message: "Vendor ID is required" });
    }

    if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
      return res.status(400).json({ success: false, message: "Booking IDs array is required and cannot be empty" });
    }

    console.log("📥 Input Booking IDs:", bookingIds);
    console.log("📥 Vendor ID:", vendorId);

    // Verify vendor exists
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    // Fetch bookings to calculate totals
 const bookings = await Booking.find({
  _id: { $in: bookingIds },
  vendorId,
  status: "COMPLETED",
  $or: [
    { settlementstatus: { $regex: /^pending$/i } },
    { settlementstatus: { $exists: false } },
    { settlemtstatus: { $regex: /^pending$/i } },
    { settlemtstatus: { $exists: false } },
  ],
});


    console.log("🔍 Matched Bookings Count:", bookings.length);
    console.log("📄 Bookings Details:", bookings.map(b => ({
      _id: b._id,
      status: b.status,
      settlementstatus: b.settlementstatus,
      settlemtstatus: b.settlemtstatus
    })));

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No matching bookings found or already settled",
      });
    }

    // Calculate totals
    let totalParkingAmount = 0;
    let totalPlatformFee = 0;
    let totalGst = 0;
    let totalReceivableAmount = 0;

    const bookingDetails = bookings.map((b) => {
      const amount = parseFloat(b.amount || "0.00");
const platformFee = parseFloat(b.releasefee || "0.00");
      const gst = parseFloat(b.gstamout || "0.00");
      const receivableAmount = parseFloat(b.recievableamount || "0.00");

      totalParkingAmount += amount;
      totalPlatformFee += platformFee;
      totalGst += gst;
      totalReceivableAmount += receivableAmount;

      return {
        _id: b._id.toString(),
        userid: b.userid || "",
        vendorId: b.vendorId || "",
        amount: b.amount || "0.00",
    platformfee: b.releasefee || "0.00",
        receivableAmount: b.recievableamount || "0.00",
        bookingDate: b.bookingDate || "",
        parkingDate: b.parkingDate || "",
        parkingTime: b.parkingTime || "",
        exitvehicledate: b.exitvehicledate || "",
        exitvehicletime: b.exitvehicletime || "",
        vendorName: b.vendorName || "",
        vehicleType: b.vehicleType || "",
        vehicleNumber: b.vehicleNumber || "",
      };
    });

    // Calculate TDS (10% of total receivable amount)
    const tds = (totalReceivableAmount * 0.1).toFixed(2);
    const payableAmount = (totalReceivableAmount - parseFloat(tds)).toFixed(2);

    // Update bookings' settlement status
    const updateResult = await Booking.updateMany(
      {
        _id: { $in: bookingIds },
        vendorId,
        status: "COMPLETED",
        $or: [
          { settlementstatus: { $regex: /^pending$/i } },
          { settlemtstatus: { $regex: /^pending$/i } },
        ],
      },
      {
        $set: {
          settlementstatus: "settled",
          settlemtstatus: "settled",
          updatedAt: new Date(),
        },
      }
    );

    console.log("✅ Booking Update Result:", updateResult);

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No matching bookings found or already settled",
      });
    }

    // Create new Settlement document with fallback IDs using Mongo ObjectId
    const newId = new mongoose.Types.ObjectId().toString();
    const orderid = `ORD-${newId.slice(-8)}`;

const settlement = new Settlement({
  orderid,
  parkingamout: totalParkingAmount.toFixed(2),
platformfee: totalPlatformFee.toFixed(2),
  gst: totalGst.toFixed(2),
  tds: tds,
  payableammout: payableAmount,
  date: new Date().toISOString().split("T")[0],
  time: new Date().toISOString().split("T")[1].split(".")[0],
  status: "settled",
  settlementid: newId,
  vendorid: vendorId,
  bookingtotal: totalReceivableAmount.toFixed(2),
  bookings: bookingDetails,
});


    await settlement.save();

    return res.status(200).json({
      success: true,
      message: "Booking settlement status updated and settlement record created successfully",
      updatedCount: updateResult.modifiedCount,
      matchedCount: updateResult.matchedCount,
      settlementId: settlement.settlementid,
    });
  } catch (error) {
    console.error("❌ Error updating booking settlement status:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
exports.getBookingById = async (req, res) => {
  try {
    const bookingId = req.params.id;
    
    // Validate ObjectId
    if (!bookingId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid booking ID format" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.status(200).json({
      message: "Booking details fetched successfully",
      data: booking
    });
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({ error: "An error occurred while fetching the booking" });
  }
};
exports.getReceivableAmountByUser = async (req, res) => {
  try {
    const { vendorId, userId } = req.params;

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "Vendor ID is required" });
    }

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    // Base filter
    let filter = { vendorId, status: "COMPLETED" };

    // Apply user filter if present; otherwise exclude null userids
    if (userId) {
      filter.userid = userId;
    } else {
      filter.userid = { $ne: null }; // exclude userid: null
    }

    let completedBookings = await Booking.find(filter);

    // If userId is provided but no bookings found, fallback to all vendor bookings
    if (userId && completedBookings.length === 0) {
      completedBookings = await Booking.find({ vendorId, status: "COMPLETED", userid: { $ne: null } });
    }

    if (completedBookings.length === 0) {
      return res.status(200).json({ success: true, message: "No completed bookings found", data: [] });
    }

    const bookings = completedBookings.map((booking) => ({
      invoice:booking.invoice || null,
      username: booking.personName || null,
      _id: booking._id,
      invoiceid: booking.invoiceid || null,
      userid: booking.userid || null,
      bookingDate: booking.bookingDate,
      parkingDate: booking.parkingDate,
      parkingTime: booking.parkingTime,
        vehiclenumber: booking.vehicleNumber || null,
      exitdate:booking.exitvehicledate || null,
      exittime: booking.exitvehicletime || null,
    status: booking.status,
    sts: booking.sts || null,
    otp: booking.otp || null,
    vendorname: booking.vendorName || null,
    vendorid: booking.vendorId || null,
    bookingtype: booking.bookType || null,
    vehicleType: booking.vehicleType || null,
      amount: parseFloat(booking.amount).toFixed(2),
      handlingfee: parseFloat(booking.handlingfee).toFixed(2),
      releasefee: parseFloat(booking.releasefee).toFixed(2),
      recievableamount: parseFloat(booking.recievableamount).toFixed(2),
      payableamout: parseFloat(booking.payableamout).toFixed(2),
      gstamout: booking.gstamout,
      totalamout: booking.totalamout,
    }));

    res.status(200).json({
      success: true,
      data: bookings,
    });

  } catch (error) {
    console.error("Error fetching receivable amounts:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.getReceivableAmountWithPlatformFee = async (req, res) => {
  try {
    const { vendorId } = req.params;

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "Vendor ID is required" });
    }

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    // Get all COMPLETED bookings for the vendor where userid is null or not present
    const completedBookings = await Booking.find({
      vendorId,
      status: "COMPLETED",
      $or: [{ userid: null }, { userid: { $exists: false } }]
    });

    if (completedBookings.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: "No completed bookings without userid found", 
        data: [] 
      });
    }

    const bookings = completedBookings.map((booking) => {
      const amount = parseFloat(booking.amount) || 0;
      const platformfee = parseFloat(booking.platformfee) || 0;

      return {
        invoiceid: booking.invoiceid || null,
           invoice:booking.invoice || null,
      username: booking.personName || null,
       _id: booking._id,
      userid: booking.userid || null,
      bookingDate: booking.bookingDate,
      parkingDate: booking.parkingDate,
      parkingTime: booking.parkingTime,
        vehiclenumber: booking.vehicleNumber || null,
      exitdate:booking.exitvehicledate || null,
      exittime: booking.exitvehicletime || null,
    status: booking.status,
    sts: booking.sts || null,
    otp: booking.otp || null,
     vendorname: booking.vendorName || null,
    vendorid: booking.vendorId || null,
    bookingtype: booking.bookType || null,
    vehicleType: booking.vehicleType || null,
      amount: parseFloat(booking.amount).toFixed(2),
      // handlingfee: parseFloat(booking.handlingfee).toFixed(2),
      releasefee: parseFloat(booking.releasefee).toFixed(2),
      recievableamount: parseFloat(booking.recievableamount).toFixed(2),
      payableamout: parseFloat(booking.payableamout).toFixed(2),
      gstamout: booking.gstamout,
      totalamout: booking.totalamout,
      };
    });

    res.status(200).json({
      success: true,
      data: bookings,
    });

  } catch (error) {
    console.error("Error fetching receivable amounts:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.setVendorVisibility = async (req, res) => {
  try {
    const { vendorId, visibility } = req.body;

    if (!vendorId || typeof visibility !== "boolean") {
      return res.status(400).json({ message: "vendorId and visibility (boolean) are required" });
    }

    const vendor = await vendorModel.findOne({ vendorId });
    if (!vendor) {
      return res.status(404).json({ message: `No vendor found with vendorId: ${vendorId}` });
    }

    const charges = await Parkingcharges.findOne({ vendorid: vendorId });
    const parking = vendor.parkingEntries || [];

    const carEntry = parking.find(e => e.type.toLowerCase() === "cars");
    const bikeEntry = parking.find(e => e.type.toLowerCase() === "bikes");
    const othersEntry = parking.find(e => e.type.toLowerCase() === "others");

    let errors = [];

    if (visibility === true) {
      // Check availability for each slot
      const carAvailable = carEntry && parseInt(carEntry.count) > 0 && charges?.carenable === "true";
      const bikeAvailable = bikeEntry && parseInt(bikeEntry.count) > 0 && charges?.bikeenable === "true";
      const othersAvailable = othersEntry && parseInt(othersEntry.count) > 0 && charges?.othersenable === "true";

      // At least one slot must be available
      if (!carAvailable && !bikeAvailable && !othersAvailable) {
        errors.push("At least one slot (Car, Bike, or Others) must be available and enabled to set visibility");
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: "Cannot set visibility", errors });
    }

    // Check if visibility is changing from false to true
    const wasVisible = vendor.visibility;
    const isBecomingVisible = !wasVisible && visibility === true;

    // ✅ Update visibility
    vendor.visibility = visibility;
    await vendor.save();

    // If visibility changed to true and vendor is approved, send notifications to all users
    if (isBecomingVisible && vendor.status === "approved") {
      // Import helper function from vendorController
      const { sendNewLocationNotificationToAllUsers } = require("../vendorController");
      await sendNewLocationNotificationToAllUsers(vendor);
    }

    res.status(200).json({
      message: `Vendor visibility updated successfully for vendorId: ${vendorId}`,
      visibility: vendor.visibility
    });

  } catch (error) {
    console.error("Error updating vendor visibility:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



// const Vendor = require("../models/vendorSchema");

exports.vendorfetch = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendorData = await vendorModel.aggregate([
      { $match: { vendorId: vendorId } },
      {
        $lookup: {
          from: "parkingcharges",
          localField: "vendorId",
          foreignField: "vendorid",
          as: "charges"
        }
      },
      {
        $project: {
          vendorName: 1,
          vendorId: 1,
          parkingEntries: 1,
          charges: 1
        }
      }
    ]);

    if (!vendorData || vendorData.length === 0) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    let vendor = vendorData[0];
    let charges = vendor.charges[0] || {};

    // default availability
    let carslots = "not available";
    let bikeslots = "not available";
    let otherslots = "not available";

    // check parking entries
    const carEntry = vendor.parkingEntries.find(e => e.type.toLowerCase() === "cars");
    const bikeEntry = vendor.parkingEntries.find(e => e.type.toLowerCase() === "bikes");
    const othersEntry = vendor.parkingEntries.find(e => e.type.toLowerCase() === "others");

    if (charges.carenable === "true" && carEntry && parseInt(carEntry.count) > 0) {
      carslots = "available";
    }
    if (charges.bikeenable === "true" && bikeEntry && parseInt(bikeEntry.count) > 0) {
      bikeslots = "available";
    }
    if (charges.othersenable === "true" && othersEntry && parseInt(othersEntry.count) > 0) {
      otherslots = "available";
    }

    res.status(200).json({
      vendorName: vendor.vendorName,
      vendorId: vendor.vendorId,
      parkingEntries: vendor.parkingEntries,
      carslots,
      bikeslots,
      otherslots,
      carenable: charges.carenable || "false",
      bikeenable: charges.bikeenable || "false",
      othersenable: charges.othersenable || "false",
      charges: vendor.charges
    });

  } catch (error) {
    console.error("❌ Error fetching vendor details:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
