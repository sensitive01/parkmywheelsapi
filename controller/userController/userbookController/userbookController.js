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
      const { vendorName, vehicleNumber, bookingDate, bookingTime, parkingDate, parkingTime } = req.body;
      const updatedBooking = await Booking.findByIdAndUpdate(
          id, 
          { vendorName, vehicleNumber, bookingDate, bookingTime, parkingDate, parkingTime },
          { new: true, runValidators: true }
      );

      if (!updatedBooking) {
          return res.status(404).json({ message: "Booking not found" });
      }

      res.status(200).json({ message: "Booking updated successfully", updatedBooking });
  } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
  }
};
