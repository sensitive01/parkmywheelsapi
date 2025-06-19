const Booking = require("../../../models/bookingSchema");
const vendorModel = require("../../../models/venderSchema");

const userModel = require("../../../models/userModel");
const moment = require("moment");
const admin = require("../../../config/firebaseAdmin"); // Use the singleton
const Notification = require("../../../models/notificationschema"); // Adjust the path as necessary

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
    } = req.body;

    console.log("Booking data:", req.body);

    // Check available slots before creating a booking
    const vendorData = await vendorModel.findOne({ _id: vendorId }, { parkingEntries: 1, fcmTokens: 1 });

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

    const otp = Math.floor(100000 + Math.random() * 900000);

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
      cancelledDate: null,
      cancelledTime: null,
      parkedDate,
      parkedTime,
      exitvehicledate,
      exitvehicletime,
      bookType,
    });

    await newBooking.save();

    const vendorNotification = new Notification({
      vendorId: vendorId,
      userId: userid,
      bookingId: newBooking._id,
      title: "New Booking Received",
      message: `New booking received from ${personName} for ${parkingDate} at ${parkingTime}`,
      vehicleType: vehicleType,
      vehicleNumber: vehicleNumber,
      createdAt: new Date(),
      read: false,
    });

    await vendorNotification.save();

    const userNotification = new Notification({
      vendorId: vendorId,
      userId: userid,
      bookingId: newBooking._id,
      title: "Booking Confirmed",
      message: `Your booking with ${vendorName} has been successfully confirmed for ${parkingDate} at ${parkingTime}`,
      vehicleType: vehicleType,
      vehicleNumber: vehicleNumber,
      createdAt: new Date(),
      read: false,
    });

    await userNotification.save();

    const vendorNotificationMessage = {
      notification: {
        title: "New Booking Received",
        body: `New booking received from ${personName} for ${parkingDate} at ${parkingTime}`,
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
            badge: 1,
          },
        },
      },
    };

    const userNotificationMessage = {
      notification: {
        title: "Booking Confirmed",
        body: `Your booking with ${vendorName} has been successfully confirmed for ${parkingDate} at ${parkingTime}`,
      },
      data: {
        bookingId: newBooking._id.toString(),
        vehicleType,
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
            badge: 1,
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
          if (error.errorInfo?.code === 'messaging/registration-token-not-registered') {
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

    const user = await userModel.findOne({ uuid: userid }, { userfcmTokens: 1 });
    if (user) {
      const userFcmTokens = user.userfcmTokens || [];
      const userInvalidTokens = [];

      if (userFcmTokens.length > 0) {
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
            { uuid: userid },
            { $pull: { userfcmTokens: { $in: userInvalidTokens } } }
          );
          console.log("🧹 Removed invalid user tokens:", userInvalidTokens);
        }
      } else {
        console.warn("ℹ️ No FCM tokens for this user.");
      }
    } else {
      console.warn("⚠️ User not found with UUID:", userid);
    }

    res.status(200).json({
      message: "Booking created successfully",
      bookingId: newBooking._id,
      booking: newBooking._id,
      otp,
      bookType,
      sts,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: error.message });
  }
};


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

    // Create a new notification for the vendor
    const newNotificationForVendor = new Notification({
      vendorId: booking.vendorId, // Corrected from 'existingBooking' to 'booking'
      userId: null,
      bookingId: updatedBooking._id,
      title: "Booking Cancel Alert",
      message: `Booking for ${updatedBooking.vehicleNumber} (${updatedBooking.vehicleType}) has been Cancelled.`,
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
              title: "Booking Cancelled Alert",
              body: `The booking for ${updatedBooking.vehicleNumber} has been Cancelled.`,
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
      message: `Your booking with ${booking.vendorId.vendorName} has been approved for ${approvedDate} at ${approvedTime}`,
      vehicleType: booking.vehicleType,
      vehicleNumber: booking.vehicleNumber,
      createdAt: new Date(),
      read: false,
    });

    await userNotification.save();
    console.log("User notification saved:", userNotification);

    // Prepare FCM notification message for user
    const userNotificationMessage = {
      notification: {
        title: "Booking Approved",
        body: `Your booking with ${booking.vendorId.vendorName} has been approved for ${approvedDate} at ${approvedTime}`,
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
            badge: 1,
          },
        },
      },
    };

    // Send notification to user
    const user = await userModel.findOne({ uuid: booking.userid }, { userfcmTokens: 1 });
    if (user) {
      const userFcmTokens = user.userfcmTokens || [];
      const userInvalidTokens = [];

      if (userFcmTokens.length > 0) {
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

    const booking = await Booking.findById(id);
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
    const booking = await Booking.findById(id);
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

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(400).json({ success: false, message: "Booking not found" });
    }

    if (booking.status !== "Approved") {
      return res.status(400).json({ success: false, message: "Only Approved bookings are allowed for parking" });
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      {
        status: "PARKED",
        parkedDate,
        parkedTime,
      },
      { new: true }
    );

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

exports.getBookingsByuserid = async (req, res) => {
  try {
    const { id } = req.params; 

    const bookings = await Booking.find({ userid: id });

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

    bookings.sort((a, b) => {
      const dateA = new Date(`${a.bookingDate.split('-').reverse().join('-')}T${convertTo24Hour(a.bookingTime)}`);
      const dateB = new Date(`${b.bookingDate.split('-').reverse().join('-')}T${convertTo24Hour(b.bookingTime)}`);
      return dateB - dateA; // Change from dateA - dateB to dateB - dateA
    });
    
  

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
    console.log("Welcome to update status")

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
    const { amount, hour } = req.body;

    if (amount === undefined || hour === undefined) {
      return res.status(400).json({ error: "Amount and hour are required" });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const exitvehicledate = moment().format("DD-MM-YYYY");
    const exitvehicletime = moment().format("hh:mm A");

    booking.amount = amount;
    booking.hour = hour;
    booking.exitvehicledate = exitvehicledate;
    booking.exitvehicletime = exitvehicletime;
    booking.status = "COMPLETED"; 

    const updatedBooking = await booking.save();

    res.status(200).json({
      message: "Booking updated successfully",
      booking: {
        amount: updatedBooking.amount,
        hour: updatedBooking.hour,
        exitvehicledate: updatedBooking.exitvehicledate,
        exitvehicletime: updatedBooking.exitvehicletime,
        status: updatedBooking.status
      }
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

exports.getReceivableAmount = async (req, res) => {
  try {
    const { vendorId } = req.params;
    if (!vendorId) {
      return res.status(400).json({ success: false, message: "Vendor ID is required" });
    }
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    const platformFeePercentage = parseFloat(vendor.platformfee) || 0;
    const completedBookings = await Booking.find({ vendorId, status: "COMPLETED" });

    if (completedBookings.length === 0) {
      return res.status(404).json({ success: false, message: "No completed bookings found" });
    }
    const bookingsWithUpdatedPlatformFee = await Promise.all(
      completedBookings.map(async (booking) => {
        const amount = parseFloat(booking.amount); 
        const platformfee = (amount * platformFeePercentage) / 100;
        const receivableAmount = amount - platformfee;
        booking.platformfee = platformfee.toFixed(2);
        await booking.save();

        return {
          _id: booking._id,
          amount,
          platformfee: booking.platformfee,
          receivableAmount: receivableAmount.toFixed(2),
          vehicleType: booking.vehicleType,
          bookingDate: booking.bookingDate,
          parkingDate: booking.parkingDate,
          parkingTime: booking.parkingTime,
        };
      })
    );
    const totalAmount = bookingsWithUpdatedPlatformFee.reduce((sum, b) => sum + parseFloat(b.amount), 0);
    const totalReceivable = bookingsWithUpdatedPlatformFee.reduce((sum, b) => sum + parseFloat(b.receivableAmount), 0);
    res.status(200).json({
      success: true,
      message: "Platform fees updated and receivable amounts calculated successfully",
      data: {
        platformFeePercentage,
        totalAmount: totalAmount.toFixed(2),
        totalReceivable: totalReceivable.toFixed(2),
        bookings: bookingsWithUpdatedPlatformFee,
      },
    });
  } catch (error) {
    console.error("Error updating platform fees:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

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
    const { vendorId, vehicleType } = req.query; // or use req.body for POST

    if (!vendorId || !vehicleType) {
      return res.status(400).json({ error: "vendorId and vehicleType are required" });
    }

    const vendor = await vendorModel.findById(vendorId, { _id: 1, vendorName: 1, parkingEntries: 1 });

    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const parkingEntries = vendor.parkingEntries.reduce((acc, entry) => {
      const type = entry.type.trim();
      acc[type] = parseInt(entry.count) || 0;
      return acc;
    }, {});

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
    const totalSlots = parkingEntries[vehicleType + "s"] || 0; // e.g., "Cars", "Bikes"
    const availableSlots = totalSlots - bookedCount;

    res.status(200).json({
      // vendorId: vendor._id,
      // vendorName: vendor.vendorName,
      // vehicleType: vehicleType,
      // totalSlots,
      // bookedSlots: bookedCount,
      availableSlots,
    });
  } catch (error) {
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

