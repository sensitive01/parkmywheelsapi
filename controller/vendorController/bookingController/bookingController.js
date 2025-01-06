const Booking = require("../../../models/bookingSchema");
const vendorModel = require("../../../models/venderSchema");

// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    const {
      userid,
      vendorId,
      amount,
      hour,
      personName,
      mobileNumber,
      vehicleType,
      carType,
      vehicleNumber,
      bookingDate,
      bookingTime,
      tenditivecheckout,
      subsctiptiontype,
      status,
      sts,
    } = req.body;

   

    // Create the booking
    const newBooking = new Booking({
      userid,
      vendorId,
      amount,
      hour,
      personName,
      vehicleType,
      mobileNumber,
      carType,
      vehicleNumber,
      bookingDate,
      bookingTime,
      tenditivecheckout,
      subsctiptiontype,
      status,
      sts,
    });

    await newBooking.save();

    res.status(200).json({ message: "Booking created successfully", booking: newBooking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Fetch bookings by status
exports.getBookingsByStatus = async (req, res) => {
  try {
    const { status } = req.params; // e.g., "pending", "approved", "cancelled"
    const bookings = await Booking.find({ status });
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};


// Approve a pending booking
exports.updateApproveBooking = async (req, res) => {
  try {
    console.log("BOOKING ID",req.params)
    const { id } = req.params; // Get the booking ID from the route parameters

    // Find the booking by ID
    const booking = await Booking.findById({_id:id});
    if (!booking) {
      return res.status(400).json({ success: false, message: "Booking not found" });
    }

    // Check if the booking is pending
    if (booking.status !== "Pending") {
      return res.status(400).json({ success: false, message: "Only pending bookings can be approved" });
    }

    // Update the status to approved
    booking.status = "Approved";


    await booking.save();

    res.status(200).json({
      success: true,
      message: "Booking approved successfully",
      data: booking,
    });
  } catch (error) {
    console.log("err",error)
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel a pending booking
exports.updateCancelBooking = async (req, res) => {
  try {
    console.log("BOOKING ID",req.params)
    const { id } = req.params; // Get the booking ID from the route parameters

    // Find the booking by ID
    const booking = await Booking.findById({_id:id});
    if (!booking) {
      return res.status(400).json({ success: false, message: "Booking not found" });
    }

    // Check if the booking is pending
    if (booking.status !== "Pending") {
      return res.status(400).json({ success: false, message: "Only pending bookings can be Cancelled" });
    }

    // Update the status to approved
    booking.status = "Cancelled";
    

    await booking.save();

    res.status(200).json({
      success: true,
      message: "Booking Cancelled successfully",
      data: booking,
    });
  } catch (error) {
    console.log("err",error)
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.allowParking = async (req, res) => {
  try {
    console.log("BOOKING ID",req.params)
    const { id } = req.params; // Get the booking ID from the route parameters

    // Find the booking by ID
    const booking = await Booking.findById({_id:id});
    if (!booking) {
      return res.status(400).json({ success: false, message: "Booking not found" });
    }

    // Check if the booking is pending
    if (booking.status !== "Approved") {
      return res.status(400).json({ success: false, message: "Only Approved booking are allowed" });
    }

    // Update the status to approved
    booking.status = "Parked";
    

    await booking.save();

    res.status(200).json({
      success: true,
      message: "Vehicle Parked Successfully",
      data: booking,
    });
  } catch (error) {
    console.log("err",error)
    res.status(500).json({ success: false, message: error.message });
  }
};


// Fetch bookings by vendorId
exports.getBookingsByVendorId = async (req, res) => {
  try {
    const { id } = req.params;  // id will be the vendorId from the URL parameter

    // Find bookings that match the vendorId
    const bookings = await Booking.find({ vendorId: id });

    if (!bookings || bookings.length === 0) {
      return res.status(400).json({ error: "No bookings found for this vendor" });
    }

    // Return the list of bookings
    res.status(200).json({ bookings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// get booking by userid
exports.getBookingsByuserid = async (req, res) => {
  try {
    const { id } = req.params;  // id will be the vendorId from the URL parameter

    // Find bookings that match the vendorId
    const bookings = await Booking.find({ userid: id });

    if (!bookings || bookings.length === 0) {
      return res.status(200).json({ message: "No bookings found for this user" });
    }

    // Return the list of bookings
    res.status(200).json({ bookings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Get booking by ID
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id); // Find by ID passed in the URL params

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.status(200).json({ booking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// src/controllers/bookingController.js
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find(); // Retrieves all bookings from the database

    if (bookings.length === 0) {
      return res.status(404).json({ message: "No bookings found" });
    }

    res.status(200).json({ bookings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// src/controllers/bookingController.js
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id); // Delete by ID

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





// src/controllers/bookingController.js
exports.updateBooking = async (req, res) => {
  try {
    const { carType, personName, mobileNumber, vehicleNumber, isSubscription, bookingDate, bookingTime } = req.body;

    // Validate input fields (basic validation)
    if (!carType || !personName || !mobileNumber || !vehicleNumber || !bookingDate) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id, // ID from URL params
      {
        carType,
        personName,
        mobileNumber,
        vehicleNumber,
        isSubscription,
        bookingDate,
        bookingTime
      },
      { new: true } // Return the updated booking object
    );

    if (!updatedBooking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.status(200).json({ message: "Booking updated successfully", booking: updatedBooking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.exitVehicle = async (req, res) => {
  try {
    console.log("EXIT VEHICLE ID", req.params.id); // Log the ID passed in the URL
    const { id } = req.params; // Get the booking ID from the route parameters
    const { amount, hour } = req.body; // Get the updated amount and hour from request body

    // Log the incoming data
    console.log("Amount:", amount, "Hour:", hour);

    // Find the booking by ID
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(400).json({ success: false, message: "Booking not found" });
    }

    // Check if the booking is parked
    if (booking.status !== "Parked") {
      return res.status(400).json({ success: false, message: "Only parked vehicles can exit" });
    }

    // Update the status to COMPLETED and update amount and hour
    booking.status = "COMPLETED";
    booking.amount = amount;
    booking.hour = hour;

    await booking.save();

    res.status(200).json({
      success: true,
      message: "Vehicle exit recorded successfully",
      data: booking,
    });
  } catch (error) {
    console.log("Error in exitVehicle", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getParkedVehicleCount = async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Validate vendorId format (if necessary)
    console.log("Received vendorId:", vendorId);

    // Trim the vendorId to avoid leading/trailing spaces
    const trimmedVendorId = vendorId.trim();
    console.log("Trimmed vendorId:", trimmedVendorId);

    // Check if data exists for the given vendorId
    const existingData = await Booking.find({ vendorId: trimmedVendorId });
    console.log("Existing data for vendor:", existingData);

    if (existingData.length === 0) {
      return res.status(404).json({ message: "No bookings found for this vendor." });
    }

    // Perform aggregation to count parked vehicles
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

    // Formatting the response
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
        response.Others += count; // For any other vehicle types
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
    const { vendorId } = req.params;  // Extract vendorId from the request params

    console.log("Received Vendor ID:", vendorId); // Log vendorId for debugging
    const trimmedVendorId = vendorId.trim();  // Trim the vendorId

    console.log("Trimmed Vendor ID:", trimmedVendorId); // Log trimmed vendorId for debugging

    // Fetch the total available parking slots for the vendor
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

    // Fetch the parked vehicle count
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

    // Calculate available slots
    const availableSlots = {
      Cars: totalAvailableSlots.Cars - bookedSlots.Cars,
      Bikes: totalAvailableSlots.Bikes - bookedSlots.Bikes,
      Others: totalAvailableSlots.Others - bookedSlots.Others
    };

    // Handle negative values if booked slots exceed available slots
    availableSlots.Cars = Math.max(availableSlots.Cars, 0);
    availableSlots.Bikes = Math.max(availableSlots.Bikes, 0);
    availableSlots.Others = Math.max(availableSlots.Others, 0);

    return res.status(200).json({
      availableCount: availableSlots.Cars + availableSlots.Bikes + availableSlots.Others,
      Cars: availableSlots.Cars,
      Bikes: availableSlots.Bikes,
      Others: availableSlots.Others
    });

  } catch (error) {
    console.error("Error fetching available slot count for vendor ID:", req.params.vendorId, error);
    res.status(500).json({ error: error.message });
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