const Booking = require("../../../models/bookingSchema");
const vendorModel = require("../../../models/venderSchema");
const moment = require("moment"); 
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
    } = req.body;
    const approvedDate = null;
    const approvedTime = null;

    const cancelledDate = null;
    const cancelledTime = null;

    const parkedDate = null; 
    const parkedTime = null;

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
      approvedDate,
      approvedTime,
      cancelledDate,
      cancelledTime,
      parkedDate,
      parkedTime,
    });

    await newBooking.save();

    res.status(200).json({ message: "Booking created successfully", booking: newBooking });
  } catch (error) {
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

exports.userupdateCancelBooking = async (req, res) => {
  try {
    console.log("BOOKING ID", req.params);
    const { id } = req.params;

    // Fetch the booking by ID
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(400).json({ success: false, message: "Booking not found" });
    }

    // Only allow cancellation for approved bookings
    // if (booking.status !== "Approved") {
    //   return res.status(400).json({ success: false, message: "Only approved bookings can be cancelled" });
    // }

    // Get current date and time for cancellation
    const cancelledDate = moment().format("DD-MM-YYYY");
    const cancelledTime = moment().format("hh:mm A");

    // Update the booking with cancelled status, and keep the approvedDate and approvedTime
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { 
        status: "Cancelled", 
        cancelledStatus: "NoShow", 
        cancelledDate, 
        cancelledTime 
      },
      { new: true } // Return the updated document
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
exports.updateApproveBooking = async (req, res) => {
  try {
    console.log("BOOKING ID", req.params);
    const { id } = req.params;

    // Fetch the booking by ID
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(400).json({ success: false, message: "Booking not found" });
    }

    // Only allow approval for bookings that are in "PENDING" status
    if (booking.status !== "PENDING") {
      return res.status(400).json({ success: false, message: "Only pending bookings can be approved" });
    }

    // Get current date and time using moment.js
    const approvedDate = moment().format("DD-MM-YYYY");
    const approvedTime = moment().format("hh:mm A");
    console.log("approvedDate",approvedDate, "approvedTime", approvedTime)

    // Update the booking with approved status, date, and time
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { 
        status: "Approved", 
        approvedDate, 
        approvedTime 
      },
      { new: true } // This returns the updated document
    );

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

    // Get current date and time using moment.js
    const cancelledDate = moment().format("DD-MM-YYYY");
    const cancelledTime = moment().format("hh:mm A");
    console.log("cancelledDate", cancelledDate, "cancelledTime", cancelledTime);

    // Update the booking with cancelled status, date, and time
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { 
        status: "Cancelled", 
        cancelledDate, 
        cancelledTime 
      },
      { new: true } // Returns updated document
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


exports.updateApprovedCancelBooking = async (req, res) => {
  try {
    console.log("BOOKING ID", req.params);
    const { id } = req.params;

    // Fetch the booking by ID
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(400).json({ success: false, message: "Booking not found" });
    }

    // Only allow cancellation for approved bookings
    if (booking.status !== "Approved") {
      return res.status(400).json({ success: false, message: "Only approved bookings can be cancelled" });
    }

    // Get current date and time for cancellation
    const cancelledDate = moment().format("DD-MM-YYYY");
    const cancelledTime = moment().format("hh:mm A");

    // Update the booking with cancelled status, and keep the approvedDate and approvedTime
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { 
        status: "Cancelled", 
        cancelledDate, 
        cancelledTime 
      },
      { new: true } // Return the updated document
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

    // Fetch the booking by ID
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(400).json({ success: false, message: "Booking not found" });
    }

    // Only allow parking for approved bookings
    if (booking.status !== "Approved") {
      return res.status(400).json({ success: false, message: "Only Approved bookings are allowed for parking" });
    }

    // Get current date and time for parking
    const parkedDate = moment().format("DD-MM-YYYY");
    const parkedTime = moment().format("hh:mm A");

    // Update the booking with "Parked" status, and keep the approvedDate and approvedTime
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { 
        status: "Parked", 
        parkedDate, 
        parkedTime 
      },
      { new: true } // Return the updated document
    );

    res.status(200).json({
      success: true,
      message: "Vehicle Parked Successfully",
      data: updatedBooking,
    });
  } catch (error) {
    console.log("err", error);
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

    // Sort bookings by bookingDate and bookingTime
    bookings.sort((a, b) => {
      const dateA = new Date(`${a.bookingDate} ${a.bookingTime}`);
      const dateB = new Date(`${b.bookingDate} ${b.bookingTime}`);
      return dateA - dateB; // Ascending order
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

    booking.amount = amount;
    booking.hour = hour;
    booking.status = "COMPLETED"; 

    const updatedBooking = await booking.save();

    res.status(200).json({
      message: "Booking updated successfully",
      booking: {
        amount: updatedBooking.amount,
        hour: updatedBooking.hour,
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

    // Validate vendorId
    if (!vendorId) {
      return res.status(400).json({ success: false, message: "Vendor ID is required" });
    }

    // Fetch vendor's platform fee percentage
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    const platformFeePercentage = parseFloat(vendor.platformfee) || 0; // Convert platformfee to a number

    // Fetch completed bookings for the vendor
    const completedBookings = await Booking.find({ vendorId, status: "COMPLETED" });

    if (completedBookings.length === 0) {
      return res.status(404).json({ success: false, message: "No completed bookings found" });
    }

    // Process each booking to calculate and update platformfee
    const bookingsWithUpdatedPlatformFee = await Promise.all(
      completedBookings.map(async (booking) => {
        const amount = parseFloat(booking.amount); // Ensure the amount is a number
        const platformfee = (amount * platformFeePercentage) / 100;
        const receivableAmount = amount - platformfee;

        // Update the booking with the calculated platformfee
        booking.platformfee = platformfee.toFixed(2);
        await booking.save();

        return {
          _id: booking._id,
          amount,
          platformfee: booking.platformfee, // Now updated in the database
          receivableAmount: receivableAmount.toFixed(2),
          vehicleType: booking.vehicleType,
          bookingDate: booking.bookingDate,
          parkingDate: booking.parkingDate,
          parkingTime: booking.parkingTime,
        };
      })
    );

    // Calculate total amounts
    const totalAmount = bookingsWithUpdatedPlatformFee.reduce((sum, b) => sum + parseFloat(b.amount), 0);
    const totalReceivable = bookingsWithUpdatedPlatformFee.reduce((sum, b) => sum + parseFloat(b.receivableAmount), 0);

    // Respond with the calculated data
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




// const bookParkingSlot = async (req, res) => {
//   try {
//     console.log("Welcome to the booking vehicle");
//     const { id } = req.query;
//     const { place, vehicleNumber, bookingDate, time, vendorId } = req.body;

//     if (!id || !place || !vehicleNumber || !bookingDate || !time) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

   
//     const [day, month, year] = bookingDate.split("-");
//     const formattedDate = new Date(`${year}-${month}-${day}`);

//     if (isNaN(formattedDate.getTime())) {
//       return res.status(400).json({ message: "Invalid date format for bookingDate" });
//     }

//     const newBooking = new ParkingBooking({
//       place,
//       vehicleNumber,
//       time,
//       bookingDate: formattedDate, 
//       userId: id,
//       vendorId,
//     });

//     await newBooking.save();

//     res.status(201).json({
//       message: "Parking slot booked successfully",
//       booking: newBooking,
//     });
//   } catch (err) {
//     console.error("Error in booking the slot:", err);
//     res.status(500).json({ message: "Error in booking the slot" });
//   }
// };
