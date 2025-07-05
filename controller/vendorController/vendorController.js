const bcrypt = require("bcrypt");
const vendorModel = require("../../models/venderSchema");
const { uploadImage } = require("../../config/cloudinary");
const generateOTP = require("../../utils/generateOTP");

const axios = require('axios');


// const encodeMessage = (otp) => {
//   const message = `Hi, ${otp} is your One time verification code. Park Smart with ParkMyWheels.`;
//   return {
//     raw: message,
//     encoded: encodeURIComponent(message),
//   };
// };

// const vendorForgotPassword = async (req, res) => {
//   try {
//     const { mobile } = req.body;

//     if (!mobile) {
//       return res.status(400).json({ message: "Mobile number is required" });
//     }

//     // Check vendor existence
//     const existVendor = await vendorModel.findOne({ "contacts.mobile": mobile });

//     if (!existVendor) {
//       return res.status(404).json({
//         message: "Vendor not found with the provided mobile number",
//       });
//     }

//     // Generate and store OTP
//     const otp = generateOTP();
//     existVendor.otp = otp;
//     existVendor.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
//     await existVendor.save();

//     // Prepare SMS message
//     const { raw, encoded } = encodeMessage(otp);

//     // Log what you're sending
//     console.log("🔐 OTP:", otp);
//     console.log("📤 SMS Text (raw):", raw);
//     console.log("📤 SMS Text (encoded):", encoded);

//     // VISPL SMS API Call
//     const smsResponse = await axios.get("https://pgapi.vispl.in/fe/api/v1/send", {
//       params: {
//         username: process.env.VISPL_USERNAME || "vayusutha",             // Replace with env in production
//         password: process.env.VISPL_PASSWORD || "Connect@123",           // Replace with env in production
//         unicode: "false",
//         from: process.env.VISPL_SENDER_ID || "PRMYWH",                   // Your DLT-approved sender ID
//         to: mobile,
//         text: encoded,
//         dltContentId: process.env.VISPL_TEMPLATE_ID || "1007991289098439570", // Approved Template ID
//       }
//     });

//     // Log VISPL response
//     console.log("📩 VISPL SMS API Response:", smsResponse.data);

//     if (smsResponse.data.statusCode !== 2000) {
//       return res.status(500).json({
//         message: "Failed to send OTP via SMS",
//         visplResponse: smsResponse.data,
//       });
//     }

//     return res.status(200).json({ message: "OTP sent successfully" });

