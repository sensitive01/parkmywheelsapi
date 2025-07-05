const mongoose = require("mongoose");
const Booking = require("../../models/bookingSchema"); // Adjust path to your Booking model
const Settlement = require("../../models/settlementSchema"); // Adjust path to your Settlement model
const Vendor = require("../../models/venderSchema"); // Adjust path to your Vendor model

exports.getSettlementsByVendorId = async (req, res) => {
  try {
    const { vendorId } = req.params;

    if (!vendorId) {
      return res.status(400).json({ message: 'vendorId is required' });
    }

    const settlements = await Settlement.find({ vendorid: vendorId }).lean();

    if (!settlements || settlements.length === 0) {
      return res.status(404).json({ message: 'No settlements found for this vendorId' });
    }

    res.status(200).json({
      message: 'Settlements fetched successfully',
      data: settlements,
    });
  } catch (error) {
    console.error('Error fetching settlements:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
exports.getBookingsBySettlementId = async (req, res) => {
  try {
    const { settlementid } = req.params;

    if (!settlementid) {
      return res.status(400).json({ success: false, message: "Settlement ID is required" });
    }

    const settlement = await Settlement.findOne({ settlementid });

    if (!settlement) {
      return res.status(404).json({ success: false, message: "Settlement not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Bookings fetched successfully",
      bookings: settlement.bookings
    });
  } catch (error) {
    console.error("Error fetching bookings by settlement ID:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};