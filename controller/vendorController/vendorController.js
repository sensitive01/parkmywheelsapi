const bcrypt = require("bcrypt");
const vendorModel = require("../../models/venderSchema");
const { uploadImage } = require("../../config/cloudinary");
const generateOTP = require("../../utils/generateOTP");
const axios = require('axios');
const Booking = require("../../models/bookingSchema");
const Parkingcharges = require("../../models/chargesSchema");
const qs = require("qs");


const vendorForgotPassword = async (req, res) => {
  try {
    const { mobile } = req.body;

    // 1. Basic validation
    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    // 2. Clean and validate Indian mobile format
    let cleanedMobile = mobile.replace(/\D/g, '');
    if (cleanedMobile.startsWith("91") && cleanedMobile.length > 10) {
      cleanedMobile = cleanedMobile.slice(2);
    }

    if (!/^[6-9]\d{9}$/.test(cleanedMobile)) {
      return res.status(400).json({ message: "Invalid mobile number format" });
    }

    // 3. Check vendor
    const existVendor = await vendorModel.findOne({ "contacts.mobile": cleanedMobile });
    if (!existVendor) {
      return res.status(404).json({ message: "Vendor not found with the provided mobile number" });
    }

    // 4. Generate OTP and save
    const otp = generateOTP();
    existVendor.otp = otp;
    existVendor.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
    await existVendor.save();

    // 5. Prepare message
    const rawMessage = `Hi, ${otp} is your One time verification code. Park Smart with ParkMyWheels.`;
    const encodedMessage = encodeURIComponent(rawMessage);

    console.log("🔐 OTP:", otp);
    console.log("📤 SMS Raw Message:", rawMessage);

    // 6. Prepare query parameters
    const smsParams = {
      username: process.env.VISPL_USERNAME || "Vayusutha.trans",
      password: process.env.VISPL_PASSWORD || "pdizP",
      unicode: "false",
      from: process.env.VISPL_SENDER_ID || "PRMYWH",
      to: cleanedMobile,
      text: rawMessage, // pass raw, we'll encode it via qs below
      dltContentId: process.env.VISPL_TEMPLATE_ID || "1007991289098439570",
    };

    // 7. Send SMS using axios with safe encoding
    const smsResponse = await axios.get("https://pgapi.vispl.in/fe/api/v1/send", {
      params: smsParams,
      paramsSerializer: params => qs.stringify(params, { encode: true }),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Node.js)', // mimic browser
      },
    });

    console.log("📩 VISPL SMS API Response:", smsResponse.data);

    const status = smsResponse.data.STATUS || smsResponse.data.status || smsResponse.data.statusCode;
    const isSuccess = status === "SUCCESS" || status === 200 || status === 2000;

    if (!isSuccess) {
      return res.status(500).json({
        message: "Failed to send OTP via SMS",
        visplResponse: smsResponse.data,
      });
    }

    // ✅ Success
    return res.status(200).json({ message: "OTP sent successfully" });

  } catch (err) {
    console.error("❌ Error in vendorForgotPassword:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({ message: "Mobile number and OTP are required" });
    }

    // Clean mobile number as in forgot password
    let cleanedMobile = mobile.replace(/\D/g, '');
    if (cleanedMobile.startsWith("91") && cleanedMobile.length > 10) {
      cleanedMobile = cleanedMobile.slice(2);
    }

    // Find vendor by mobile
    const vendor = await vendorModel.findOne({ "contacts.mobile": cleanedMobile });

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Check OTP and expiry
    if (
      vendor.otp === otp &&
      vendor.otpExpiresAt &&
      new Date() < new Date(vendor.otpExpiresAt)
    ) {
      // Optionally clear OTP after successful verification
      vendor.otp = null;
      vendor.otpExpiresAt = null;
      await vendor.save();

      return res.status(200).json({
        message: "OTP verified successfully",
        success: true,
      });
    } else {
      return res.status(400).json({
        message: "Invalid or expired OTP",
        success: false,
      });
    }
  } catch (err) {
    console.log("Error in OTP verification:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const vendorChangePassword = async (req, res) => {
  try {
    console.log("Welcome to user change password");

    const { mobile , password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const vendor = await vendorModel.findOneAndUpdate(
      { "contacts.mobile": mobile },
      { password: hashedPassword },
      { new: true }
    );

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.log("Error in vendor change password", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


const vendorSignup = async (req, res) => {
  try {
    console.log("req.body", req.body);
    const {
      vendorName,
      contacts,
      latitude,
      longitude,
      address,
      landmark,
      password,
      parkingEntries
    } = req.body;

    let parsedContacts;
    try {
      parsedContacts = typeof contacts === 'string' ? JSON.parse(contacts) : contacts;
    } catch (error) {
      return res.status(400).json({ message: "Invalid format for contacts" });
    }

    const existUser = await vendorModel.findOne({ "contacts.mobile": parsedContacts[0].mobile });
    if (existUser) {
      return res.status(400).json({ message: "User with this contact number already exists." });
    }

    const imageFile = req.file;
    let uploadedImageUrl;

    if (imageFile) {
      uploadedImageUrl = await uploadImage(imageFile.buffer, "image");
    }

    if (!vendorName || !address || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    let parsedParkingEntries;
    try {
      parsedParkingEntries = typeof parkingEntries === 'string' ? JSON.parse(parkingEntries) : parkingEntries;
    } catch (error) {
      return res.status(400).json({ message: "Invalid format for parkingEntries" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Define default 24-hour business hours for all days
    const defaultBusinessHours = [
      { day: 'Monday', openTime: '00:00', closeTime: '23:59', is24Hours: true, isClosed: false },
      { day: 'Tuesday', openTime: '00:00', closeTime: '23:59', is24Hours: true, isClosed: false },
      { day: 'Wednesday', openTime: '00:00', closeTime: '23:59', is24Hours: true, isClosed: false },
      { day: 'Thursday', openTime: '00:00', closeTime: '23:59', is24Hours: true, isClosed: false },
      { day: 'Friday', openTime: '00:00', closeTime: '23:59', is24Hours: true, isClosed: false },
      { day: 'Saturday', openTime: '00:00', closeTime: '23:59', is24Hours: true, isClosed: false },
      { day: 'Sunday', openTime: '00:00', closeTime: '23:59', is24Hours: true, isClosed: false }
    ];

    const newVendor = new vendorModel({
      vendorName,
      contacts: parsedContacts,
      latitude,
      longitude,
      landMark: landmark,
      parkingEntries: parsedParkingEntries,
      address,
      subscription: "false",
      subscriptionleft: 0,
      subscriptionenddate: "",
      password: hashedPassword,
      status: "pending",
      platformfee: "",
      newuser: "false",
      visibility: false,
      businessHours: defaultBusinessHours, // Add default 24-hour business hours
      image: uploadedImageUrl || "",
    });

    await newVendor.save();

    newVendor.vendorId = newVendor._id.toString();
    await newVendor.save();

    return res.status(201).json({
      message: "Vendor registered successfully",
      vendorDetails: {
        vendorId: newVendor.vendorId,
        vendorName: newVendor.vendorName,
        contacts: newVendor.contacts,
        latitude: newVendor.latitude,
        longitude: newVendor.longitude,
        landmark: newVendor.landMark,
        address: newVendor.address,
        newuser: newVendor.newuser,
        image: newVendor.image,
        subscription: newVendor.subscription, 
        subscriptionleft: newVendor.subscriptionleft,
        subscriptionenddate: newVendor.subscriptionenddate,
        businessHours: newVendor.businessHours, // Include business hours in response
      },
    });
  } catch (err) {
    console.error("Error in vendor signup", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
const myspacereg = async (req, res) => {
  try {
    console.log("Received request body:", JSON.stringify(req.body, null, 2));

    const { vendorName, spaceid, latitude, longitude, address, landmark, password, parkingEntries } = req.body;

    if (!vendorName || !latitude || !longitude || !address || !spaceid) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let parsedParkingEntries = [];
    if (parkingEntries) {
      try {
        parsedParkingEntries = typeof parkingEntries === "string" ? JSON.parse(parkingEntries) : parkingEntries;
      } catch (error) {
        return res.status(400).json({ message: "Invalid format for parkingEntries" });
      }
    }

    let uploadedImageUrl = "";
    if (req.file) {
      try {
        uploadedImageUrl = await uploadImage(req.file.buffer, "image");
      } catch (imageError) {
        console.error("Image upload failed:", imageError);
        return res.status(500).json({ message: "Image upload failed" });
      }
    }

    // ✅ Define default 24-hour business hours for all days
    const defaultBusinessHours = [
      { day: "Monday", openTime: "00:00", closeTime: "23:59", is24Hours: true, isClosed: false },
      { day: "Tuesday", openTime: "00:00", closeTime: "23:59", is24Hours: true, isClosed: false },
      { day: "Wednesday", openTime: "00:00", closeTime: "23:59", is24Hours: true, isClosed: false },
      { day: "Thursday", openTime: "00:00", closeTime: "23:59", is24Hours: true, isClosed: false },
      { day: "Friday", openTime: "00:00", closeTime: "23:59", is24Hours: true, isClosed: false },
      { day: "Saturday", openTime: "00:00", closeTime: "23:59", is24Hours: true, isClosed: false },
      { day: "Sunday", openTime: "00:00", closeTime: "23:59", is24Hours: true, isClosed: false },
    ];

    const newVendor = new vendorModel({
      vendorName,
      spaceid,
      latitude,
      longitude,
      landMark: landmark,
      parkingEntries: parsedParkingEntries,
      address,
      subscription: false,
      subscriptionleft: 0,
      subscriptionenddate: "",
      status: "pending",
      visibility: false,
      password: password || " ",
      image: uploadedImageUrl,
      businessHours: defaultBusinessHours, // ✅ add business hours
    });

    // ✅ First Save (Mongoose will generate _id)
    await newVendor.save();

    // ✅ Assign vendorId after the first save
    newVendor.vendorId = newVendor._id.toString();

    // ✅ Save again to persist vendorId
    await newVendor.save();

    console.log("Space Created successfully");

    return res.status(201).json({
      message: "New Space registered successfully",
      vendorDetails: newVendor,
      vendorId: newVendor.vendorId, // ✅ Return vendorId
    });

  } catch (err) {
    console.error("Error in vendor signup:", err.message);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};



const fetchsinglespacedata = async (req, res) => {
  try {
    console.log("Welcome to fetch vendor data");

    const { vendorId } = req.query;
    console.log("Welcome to fetch vendor data",vendorId);
    // Check if the ID is provided
    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    const vendorData = await vendorModel.findOne({ vendorId: vendorId }); // Corrected the variable usage

    if (!vendorData) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    return res.status(200).json({
      message: "Vendor data fetched successfully",
      data: vendorData,
    });
  } catch (err) {
    console.error("Error fetching vendor details:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



const updateVendorSubscription = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { subscription, trial } = req.body;

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Update only if provided
    if (typeof subscription !== "undefined") {
      vendor.subscription = subscription === "true" || subscription === true;
    }

    if (typeof trial !== "undefined") {
      vendor.trial = trial === "true" || trial === true;
    }

    await vendor.save();

    return res.status(200).json({
      message: "Vendor subscription updated successfully",
      vendorDetails: {
        vendorId: vendor._id,
        vendorName: vendor.vendorName,
        subscription: vendor.subscription,
        subscriptionenddate: vendor.subscriptionenddate,
        trial: vendor.trial,
      },
    });
  } catch (err) {
    console.error("Error updating vendor subscription", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};



const getVendorTrialStatus = async (req, res) => {
  try {
    const { vendorId } = req.params;

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    const vendor = await vendorModel.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    return res.status(200).json({
      vendorId: vendor._id,
      vendorName: vendor.vendorName,
      trial: vendor.trial, // "true" means trial is completed, "false" means still in trial
    
    });
  } catch (err) {
    console.error("Error fetching vendor trial status", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const addExtraDaysToSubscription = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { extraDays } = req.body; // Number of extra days to add

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    if (!extraDays || isNaN(extraDays)) {
      return res.status(400).json({ message: "Valid number of extra days is required" });
    }

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Update subscription left
    const currentDaysLeft = parseInt(vendor.subscriptionleft || 0);
    const newDaysLeft = currentDaysLeft + parseInt(extraDays);
    vendor.subscriptionleft = newDaysLeft.toString();

    // Update subscription end date
    const today = new Date();
    let subscriptionEndDate;

    if (!vendor.subscriptionenddate) {
      subscriptionEndDate = new Date(today.setDate(today.getDate() + newDaysLeft));
    } else {
      subscriptionEndDate = new Date(vendor.subscriptionenddate);
      subscriptionEndDate.setDate(subscriptionEndDate.getDate() + parseInt(extraDays));
    }

    vendor.subscriptionenddate = subscriptionEndDate.toISOString().split('T')[0];

    // ✅ Set subscription to true
    vendor.subscription = "true";

    await vendor.save();

    return res.status(200).json({
      message: "Extra days added to vendor subscription successfully",
      vendorDetails: {
        vendorId: vendor._id,
        vendorName: vendor.vendorName,
        subscriptionleft: vendor.subscriptionleft,
        subscriptionenddate: vendor.subscriptionenddate,
        subscription: vendor.subscription,
      },
    });
  } catch (err) {
    console.error("Error adding extra days to vendor subscription", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const vendorLogin = async (req, res) => {
  try {
    const { mobile, password, fcmToken } = req.body;

    if (!mobile || !password) {
      return res
        .status(400)
        .json({ message: "Mobile number and password are required" });
    }

    const vendor = await vendorModel.findOne({ 'contacts.mobile': mobile });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, vendor.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Incorrect password" });
    }
    if (fcmToken && !vendor.fcmTokens.includes(fcmToken)) {
      vendor.fcmTokens.push(fcmToken); // Add the new FCM token if it doesn't exist
      await vendor.save();
    }
    return res.status(200).json({
      message: "Login successful",
      vendorId: vendor._id,
      vendorName: vendor.vendorName,
      contacts: vendor.contacts,
      latitude: vendor.latitude,
      longitude: vendor.longitude,
      address: vendor.address,
      newuser: vendor.newuser,
    });
  } catch (err) {
    console.error("Error in vendor login", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
const updateVendor = async (req, res) => {
  try {
    const { vendorId } = req.body; // Assuming vendorId is sent in the request body

    // Validate vendorId
    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    // Find the vendor by vendorId and update newuser to "true"
    const updatedVendor = await vendorModel.findOneAndUpdate(
      { vendorId }, // Query to find the vendor
      { newuser: "true" }, // Update the newuser field
      { new: true, runValidators: true } // Options: return updated document, run schema validators
    );

    // Check if vendor exists
    if (!updatedVendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    return res.status(200).json({
      message: "Vendor updated successfully",
      vendorDetails: {
        vendorId: updatedVendor.vendorId,
        vendorName: updatedVendor.vendorName,
        contacts: updatedVendor.contacts,
        latitude: updatedVendor.latitude,
        longitude: updatedVendor.longitude,
        landMark: updatedVendor.landMark,
        address: updatedVendor.address,
        image: updatedVendor.image,
        subscription: updatedVendor.subscription,
        subscriptionleft: updatedVendor.subscriptionleft,
        subscriptionenddate: updatedVendor.subscriptionenddate,
        businessHours: updatedVendor.businessHours,
        newuser: updatedVendor.newuser, // Include updated newuser field
      },
    });
  } catch (err) {
    console.error("Error in vendor update", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};



const fetchVendorData = async (req, res) => {
  try {
    console.log("Welcome to fetch vendor data");

    const { id } = req.query;
    const vendorData = await vendorModel.findOne({ _id: id }, { password: 0 });

    if (!vendorData) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    
    return res.status(200).json({
      message: "Vendor data fetched successfully",
      data: vendorData
    });
  } catch (err) {
    console.log("Error in fetching the vendor details", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
const fetchspacedata = async (req, res) => {
  try {
    console.log("✅ Fetch vendor data API called");
    console.log("📥 Request Params:", req.params);

    let { spaceid } = req.params;

    if (!spaceid || typeof spaceid !== "string") {
      console.log("❌ Invalid space ID:", spaceid);
      return res.status(400).json({ message: "Valid space ID is required" });
    }

    spaceid = spaceid.trim();
    console.log("🔍 Searching for space ID:", spaceid);

    // Fetch vendors by space ID (case-insensitive)
    const vendorData = await vendorModel.find({ spaceid: new RegExp("^" + spaceid + "$", "i") });

    if (!vendorData.length) {
      console.log("❌ No vendors found for space ID:", spaceid);
      return res.status(404).json({ message: `No vendors found with space ID: ${spaceid}` });
    }

    console.log(`✅ Found ${vendorData.length} vendors`);

    // Fetch vendor subscription details if needed
    const vendorSubscriptionData = await vendorModel.findOne({ spaceid });

    if (!vendorSubscriptionData) {
      return res.status(404).json({ message: "Vendor subscription data not found" });
    }

    return res.status(200).json({
      message: "Vendor data fetched successfully",
      data: vendorData,
    });

  } catch (err) {
    console.error("🚨 Error fetching vendor details:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};


const updatespacedata = async (req, res) => {
  try {
    const { vendorId } = req.params; // Change from spaceid to vendorId
    const { vendorName, latitude, longitude, address, landmark, parkingEntries } = req.body;
    console.log("vendorId:", vendorId);

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    // Ensure vendorId is treated as an ObjectId if stored as one
    const existingVendor = await vendorModel.findOne({ vendorId: String(vendorId) });
    console.log("Existing Vendor:", existingVendor);

    if (!existingVendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const updateData = {
      vendorName: vendorName ?? existingVendor.vendorName,
      latitude: latitude ?? existingVendor.latitude,
      longitude: longitude ?? existingVendor.longitude,
      address: address ?? existingVendor.address,
      landMark: landmark ?? existingVendor.landMark,
      parkingEntries: Array.isArray(parkingEntries)
        ? [...existingVendor.parkingEntries, ...parkingEntries]
        : existingVendor.parkingEntries,
    };

    // Handle image upload if file exists
    if (req.file) {
      try {
        const uploadedImageUrl = await uploadImage(req.file.buffer, "vendor_images");
        updateData.image = uploadedImageUrl;
      } catch (error) {
        console.error("Image upload failed:", error);
        return res.status(500).json({ message: "Image upload failed", error: error.message });
      }
    }

    // Update vendor using vendorId instead of spaceid
    const updatedVendor = await vendorModel.findOneAndUpdate(
      { vendorId: String(vendorId) }, // Match by vendorId
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedVendor) {
      return res.status(500).json({ message: "Failed to update space details" });
    }

    return res.status(200).json({
      message: "Space data updated successfully",
      vendorDetails: updatedVendor,
    });

  } catch (err) {
    console.error("Error in updating vendor data:", err);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

const fetchSlotVendorData = async (req, res) => {
  try {
    console.log("Welcome to fetch vendor data");

    const { id } = req.params; 
    console.log("Vendor ID:", id); 

    const vendorData = await vendorModel.findOne({ _id: id }, { parkingEntries: 1 });

    if (!vendorData) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const parkingEntries = vendorData.parkingEntries.reduce((acc, entry) => {
      const type = entry.type.trim(); 
      acc[type] = parseInt(entry.count) || 0;
      return acc;
    }, {});
   
    console.log("Processed Parking Entries:", parkingEntries);
    
    return res.status(200).json({
      totalCount: Object.values(parkingEntries).reduce((acc, count) => acc + count, 0),
      Cars: parkingEntries["Cars"] || 0, 
      Bikes: parkingEntries["Bikes"] || 0,
      Others: parkingEntries["Others"] || 0
    });
  } catch (err) {
    console.log("Error in fetching the vendor details", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};


const fetchAllVendorData = async (req, res) => {
  try {
    // Fetch only vendors with status 'approved' and exclude the password field
    const vendorData = await vendorModel.find({ status: 'approved' }, { password: 0 });

    if (vendorData.length === 0) {
      return res.status(404).json({ message: "No approved vendors found" });
    }

    return res.status(200).json({
      message: "All approved vendor data fetched successfully",
      data: vendorData
    });
  } catch (err) {
    console.log("Error in fetching all approved vendors", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};


const updateVendorData = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { vendorName, contacts, latitude, longitude, address, landmark, parkingEntries } = req.body;

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    const existingVendor = await vendorModel.findById(vendorId);
    if (!existingVendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const updateData = {
      vendorName: vendorName || existingVendor.vendorName,
      latitude: latitude || existingVendor.latitude,
      longitude: longitude || existingVendor.longitude,
      address: address || existingVendor.address,
      landMark: landmark || existingVendor.landMark,
      contacts: Array.isArray(contacts) ? contacts : existingVendor.contacts,
      parkingEntries: Array.isArray(parkingEntries) ? parkingEntries : existingVendor.parkingEntries,
    };

    let uploadedImageUrl;
    if (req.file) {
      uploadedImageUrl = await uploadImage(req.file.buffer, "vendor_images");
      updateData.image = uploadedImageUrl;
    } else {
      console.log("No file received in the request");
    }

    const updatedVendor = await vendorModel.findByIdAndUpdate(
      vendorId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedVendor) {
      return res.status(404).json({ message: "Failed to update vendor" });
    }

    return res.status(200).json({
      message: "Vendor data updated successfully",
      vendorDetails: updatedVendor,
    });

  } catch (err) {
    console.error("Error in updating vendor data:", err);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};


const updateParkingEntriesVendorData = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { parkingEntries } = req.body;

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    if (!Array.isArray(parkingEntries)) {
      return res.status(400).json({ message: "Invalid parkingEntries format. It must be an array." });
    }

    const updatedVendor = await vendorModel.findByIdAndUpdate(
      vendorId,
      { $set: { parkingEntries } },
      { new: true, projection: { parkingEntries: 1, _id: 0 } } 
    );

    if (!updatedVendor) {
      return res.status(404).json({ message: "Failed to update vendor" });
    }

    return res.status(200).json(updatedVendor);

  } catch (err) {
    console.error("Error in updating parking entries:", err);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

const fetchVendorSubscription = async (req, res) => {
  try {
    const { vendorId } = req.params; // Get vendorId from the request parameters

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required." });
    }

    // Find vendor by vendorId
    const vendor = await vendorModel.findOne({ vendorId });

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found." });
    }

    // Respond with vendor details and subscription status
    return res.status(200).json({
      message: "Vendor found.",
      vendor: {
        vendorId: vendor.vendorId,
        vendorName: vendor.vendorName,
        subscription: vendor.subscription, // Subscription status (true or false)
      },
    });
  } catch (err) {
    console.error("Error in fetching vendor subscription", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const fetchVendorSubscriptionLeft = async (req, res) => {
  try {
    const { vendorId } = req.params;

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required." });
    }


    const vendor = await vendorModel.findOne({ vendorId });

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found." });
    }

    return res.status(200).json({
      subscriptionleft: vendor.subscriptionleft,
    });
  } catch (err) {
    console.error("Error in fetching vendor subscriptionleft", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const fetchAllVendorDetails = async (req, res) => {
  try {
    console.log("Fetching all vendor details");
    const allVendors = await vendorModel.find({}, { password: 0 });
    
    if (!allVendors || allVendors.length === 0) {
      return res.status(404).json({ 
        message: "No vendors found in the database" 
      });
    }
    return res.status(200).json({
      message: "All vendor details fetched successfully",
      count: allVendors.length,
      data: allVendors
    });
  } catch (err) {
    console.error("Error fetching all vendor details:", err);
    return res.status(500).json({ 
      message: "Internal server error", 
      error: err.message 
    });
  }
};

const updateVendorStatus = async (req, res) => {
  try {
    const { vendorId } = req.params;

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    vendor.status = "approved";
    await vendor.save();

    return res.status(200).json({
      message: "Vendor status updated to approved",
      vendorDetails: {
        vendorId: vendor.vendorId,
        status: vendor.status,
      },
    });
  } catch (error) {
    console.error("Error updating vendor status", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const fetchhours = async (req, res) => {
  try {
    const vendorId = req.params.vendorId; // use params, not query
    console.log("Received vendorId:", vendorId);

    const vendor = await vendorModel.findOne({ vendorId });

    if (!vendor) {
      console.error("Vendor not found with vendorId:", vendorId);
      return res.status(404).json({ message: "Vendor not found" });
    }

    console.log("Vendor found:", vendor.vendorName);
    res.json({ businessHours: vendor.businessHours });
  } catch (error) {
    console.error("Error in fetchhours:", error);
    res.status(500).json({ message: error.message });
  }
};



const updateVendorHours = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { businessHours } = req.body;

    if (!vendorId || !businessHours) {
      return res.status(400).json({ message: "Vendor ID and business hours are required" });
    }

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    vendor.businessHours = businessHours;
    await vendor.save();

    return res.status(200).json({
      message: "Business hours updated successfully",
      businessHours: vendor.businessHours,
    });
  } catch (error) {
    console.error("Error updating business hours", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
const vendorLogoutById = async (req, res) => {
  try {
    const { _id } = req.body;

    if (!_id) {
      return res.status(400).json({ message: "Vendor _id is required" });
    }

    // Find vendor by _id
    const vendor = await vendorModel.findById(_id);

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found with provided _id" });
    }

    if (vendor.fcmTokens.length === 0) {
      return res.status(200).json({ message: "No FCM tokens to remove" });
    }

    // Remove the last token
    vendor.fcmTokens.pop();
    await vendor.save();

    return res.status(200).json({ message: "Last FCM token removed successfully" });
  } catch (error) {
    console.error("Error in logout:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
const updateVendorVisibility = async (req, res) => {
  const { id } = req.params;
  const { visibility } = req.body;

  if (typeof visibility !== "boolean") {
    return res.status(400).json({ message: "Visibility must be true or false." });
  }

  try {
    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    vendor.visibility = visibility;
    await vendor.save();

    return res.status(200).json({
      message: "Vendor visibility updated successfully",
      vendor: {
        _id: vendor._id,
        vendorName: vendor.vendorName,
        visibility: vendor.visibility
      }
    });
  } catch (error) {
    console.error("Error updating visibility:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const deleteBookingsByVendorId = async (req, res) => {
  try {
    const { vendorId } = req.params;

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "Vendor ID is required" });
    }

    const result = await Booking.deleteMany({ vendorId });

    return res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} bookings for vendorId ${vendorId}`,
    });
  } catch (error) {
    console.error("Error deleting bookings:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};


// In vendorController.js
const updateVendorVisibilityOnly = async (req, res) => {
  try {
    const vendorId = req.params.id;
    const { visibility } = req.body;

    if (typeof visibility !== "boolean") {
      return res.status(400).json({ message: "Visibility must be true or false" });
    }

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    vendor.visibility = visibility;

    // Only update platform fee if visibility is being turned ON and platformfee is "0"
    if (visibility === true && vendor.platformfee === "0") {
      vendor.platformfee = "5";
    }

    await vendor.save();
    res.json({ message: "Vendor visibility updated successfully", vendor });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


const fetchvisiblevendordata = async (req, res) => {
  try {
    // Fetch vendors with status 'approved' and visibility set to true, exclude password field
    const vendors = await vendorModel.find(
      { status: 'approved', visibility: true },
      { password: 0 }
    );

    if (!vendors || vendors.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No approved and visible vendors found",
      });
    }

    // Map for charge ID to key name
    const chargeMap = {
      A: "carInstant",
      B: "carSchedule",
      C: "carFullDay",
      D: "carMonthly",
      E: "bikeInstant",
      F: "bikeSchedule",
      G: "bikeFullDay",
      H: "bikeMonthly",
      I: "othersInstant",
      J: "othersSchedule",
      K: "othersFullDay",
      L: "othersMonthly"
    };

    const results = [];

    for (const vendor of vendors) {
      const chargesDoc = await Parkingcharges.findOne({ vendorid: vendor.vendorId });

      const categorizedCharges = {};

      if (chargesDoc && chargesDoc.charges) {
        chargesDoc.charges.forEach((charge) => {
          const key = chargeMap[charge.chargeid];
          if (key) {
            categorizedCharges[key] = {
              type: charge.type,
              amount: charge.amount,
              category: charge.category,
            };
          }
        });
      }

      // Add charges inside the vendor object
      const vendorWithCharges = {
        ...vendor.toObject(), // Convert Mongoose document to plain JS object
        charges: categorizedCharges, // Inject charges directly into the vendor
      };

      results.push(vendorWithCharges);
    }

    // Final response
    return res.status(200).json({
      success: true,
      message: "Approved and visible vendors fetched successfully",
      data: results,
    });

  } catch (error) {
    console.error("Error fetching approved and visible vendors:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const updateVendorPlatformFee = async (req, res) => {
  try {
    const vendorId = req.params.id;
    const { platformfee } = req.body;

    // Validate input
    if (platformfee === undefined || platformfee === null || String(platformfee).trim() === "") {
      return res.status(400).json({ message: "Platform fee is required" });
    }

    // Check if it's a valid non-negative number
    if (isNaN(platformfee) || Number(platformfee) < 0) {
      return res.status(400).json({ message: "Platform fee must be a valid non-negative number" });
    }

    // Find and update vendor
    const vendor = await vendorModel.findByIdAndUpdate(
      vendorId,
      { platformfee: String(platformfee) },
      { new: true } // return updated document
    );

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.json({
      message: "Vendor platform fee updated successfully",
      vendor: {
        id: vendor._id,
        vendorId: vendor.vendorId,
        vendorName: vendor.vendorName,
        platformfee: vendor.platformfee
      }
    });

  } catch (err) {
    console.error("Error updating platform fee:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
const vendoridlogin = async (req, res) => {
  try {
    const { vendorId, password } = req.body;

    // Validate input
    if (!vendorId || !password) {
      return res
        .status(400)
        .json({ message: "Vendor ID and password are required" });
    }

    // Find vendor by vendorId
    const vendor = await vendorModel.findOne({ vendorId });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, vendor.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Incorrect password" });
    }



    // Return success response with vendor details
    return res.status(200).json({
      message: "Login successful",
      vendorId: vendor.vendorId,
      vendorName: vendor.vendorName,
      contacts: vendor.contacts,
      latitude: vendor.latitude,
      longitude: vendor.longitude,
      address: vendor.address,
    });
  } catch (err) {
    console.error("Error in vendor login", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
module.exports = {
  vendoridlogin,
  updateVendorPlatformFee,
  updateVendorVisibilityOnly,
  fetchvisiblevendordata,
  deleteBookingsByVendorId,
  fetchhours,
  vendorLogoutById,
  updateVendorVisibility,
  updateVendorHours ,
  vendorSignup,
  vendorLogin,
  vendorForgotPassword,
  verifyOTP,
  vendorChangePassword,
  fetchVendorData,
  fetchAllVendorData,
  updateVendorData,
  fetchSlotVendorData,
  fetchVendorSubscription,
  updateParkingEntriesVendorData,
  updateVendorSubscription,
  fetchVendorSubscriptionLeft,
  myspacereg,

  fetchspacedata,
  getVendorTrialStatus,
  updatespacedata,
  fetchsinglespacedata,
  fetchAllVendorDetails,
  updateVendorStatus,
  updateVendor,
  addExtraDaysToSubscription,
};
