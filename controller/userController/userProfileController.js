const bcrypt = require("bcrypt");
const userModel = require("../../models/userModel");
const vehicleModel = require("../../models/vehicleModel");
const ParkingBooking = require("../../models/parkingSchema");
const { uploadImage } = require("../../config/cloudinary");
const venderSchema = require("../../models/venderSchema");
const Favorite = require("../../models/favouritesSchema"); // Ensure this path is correct
const Vendor = require("../../models/venderSchema"); // Ensure this path is correct


const sharp = require('sharp');

const addNewVehicle = async (req, res) => {
  try {
    const { id } = req.query;
    const { category, type, make, model, color, vehicleNo } = req.body;

    // Validate required fields
    // if (!id || !category || !type || !make || !model || !color || !vehicleNo) {
    //   return res.status(400).json({ message: "All fields are required" });
    // }

    if (!req.files || !req.files.image) {
      return res.status(400).json({ message: "No image provided" });
    }

    const imageFile = req.files.image[0];

    // Validate file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (imageFile.size > MAX_FILE_SIZE) {
      return res.status(400).json({ 
        message: `Image too large. Maximum size is ${MAX_FILE_SIZE/1024/1024}MB`
      });
    }

    // Validate file type
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimeTypes.includes(imageFile.mimetype)) {
      return res.status(400).json({ 
        message: 'Invalid file type. Only JPEG, PNG, and WebP are allowed'
      });
    }

    // Process image (compress and resize)
    let processedImage;
    try {
      processedImage = await sharp(imageFile.buffer)
        .resize({ 
          width: 1920, 
          height: 1080, 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .jpeg({ 
          quality: 80, 
          mozjpeg: true 
        })
        .toBuffer();
    } catch (compressErr) {
      console.error('Image processing error:', compressErr);
      console.log('Image processing error:', compressErr.message);
      return res.status(500).json({ 
        
        message: 'Error processing image',
        error: compressErr.message 
      });
    }

    const imageUrl = await uploadImage(processedImage, "vehicles");

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
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        message: "Validation error",
        error: err.message,
      });
    }
    
    res.status(500).json({
      message: "Error in adding vehicle",
      error: err.message,
    });
  }
};



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



const fetchWallet = async (req, res) => {
  try {
    const { id } = req.params; // Extract userId from route parameters

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Query the database for wallet data
    const walletData = await userModel.findOne(
      { uuid: id },
      { walletamount: 1, walletstatus: 1, userName: 1, _id: 0 } // Correct field names
    );

    if (!walletData) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Wallet data retrieved successfully",
      data: walletData,
    });
  } catch (err) {
    console.error("Error in fetching wallet data", err);

    res.status(500).json({
      success: false,
      message: "Server error in fetching wallet data",
      error: err.message,
    });
  }
};



const deleteUserVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.query;
    console.log("Deleting vehicle with ID:", vehicleId);

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: "Vehicle ID is required",
      });
    }

    // Correct query for deleting a single vehicle
    const deletedVehicle = await vehicleModel.findOneAndDelete({ _id: vehicleId });

    if (!deletedVehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Vehicle deleted successfully",
      vehicle: deletedVehicle,
    });
  } catch (err) {
    console.error("Error deleting vehicle:", err);
    res.status(500).json({
      success: false,
      message: "Error deleting vehicle",
      error: err.message,
    });
  }
};
const addFavoriteVendor = async (req, res) => {
  try {
    const { userId, vendorId } = req.body;

    // Validate input
    if (!userId || !vendorId) {
      return res.status(400).json({ message: "User  ID and Vendor ID are required" });
    }

    // Check if the vendor is already in favorites
    const existingFavorite = await Favorite.findOne({ userId, vendorId });
    if (existingFavorite) {
      return res.status(400).json({ message: "Vendor is already in favorites" });
    }

    // Create a new favorite entry
    const favorite = new Favorite({ userId, vendorId });
    await favorite.save();

    res.status(201).json({ message: "Vendor added to favorites", favorite });
  } catch (err) {
    console.error("Error adding favorite vendor:", err);
    res.status(500).json({ message: "Error adding favorite vendor", error: err.message });
  }
};


const removeFavoriteVendor = async (req, res) => {
  try {
    const { userId, vendorId } = req.body;

    // Validate input
    if (!userId || !vendorId) {
      return res.status(400).json({ message: "User  ID and Vendor ID are required" });
    }

    // Find and remove the favorite entry
    const result = await Favorite.findOneAndDelete({ userId, vendorId });
    if (!result) {
      return res.status(404).json({ message: "Favorite vendor not found" });
    }

    res.status(200).json({ message: "Vendor removed from favorites" });
  } catch (err) {
    console.error("Error removing favorite vendor:", err);
    res.status(500).json({ message: "Error removing favorite vendor", error: err.message });
  }
};

// Fetch favorite vendors for a user
const getFavoriteVendors = async (req, res) => {
  try {
    const { userId } = req.query; // Use req.query for GET requests

    // Validate input
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Fetch favorite vendors
    const favorites = await Favorite.find({ userId }).populate("vendorId");
    res.status(200).json({ favorites });
  } catch (err) {
    console.error("Error fetching favorite vendors:", err);
    res.status(500).json({ message: "Error fetching favorite vendors", error: err.message });
  }
};
const getVendors = async (req, res) => {
  try {
    const { userId } = req.query;

    // Validate input
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Fetch favorite vendors
    const favorites = await Favorite.find({ userId });

    if (!favorites.length) {
      return res.status(404).json({ message: "No favorite vendors found" });
    }

    // Extract vendor IDs from favorites list
    const vendorIds = favorites.map((fav) => fav.vendorId);

    // Fetch vendor details using the correct model (Vendor, not vendorSchema)
    const vendors = await Vendor.find({ _id: { $in: vendorIds } }, { password: 0 }).lean();

    return res.status(200).json({
      message: "Favorite vendors fetched successfully",
      data: vendors
    });
  } catch (err) {
    console.error("Error fetching favorite vendors:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
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
  getBookingDetails,
  fetchWallet,
    addFavoriteVendor, 
  removeFavoriteVendor,// Ensure this is exported
  getFavoriteVendors,
  deleteUserVehicle,
getVendors,
};
