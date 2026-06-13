const Booking = require("../../../models/bookingSchema");

const fetchBookingsByVendorId = async (req, res) => {
  try {
    const { id } = req.params; 

    const bookings = await Booking.find({ vendorId: id });

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ error: "No bookings found for this vendor" });
    }
    return res.status(200).json({
      message: "Bookings fetched successfully",
      totalBookings: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Error fetching bookings by vendor ID:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { fetchBookingsByVendorId };
