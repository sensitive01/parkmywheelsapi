const Booking = require("../../../models/bookingSchema");

// Controller to fetch bookings by vendor ID
const fetchBookingsByVendorId = async (req, res) => {
  try {
    const { id } = req.params;  // id will be the vendorId from the URL parameter

    // Find bookings that match the vendorId
    const bookings = await Booking.find({ vendorId: id });

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ error: "No bookings found for this vendor" });
    }

    // Return bookings in the response
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
