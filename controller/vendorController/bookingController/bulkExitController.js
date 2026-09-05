const Booking = require("../../../models/bookingSchema");
const BookingTransaction = require("../../../models/bookingtransactionSechma");
const { logActivity } = require("../../../utils/activityLogger");

/**
 * Separate controller for bulk exiting selected parked bookings:
 * - Does NOT modify existing exitvehicle controller logic.
 * - Targets ONLY the selected bookings that are currently in "PARKED" status.
 * - Sets amount = "0.00" for the selected bookings as requested.
 * - Sets status = "COMPLETED".
 * - Records exit date & exit time in Indian Standard Time (IST).
 * - Leaves all other bookings in the system completely untouched.
 */
exports.bulkExitBookings = async (req, res) => {
  try {
    const { bookingIds, selectAllFiltered, filters } = req.body;

    let targetQuery = null;

    if (Array.isArray(bookingIds) && bookingIds.length > 0) {
      // Target only the selected IDs that are currently in parked status
      targetQuery = {
        _id: { $in: bookingIds },
        status: { $regex: /^parked$/i }
      };
    } else if (selectAllFiltered && filters) {
      // Target all bookings matching active filters that are currently in parked status
      const andConditions = [{ status: { $regex: /^parked$/i } }];

      if (filters.vendorId) andConditions.push({ vendorId: filters.vendorId });
      if (filters.vehicleType) andConditions.push({ vehicleType: filters.vehicleType });
      if (filters.sts) andConditions.push({ sts: filters.sts });

      const startStr = filters.bookingFromDate || filters.fromDate;
      const endStr = filters.bookingToDate || filters.toDate;

      const parseDateInput = (str) => {
        if (!str || typeof str !== 'string') return null;
        if (str.includes('-')) {
          const parts = str.split('-');
          if (parts[0].length === 4) {
            return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          } else if (parts[2].length === 4) {
            return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
          }
        }
        const parsed = new Date(str);
        return isNaN(parsed.getTime()) ? null : parsed;
      };

      if (startStr || endStr) {
        const fromD = parseDateInput(startStr);
        const toD = parseDateInput(endStr);
        if (fromD) fromD.setHours(0, 0, 0, 0);
        if (toD) toD.setHours(23, 59, 59, 999);

        const dateConditions = [];
        if (fromD && toD) {
          const dateStrings = [];
          const curr = new Date(fromD);
          while (curr <= toD && dateStrings.length < 1000) {
            const d = String(curr.getDate()).padStart(2, '0');
            const m = String(curr.getMonth() + 1).padStart(2, '0');
            const y = curr.getFullYear();
            dateStrings.push(`${d}-${m}-${y}`);
            dateStrings.push(`${y}-${m}-${d}`);
            curr.setDate(curr.getDate() + 1);
          }
          if (dateStrings.length > 0) dateConditions.push({ bookingDate: { $in: dateStrings } });
          dateConditions.push({ createdAt: { $gte: fromD, $lte: toD } });
        } else if (fromD) {
          dateConditions.push({ createdAt: { $gte: fromD } });
        } else if (toD) {
          dateConditions.push({ createdAt: { $lte: toD } });
        }
        if (dateConditions.length > 0) {
          andConditions.push({ $or: dateConditions });
        }
      }

      targetQuery = { $and: andConditions };
    } else {
      return res.status(400).json({ success: false, message: "No booking IDs or filter criteria provided." });
    }

    const bookingsToExit = await Booking.find(targetQuery);

    if (!bookingsToExit || bookingsToExit.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        message: "No parked bookings found matching the selection."
      });
    }

    // Current India Date & Time
    const nowInIndia = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const [datePart, timePart] = nowInIndia.split(", ");
    const [d, m, y] = datePart.split("/");
    const exitvehicledate = `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;

    const timeParts = timePart.split(" ");
    const ampm = timeParts[timeParts.length - 1];
    const timeOnly = timeParts.slice(0, -1).join(" ");
    const [h, min] = timeOnly.split(":");
    const exitvehicletime = `${h.padStart(2, '0')}:${min.padStart(2, '0')} ${ampm}`.toUpperCase();

    let exitCount = 0;

    for (const booking of bookingsToExit) {
      // Calculate duration in hours
      let parkedDurationHours = "1";
      try {
        if (booking.parkedDate && booking.parkedTime) {
          const [pDay, pMonth, pYear] = booking.parkedDate.split('-');
          const [pTimePart, pAmpm] = booking.parkedTime.split(' ');
          let [pHours, pMinutes] = pTimePart.split(':').map(Number);
          if (pAmpm && pAmpm.toUpperCase() === 'PM' && pHours !== 12) pHours += 12;
          if (pAmpm && pAmpm.toUpperCase() === 'AM' && pHours === 12) pHours = 0;

          const startTime = new Date(parseInt(pYear), parseInt(pMonth) - 1, parseInt(pDay), pHours, pMinutes);
          const nowTime = new Date();
          const diffMs = nowTime - startTime;
          if (diffMs > 0) {
            const calculated = Math.ceil(diffMs / (1000 * 60 * 60));
            parkedDurationHours = String(Math.max(1, calculated));
          }
        }
      } catch (err) {
        console.error("Error calculating duration for bulk exit:", err.message);
      }

      // Update booking with amount = 0 as requested
      booking.amount = "0.00";
      booking.hour = parkedDurationHours;
      booking.totalamout = "0.00";
      booking.gstamout = "0.00";
      booking.handlingfee = "0.00";
      booking.releasefee = "0.00";
      booking.recievableamount = "0.00";
      booking.payableamout = "0.00";
      booking.exitvehicledate = exitvehicledate;
      booking.exitvehicletime = exitvehicletime;
      booking.status = "COMPLETED";

      await booking.save();
      exitCount++;

      // Create BookingTransaction record
      try {
        const transaction = new BookingTransaction({
          bookingId: booking._id,
          vendorId: booking.vendorId,
          vendorName: booking.vendorName,
          userId: booking.userid,
          vehicleNumber: booking.vehicleNumber,
          vehicleType: booking.vehicleType,
          personName: booking.personName,
          mobileNumber: booking.mobileNumber,
          bookingAmount: "0.00",
          gstAmount: "0.00",
          handlingFee: "0.00",
          totalAmount: "0.00",
          platformFee: "0.00",
          receivableAmount: "0.00",
          payableAmount: "0.00",
          bookingDate: booking.bookingDate,
          parkingDate: booking.parkingDate,
          exitDate: exitvehicledate,
          bookingTime: booking.bookingTime,
          parkingTime: booking.parkingTime,
          exitTime: exitvehicletime,
          bookingType: booking.bookType,
          subscriptionType: booking.subsctiptiontype,
          subscriptionEndDate: booking.subsctiptionenddate,
          sts: booking.sts || null,
          paymentMode: booking.paymentMode || "Cash"
        });
        await transaction.save();
      } catch (txErr) {
        console.error(`Error creating transaction for booking ${booking._id}:`, txErr.message);
      }

      // Log activity
      try {
        await logActivity({
          req,
          actor: { vendorId: booking.vendorId },
          actorType: "ADMIN",
          action: "BULK_EXIT",
          resourceType: "BOOKING",
          resourceId: booking._id,
          details: {
            vehicleNumber: booking.vehicleNumber,
            amount: "0.00",
            exitDate: exitvehicledate,
            exitTime: exitvehicletime
          }
        });
      } catch (logErr) {
        // Continue even if logging fails
      }
    }

    return res.status(200).json({
      success: true,
      count: exitCount,
      message: `Successfully exited ${exitCount} vehicles with amount set to ₹0.00.`
    });
  } catch (error) {
    console.error("Bulk exit error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
