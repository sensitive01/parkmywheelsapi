const bcrypt = require("bcrypt");
const userModel = require("../../models/userModel");
const vehicleModel = require("../../models/vehicleModel");
const ParkingBooking = require("../../models/parkingSchema");
const { uploadImage } = require("../../config/cloudinary");
const venderSchema = require("../../models/venderSchema");

const getUserDataHome = async (req, res) => {
  try {
    console.log("Welcome to get data in home");

    const { id } = req.query; 

    if (!id) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const userData = await userModel.findOne({ uuid: id }, { userPassword: 0 });
    console.log(userData);

    if (!userData) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "User data retrieved successfully",
      user: userData,
    });
  } catch (err) {
    console.error("Error in getting user data in home", err);
    res.status(500).json({
      message: "Error in getting user data",
      error: err.message,
    });
  }
};

const getUserData = async (req, res) => {
  try {
    console.log("Welcome to getting the user data", req.query);

    const { id } = req.query; 

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const userData = await userModel.findOne({ uuid: id }, { userPassword: 0 });

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User data retrieved successfully",
      data: userData,
    });
  } catch (err) {
    console.error("Error in getting user profile data", err);

    res.status(500).json({
      success: false,
      message: "Server error in retrieving user data",
      error: err.message,
    });
  }
};

const updateUserData = async (req, res) => {
  try {
    console.log("Updating user data", req.query, req.body, req.files);

    const { id } = req.query;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User UUID is required in query parameters",
      });
    }

    if (!updates || typeof updates !== "object") {
      return res.status(400).json({
        success: false,
        message: "Updates object is required in the request body",
      });
    }

    if (req.files && req.files.image) {
      const imageFile = req.files.image[0];
      const uploadedImageUrl = await uploadImage(
        imageFile.buffer,
        "user_images"
      );
      updates.image = uploadedImageUrl;
      console.log("uploadedImageUrl", uploadedImageUrl);
      console.log(" updates.imageUrl", updates.image);
    }
    console.log("Updates", updates);

    const updatedUser = await userModel.findOneAndUpdate(
      { uuid: id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User data updated successfully",
      data: updatedUser,
    });
  } catch (err) {
    console.error("Error in updating user data", err);

    res.status(500).json({
      success: false,
      message: "Server error in updating user data",
      error: err.message,
    });
  }
};

const getUserVehicleData = async (req, res) => {
  try {
    console.log("Welcome to get all user vehicle data");

    const { id } = req.query;
    console.log(id);

    if (!id) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const userVehicles = await vehicleModel.find({ userId: id });

    if (userVehicles.length === 0) {
      return res.status(404).json({
        message: "No vehicles found for this user",
      });
    }

    res.status(200).json({
      message: "User vehicle data retrieved successfully",
      vehicles: userVehicles,
    });
  } catch (err) {
    console.error("Error in getting the user vehicle data", err);
    res.status(500).json({
      message: "Error in getting the user vehicle data",
      error: err.message,
    });
  }
};

const addNewVehicle = async (req, res) => {
  try {
    const { id } = req.query;
    const { category, type, make, model, color, vehicleNo } = req.body;

    if (!req.files || !req.files.image) {
      return res.status(400).json({ message: "No image provided" });
    }

    const imageFile = req.files.image[0];

    const imageUrl = await uploadImage(imageFile.buffer, "vehicles");

    const newVehicle = new vehicleModel({
      image: imageUrl,
      category,
      type,
      make,
      model,
      color,
      vehicleNo,
      userId: id,
    });

    const savedVehicle = await newVehicle.save();

    res.status(201).json({
      message: "Vehicle added successfully",
      vehicle: savedVehicle,
    });
  } catch (err) {
    console.error("Error in adding vehicle", err);
    res.status(500).json({
      message: "Error in adding vehicle",
      error: err.message,
    });
  }
};

const getVendorDetails = async (req, res) => {
  try {
    console.log("Welcome to get Vendor Details");

    const vendorData = await venderSchema.find({}, { password: 0 });
    console.log("Vendor Data:", vendorData);

    res.status(200).json({
      message: " vendor details fetched successfully",
      vendorData,
    });
  } catch (err) {
    console.error("Error in get  Vendor Details:", err);
    res.status(500).json({
      message: "Server error while fetching details",
      error: err.message,
    });
  }
};


const bookParkingSlot = async (req, res) => {
  try {
    console.log("Welcome to the booking vehicle");
    const { id } = req.query;
    const { place, vehicleNumber, bookingDate, time, vendorId } = req.body;

    if (!id || !place || !vehicleNumber || !bookingDate || !time) {
      return res.status(400).json({ message: "All fields are required" });
    }

   
    const [day, month, year] = bookingDate.split("-");
    const formattedDate = new Date(`${year}-${month}-${day}`);

    if (isNaN(formattedDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format for bookingDate" });
    }

    const newBooking = new ParkingBooking({
      place,
      vehicleNumber,
      time,
      bookingDate: formattedDate, 
      userId: id,
      vendorId,
    });

    await newBooking.save();

    res.status(201).json({
      message: "Parking slot booked successfully",
      booking: newBooking,
    });
  } catch (err) {
    console.error("Error in booking the slot:", err);
    res.status(500).json({ message: "Error in booking the slot" });
  }
};

const getBookingDetails = async (req, res) => {
  try {
    const { id } = req.query;
    const bookingData = await ParkingBooking.find({ userId: id });

    if (bookingData) {
      res.status(200).json({ success: true, bookingData });
    } else {
      res.status(404).json({ success: false, message: "No bookings found for this user",bookingData });
    }
  } catch (err) {
    console.log("Error in get user booking data", err);
    res.status(500).json({ success: false, message: "Server error, please try again later" });
  }
};








module.exports = {
  getUserData,
  updateUserData,
  addNewVehicle,
  getUserVehicleData,
  getUserDataHome,
  bookParkingSlot,
  getVendorDetails,
  getBookingDetails

};
