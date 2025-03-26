const bcrypt = require("bcrypt");
const vendorModel = require("../../models/venderSchema");
const { uploadImage } = require("../../config/cloudinary");
const generateOTP = require("../../utils/generateOTP");
// const agenda = require("../../config/agenda");

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

    const { vendorName, spaceid, latitude, longitude, address, landmark, password, placetype, parkingEntries } = req.body;

    // Validate required fields
    if (!vendorName || !latitude || !longitude || !address || !spaceid) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Parse parkingEntries safely
    let parsedParkingEntries = [];
    if (parkingEntries) {
      try {
        parsedParkingEntries = typeof parkingEntries === "string" ? JSON.parse(parkingEntries) : parkingEntries;
      } catch (error) {
        return res.status(400).json({ message: "Invalid format for parkingEntries" });
      }
    }

    // Handle image upload
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
      password: password || " ",  // ✅ Use provided password or default
      image: uploadedImageUrl,
    });

    // Save to database
    await newVendor.save();
    console.log("Space Created successfully");

    return res.status(201).json({ 
      message: "New Space registered successfully", 
      vendorDetails: newVendor,
      vendorId: newVendor._id  // ✅ Return vendorId in response
    });

  } catch (err) {
    console.error("Error in vendor signup:", err.message);
    return res.status(500).json({ message: "Internal server error", error: err.message });
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
      },
    });
  } catch (err) {
    console.error("Error updating vendor subscription", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};



const vendorLogin = async (req, res) => {
  try {
    const { mobile, password } = req.body;

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

    // Use find() instead of findOne() to get multiple results
    const vendorData = await vendorModel.find({ spaceid: new RegExp("^" + spaceid + "$", "i") });

    if (!vendorData.length) {
      console.log("❌ No vendors found for space ID:", spaceid);
      return res.status(404).json({ message: `No vendors found with space ID: ${spaceid}` });
    }

    console.log(`✅ Found ${vendorData.length} vendors`);

    console.log("Welcome to fetch vendor data");
    console.log("Request Query Params:", req.query);
    console.log("Request Body:", req.body);

    let { vendorId } = req.query || req.body;  

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    vendorId = vendorId.trim();  // Fix: Remove any extra spaces or newline characters

    const vendorSubscriptionData = await vendorModel.findOne({ vendorId });

    if (!vendorData) {
      return res.status(404).json({ message: "Vendor not found" });
    }


    return res.status(200).json({
      message: "Vendor data fetched successfully",
      data: vendorData
    });
  } catch (err) {
    console.error("🚨 Error fetching vendor details:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
const updatespacedata = async (req, res) => {
  try {
    const { spaceid } = req.params;
    const { vendorName, latitude, longitude, address, landmark, parkingEntries } = req.body;
    console.log("spaceid:", spaceid);

    if (!spaceid) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    // Ensure spaceid is treated as a string
    const existingVendor = await vendorModel.findOne({ spaceid: String(spaceid) });
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

    // Update vendor using vendorId (not _id)
    const updatedVendor = await vendorModel.findOneAndUpdate(
      { spaceid: String(spaceid) }, // Match by vendorId
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


const fetchAllVendorData = async (req,res) => {
  try {
    const vendorData = await vendorModel.find({}, { password: 0 });

    if (vendorData.length === 0) {
      return res.status(404).json({ message: "No vendors found" });
    }

  
    return res.status(200).json({
      message: "All vendor data fetched successfully",
      data: vendorData
    });
  } catch (err) {
    console.log("Error in fetching all vendors", err);
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
    const { vendorId } = req.params; // Get vendorId from the request parameters

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required." });
    }

    // Find the vendor by vendorId
    const vendor = await vendorModel.findOne({ vendorId });

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found." });
    }

    // Respond with the subscriptionleft data
    return res.status(200).json({
      subscriptionleft: vendor.subscriptionleft,
    });
  } catch (err) {
    console.error("Error in fetching vendor subscriptionleft", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};


module.exports = {
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
  updatespacedata,
};
