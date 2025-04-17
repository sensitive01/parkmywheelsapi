const Booking = require("../../../models/bookingSchema");

exports.getUserBookingCounts = async (req, res) => {
  try {
    const { userid } = req.params;

    if (!userid) {
      return res.status(400).json({ 
        success: false, 
        message: "User ID is required" 
      });
    }

    const [cancelledCount, parkedCount, pendingCount] = await Promise.all([
      Booking.countDocuments({
        userid: userid,
        status: { $regex: /cancelled/i }
      }),
      Booking.countDocuments({
        userid: userid,
        status: { $regex: /parked/i } 
      }),
      Booking.countDocuments({
        userid: userid,
        status: { $regex: /pending/i }
      })
    ]);

    res.status(200).json({  
      totalCancelledCount: cancelledCount,
      totalParkedCount: parkedCount,
      totalPendingCount: pendingCount
    });

  } catch (error) {
    console.error("Error fetching booking counts:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateBookingById = async (req, res) => {
  try {
      const { id } = req.params; 
      const { vendorName, vehicleNumber, bookingDate, bookingTime,status, parkingDate, parkingTime } = req.body;
      const updatedBooking = await Booking.findByIdAndUpdate(
          id, 
          { vendorName, vehicleNumber, bookingDate, bookingTime, parkingDate,status, parkingTime },
          { new: true, runValidators: true }
      );

      if (!updatedBooking) {
          return res.status(404).json({ message: "Booking not found" });
      }
      const newNotificationForVendor = new Notification({
        vendorId: updatedBooking.vendorId, // Use the vendorId from the updated booking
        userId: null, // No specific user for vendor notification
        bookingId: updatedBooking._id,
        title: "Booking Updated Alert",
        message: `Booking for ${updatedBooking.vehicleNumber} (${updatedBooking.vehicleType}) has been updated.`,
        vehicleType: updatedBooking.vehicleType,
        vehicleNumber: updatedBooking.vehicleNumber,
        sts: updatedBooking.sts,
        createdAt: new Date(),
        read: false,
      });
      
      await newNotificationForVendor.save();
      
          const fcmTokens = vendorData.fcmTokens || [];
      
          console.log("Firebase Project ID:", admin.app().options.credential.projectId);
          console.log("FCM Token being used:", fcmTokens);
      
          if (fcmTokens.length > 0) {
            const invalidTokens = []; // Track invalid tokens
      
            const promises = fcmTokens.map(async (token) => {
              try {
                const response = await admin.messaging().send({
                  token: token,
                  notification: {
                    title: "New Booking Alert",
                    body: `${personName} has booked a ${vehicleType}.`,
                  },
                  data: {
                    bookingId: newBooking._id.toString(),
                    vehicleType,
                  },
                });
                console.log(`Notification sent to token: ${token}`, response);
              } catch (error) {
                console.error(`Error sending notification to token: ${token}`, error);
                if (error.errorInfo && error.errorInfo.code === "messaging/registration-token-not-registered") {
                  invalidTokens.push(token); // Add invalid token to the list
                }
              }
            });
      
            await Promise.all(promises);
      
            // Remove invalid tokens from the database
            if (invalidTokens.length > 0) {
              await vendorModel.updateOne(
                { _id: vendorId },
                { $pull: { fcmTokens: { $in: invalidTokens } } }
              );
              console.log("Removed invalid FCM tokens:", invalidTokens);
            }
          } else {
            console.warn("No FCM tokens available for this vendor.");
          }
      
      res.status(200).json({ message: "Booking updated successfully", updatedBooking });
  } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
  }
};
