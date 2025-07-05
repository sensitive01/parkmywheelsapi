const mongoose = require("mongoose");
const Booking = require("../../models/bookingSchema"); // Adjust path to your Booking model
const Settlement = require("../../models/settlementSchema"); // Adjust path to your Settlement model
const Vendor = require("../../models/venderSchema"); // Adjust path to your Vendor model

exports.createVendorSettlement = async (req, res) => {
  try {
    const { vendorId } = req.params;

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "Vendor ID is required" });
    }

    // Validate vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    const platformFeePercentage = parseFloat(vendor.platformfee) || 0;

    // Fetch completed bookings that are not yet settled
    const completedBookings = await Booking.find({
      vendorId,
      status: "COMPLETED",
      userid: { $exists: true, $ne: "" },
      settlementstatus: { $ne: "Finished" }, // Exclude settled bookings
    });

    if (completedBookings.length === 0) {
      return res.status(404).json({ success: false, message: "No unsettled completed bookings with userid found" });
    }

    // Calculate platform fees and update bookings
    const bookingsWithUpdatedPlatformFee = await Promise.all(
      completedBookings.map(async (booking) => {
        const amount = parseFloat(booking.amount) || 0;
        const platformfee = (amount * platformFeePercentage) / 100;
        const receivableAmount = amount - platformfee;

        // Update booking with platform fee and settlement status
        booking.platformfee = platformfee.toFixed(2);
        booking.settlementstatus = "Finished";
        await booking.save();

        return {
          _id: booking._id,
          userid: booking.userid,
          vendorId: booking.vendorId,
          amount: amount.toFixed(2),
          platformfee: platformfee.toFixed(2),
          receivableAmount: receivableAmount.toFixed(2),
          bookingDate: booking.bookingDate || null,
          parkingDate: booking.parkingDate || null,
          parkingTime: booking.parkingTime || null,
          exitvehicledate: booking.exitvehicledate || null,
          exitvehicletime: booking.exitvehicletime || null,
          vendorName: booking.vendorName || null,
          vehicleType: booking.vehicleType || null,
          vehicleNumber: booking.vehicleNumber || null,
        };
      })
    );

    // Calculate totals
    const totalAmount = bookingsWithUpdatedPlatformFee.reduce((sum, b) => sum + parseFloat(b.amount), 0);
    const totalPlatformFee = bookingsWithUpdatedPlatformFee.reduce((sum, b) => sum + parseFloat(b.platformfee), 0);
    const totalReceivable = bookingsWithUpdatedPlatformFee.reduce((sum, b) => sum + parseFloat(b.receivableAmount), 0);

    // Generate a unique settlement ID
    const settlementId = `SETTLE-${Date.now()}-${vendorId.slice(-4)}`;

    // Create settlement record with booking list
    const settlement = new Settlement({
      vendorid: vendorId,
      settlementid: settlementId,
      bookingtotal: totalAmount.toFixed(2),
      parkingamout: totalAmount.toFixed(2),
      platformfee: totalPlatformFee.toFixed(2),
      payableammout: totalReceivable.toFixed(2),
      gst: "0.00", // Adjust if GST calculation is needed
      tds: ["0.00"], // Adjust if TDS calculation is needed
      date: new Date().toISOString().split("T")[0], // Current date in YYYY-MM-DD
      time: new Date().toLocaleTimeString("en-US", { hour12: false }), // Current time in HH:mm:ss
      status: "Completed",
      orderid: bookingsWithUpdatedPlatformFee.map((b) => b._id).join(","), // Store booking IDs
      bookings: bookingsWithUpdatedPlatformFee, // Store booking details
    });

    await settlement.save();

    // Respond with settlement details
    res.status(200).json({
      success: true,
      message: "Settlement created and bookings updated successfully",
      data: {
        settlementId: settlement.settlementid,
        vendorId,
        platformFeePercentage,
        totalAmount: totalAmount.toFixed(2),
        totalPlatformFee: totalPlatformFee.toFixed(2),
        totalReceivable: totalReceivable.toFixed(2),
        bookings: bookingsWithUpdatedPlatformFee,
        settlementDate: settlement.date,
        settlementTime: settlement.time,
        status: settlement.status,
      },
    });
  } catch (error) {
    console.error("Error creating settlement:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getVendorPayouts = async (req, res) => {
  try {
    const { vendorId } = req.params;

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "Vendor ID is required" });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    const platformFeePercentage = parseFloat(vendor.platformfee) || 0;

    // Fetch only unsettled completed bookings
    const completedBookings = await Booking.find({
      vendorId,
      status: "COMPLETED",
      userid: { $exists: true, $ne: "" },
      settlementstatus: { $ne: "Finished" }, // Exclude settled bookings
    });

    if (completedBookings.length === 0) {
      return res.status(404).json({ success: false, message: "No unsettled completed bookings with userid found" });
    }

    const bookingsWithUpdatedPlatformFee = completedBookings.map((booking) => {
      const amount = parseFloat(booking.amount) || 0;
      const platformfee = (amount * platformFeePercentage) / 100;
      const receivableAmount = amount - platformfee;

      return {
        _id: booking._id,
        userid: booking.userid,
        vendorId: booking.vendorId,
        amount: amount.toFixed(2),
        platformfee: platformfee.toFixed(2),
        receivableAmount: receivableAmount.toFixed(2),
        bookingDate: booking.bookingDate || null,
        parkingDate: booking.parkingDate || null,
        parkingTime: booking.parkingTime || null,
        exitvehicledate: booking.exitvehicledate || null,
        exitvehicletime: booking.exitvehicletime || null,
        vendorName: booking.vendorName || null,
        vehicleType: booking.vehicleType || null,
        vehicleNumber: booking.vehicleNumber || null,
      };
    });

    const totalAmount = bookingsWithUpdatedPlatformFee.reduce((sum, b) => sum + parseFloat(b.amount), 0);
    const totalReceivable = bookingsWithUpdatedPlatformFee.reduce((sum, b) => sum + parseFloat(b.receivableAmount), 0);

    res.status(200).json({
      success: true,
      message: "Unsettled bookings retrieved successfully",
      data: {
        platformFeePercentage,
        totalAmount: totalAmount.toFixed(2),
        totalReceivable: totalReceivable.toFixed(2),
        bookings: bookingsWithUpdatedPlatformFee,
      },
    });
  } catch (error) {
    console.error("Error fetching vendor payouts:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};