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
      exitvehicledate,
      exitvehicletime, 
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
      exitvehicledate,
      exitvehicletime, 
    });

    await newBooking.save();

    res.status(200).json({ message: "Booking created successfully", bookingId: newBooking._id,  booking: newBooking });
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
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(400).json({ success: false, message: "Booking not found" });
    }

    if (booking.status !== "PENDING") {
      return res.status(400).json({ success: false, message: "Only pending bookings can be approved" });
    }

    const approvedDate = moment().format("DD-MM-YYYY");
    const approvedTime = moment().format("hh:mm A");
    console.log("approvedDate",approvedDate, "approvedTime", approvedTime)
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { 
        status: "Approved", 
        approvedDate, 
        approvedTime 
      },
      { new: true }
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
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(400).json({ success: false, message: "Booking not found" });
    }
    if (booking.status !== "Approved") {
      return res.status(400).json({ success: false, message: "Only Approved bookings are allowed for parking" });
    }
    const parkedDate = moment().format("DD-MM-YYYY");
    const parkedTime = moment().format("hh:mm A");
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { 
        status: "PARKED", 
        parkedDate, 
        parkedTime 
      },
      { new: true } 
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
    const convertTo24Hour = (time) => {
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
      return dateA - dateB;
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

// exports.updateBookingAmountAndHour = async (req, res) => {
//   try {
//     const { amount, hour } = req.body;

//     if (amount === undefined || hour === undefined) {
//       return res.status(400).json({ error: "Amount and hour are required" });
//     }

//     const booking = await Booking.findById(req.params.id);

//     if (!booking) {
//       return res.status(404).json({ error: "Booking not found" });
//     }

//     booking.amount = amount;
//     booking.hour = hour;
//     booking.status = "COMPLETED"; 

//     const updatedBooking = await booking.save();

//     res.status(200).json({
//       message: "Booking updated successfully",
//       booking: {
//         amount: updatedBooking.amount,
//         hour: updatedBooking.hour,
//         status: updatedBooking.status
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

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