//   } catch (err) {
//     console.error("❌ Error in forgot password:", err);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };
const vendorForgotPassword = async (req, res) => {
  try {
    const { mobile } = req.body; 


    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    const existVendor = await vendorModel.findOne({
      "contacts.mobile": mobile, 
    });

    if (!existVendor) {
      return res.status(404).json({
        message: "Vendor not found with the provided mobile number",
      });
    }


    const otp = generateOTP();
    console.log("Generated OTP:", otp);

    req.app.locals.otp = otp;

    return res.status(200).json({
      message: "OTP sent successfully",
      otp: otp,
    });
  } catch (err) {
    console.error("Error in forgot password:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ message: "OTP is required" });
    }

    if (req.app.locals.otp) {
      console.log(" req.app.locals");
      if (otp == req.app.locals.otp) {
        return res.status(200).json({
          message: "OTP verified successfully",
          success: true,
        });
      } else {
        console.log("no req.app.locals");
        return res.status(400).json({
          message: "Invalid OTP",
          success: false,
        });
      }
    } else {
      return res.status(400).json({
        message: "OTP has expired or is invalid",
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

    const newVendor = new vendorModel({
      vendorName,
      contacts: parsedContacts,
      latitude,
      longitude,
      landMark: landmark,
      parkingEntries: parsedParkingEntries,
      address,
      subscription: "false",
      subscriptionleft: "0",
      subscriptionenddate: "",
      password: hashedPassword,
      status: "pending", // Explicitly set status to pending
      platformfee: "",
      visibility: false,
  
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
        image: newVendor.image,
        subscription: newVendor.subscription, 
        subscriptionleft: newVendor.subscriptionleft,
        subscriptionenddate: newVendor.subscriptionenddate,
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
      vendorId: newVendor.vendorId  // ✅ Return vendorId
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
    // Extract vendorId from URL parameters
    const { vendorId } = req.params;
    let { subscription, subscriptionleft } = req.body;

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    // If subscription or subscriptionleft is not provided, set default values
    if (typeof subscription === "undefined") {
      subscription = "true";
    }
    if (typeof subscriptionleft === "undefined") {
      subscriptionleft = "30";
    }

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // If the subscription is true and subscriptionleft is 30, calculate the new subscription end date
    if (subscription === "true" && subscriptionleft === "30") {
      const today = new Date();
      let subscriptionEndDate;

      // If subscriptionenddate is missing, set it
      if (!vendor.subscriptionenddate) {
        subscriptionEndDate = new Date(today.setDate(today.getDate() + 30)); // Add 30 days to the current date
        vendor.subscriptionenddate = subscriptionEndDate.toISOString().split('T')[0]; // Format to YYYY-MM-DD
      }
    }

    // Update vendor subscription details
    vendor.subscription = subscription;  // Ensure subscription is set
    vendor.subscriptionleft = subscriptionleft;  // Ensure subscriptionleft is set

    // If subscriptionenddate is still not set, we calculate and set it
    if (!vendor.subscriptionenddate) {
      const today = new Date();
      let subscriptionEndDate = new Date(today.setDate(today.getDate() + 30)); // Add 30 days to the current date
      vendor.subscriptionenddate = subscriptionEndDate.toISOString().split('T')[0]; // Format to YYYY-MM-DD
    }

    // Set trial to true once activated
    if (vendor.trial !== "true") {
      vendor.trial = "true"; // Activate trial
    }

    await vendor.save();

    return res.status(200).json({
      message: "Vendor subscription updated successfully",
      vendorDetails: {
        vendorId: vendor._id,
        vendorName: vendor.vendorName,
        contacts: vendor.contacts,
        latitude: vendor.latitude,
        longitude: vendor.longitude,
        landmark: vendor.landMark,
        address: vendor.address,
        image: vendor.image,
        subscription: vendor.subscription,          // Explicitly return subscription
        subscriptionleft: vendor.subscriptionleft,  // Explicitly return subscriptionleft
        subscriptionenddate: vendor.subscriptionenddate, // Explicitly return subscriptionenddate
        trial: vendor.trial, // Return trial status
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
    const currentDaysLeft = parseInt(vendor.subscriptionleft);
    const newDaysLeft = currentDaysLeft + parseInt(extraDays);
    vendor.subscriptionleft = newDaysLeft.toString(); // Update subscription left

    // Update subscription end date
    const today = new Date();
    let subscriptionEndDate;

    if (!vendor.subscriptionenddate) {
      subscriptionEndDate = new Date(today.setDate(today.getDate() + newDaysLeft)); // Add new days to current date
    } else {
      subscriptionEndDate = new Date(vendor.subscriptionenddate);
      subscriptionEndDate.setDate(subscriptionEndDate.getDate() + parseInt(extraDays)); // Add extra days to existing end date
    }

    vendor.subscriptionenddate = subscriptionEndDate.toISOString().split('T')[0]; // Format to YYYY-MM-DD

    await vendor.save();

    return res.status(200).json({
      message: "Extra days added to vendor subscription successfully",
      vendorDetails: {
        vendorId: vendor._id,
        vendorName: vendor.vendorName,
        subscriptionleft: vendor.subscriptionleft, // Return updated subscription left
        subscriptionenddate: vendor.subscriptionenddate, // Return updated subscription end date
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
    });
  } catch (err) {
    console.error("Error in vendor login", err);
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
module.exports = {
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
  addExtraDaysToSubscription,
};
