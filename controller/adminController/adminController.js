const bcrypt = require("bcrypt");
const adminModel = require("../../models/adminSchema");
const vendorModel = require("../../models/venderSchema");
const userModel = require("../../models/userModel");
const KycDetails = require('../../models/kycSchema');
const Booking = require("../../models/bookingSchema");
const VendorHelpSupport = require("../../models/userhelp");
const { uploadImage } = require("../../config/cloudinary");
const generateOTP = require("../../utils/generateOTP");
const Vendor = require("../../models/venderSchema");
const Notification = require("../../models/notificationschema");
// const agenda = require("../../config/agenda");
const { v4: uuidv4 } = require('uuid');
const admin = require("../../config/firebaseAdmin");
const { DateTime } = require("luxon");

const vendorForgotPassword = async (req, res) => {
    try {
        const { mobile } = req.body;


        if (!mobile) {
            return res.status(400).json({ message: "Mobile number is required" });
        }

        const existVendor = await adminModel.findOne({
            "contacts.mobile": mobile,
        });

        if (!existVendor) {
            return res.status(404).json({
                message: "Admin not found with the provided mobile number",
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

        const { mobile, password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const vendor = await adminModel.findOneAndUpdate(
            { "contacts.mobile": mobile },
            { password: hashedPassword },
            { new: true }
        );

        if (!vendor) {
            return res.status(404).json({ message: "Admin not found" });
        }

        res.status(200).json({ message: "Password updated successfully" });
    } catch (err) {
        console.log("Error in vendor change password", err);
        res.status(500).json({ message: "Internal server error" });
    }
};


const vendorSignup = async (req, res) => {
    try {
        const {
            adminName,
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

        const existUser = await adminModel.findOne({ "contacts.mobile": parsedContacts[0].mobile });
        if (existUser) {
            return res.status(400).json({ message: "User with this contact number already exists." });
        }

        const imageFile = req.file;
        let uploadedImageUrl;

        if (imageFile) {
            uploadedImageUrl = await uploadImage(imageFile.buffer, "image");
        }

        if (!adminName || !address || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        let parsedParkingEntries;
        try {
            parsedParkingEntries = typeof parkingEntries === 'string' ? JSON.parse(parkingEntries) : parkingEntries;
        } catch (error) {
            return res.status(400).json({ message: "Invalid format for parkingEntries" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate unique vendorId
        const vendorId = `VENDOR-${uuidv4().split('-')[0].toUpperCase()}`;

        const newVendor = new adminModel({
            adminName,
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
            image: uploadedImageUrl || "",
            vendorId: vendorId
        });

        await newVendor.save();

        return res.status(201).json({
            message: "Vendor registered successfully",
            vendorDetails: {
                vendorId: newVendor.vendorId,
                adminId: newVendor.adminId,
                adminName: newVendor.adminName,
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

        // Handle duplicate key error
        if (err.code === 11000) {
            return res.status(400).json({
                message: "A vendor with this ID already exists",
                error: err.message
            });
        }

        return res.status(500).json({ message: "Internal server error" });
    }
};

const myspacereg = async (req, res) => {
    try {
        const {
            adminName,
            latitude,
            longitude,
            address,
            landmark,
            password,
            placetype,
            parkingEntries
        } = req.body;

        // Validate required fields
        if (!adminName || !latitude || !longitude || !address) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Parse parkingEntries safely
        let parsedParkingEntries = [];
        if (parkingEntries) {
            try {
                parsedParkingEntries = typeof parkingEntries === "string"
                    ? JSON.parse(parkingEntries)
                    : parkingEntries;
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

        // Generate unique vendorId
        const vendorId = `VENDOR-${uuidv4().split('-')[0].toUpperCase()}`;

        // Create new vendor object
        const newVendor = new adminModel({
            adminName,
            placetype,
            latitude,
            longitude,
            landMark: landmark,
            parkingEntries: parsedParkingEntries,
            address,
            subscription: "false",
            subscriptionleft: 0,
            subscriptionenddate: "",
            password: password || " ",  // Use provided password or default
            image: uploadedImageUrl,
            vendorId: vendorId
        });

        // Save to database
        await newVendor.save();
        console.log("Space Created successfully");

        return res.status(201).json({
            message: "New Space registered successfully",
            vendorDetails: {
                vendorId: newVendor.vendorId,
                adminId: newVendor.adminId,
                adminName: newVendor.adminName,
                placetype: newVendor.placetype,
                latitude: newVendor.latitude,
                longitude: newVendor.longitude,
                landmark: newVendor.landMark,
                address: newVendor.address,
                image: newVendor.image,
                parkingEntries: newVendor.parkingEntries
            }
        });

    } catch (err) {
        console.error("Error in vendor signup:", err.message);

        // Handle duplicate key error
        if (err.code === 11000) {
            return res.status(400).json({
                message: "A vendor with this ID already exists",
                error: err.message
            });
        }

        return res.status(500).json({
            message: "Internal server error",
            error: err.message
        });
    }
};




const updateVendorSubscription = async (req, res) => {
    try {
        // Extract adminId from URL parameters
        const { adminId } = req.params;
        let { subscription, subscriptionleft } = req.body;

        if (!adminId) {
            return res.status(400).json({ message: "Vendor ID is required" });
        }

        // If subscription or subscriptionleft is not provided, set default values
        if (typeof subscription === "undefined") {
            subscription = "true";
        }
        if (typeof subscriptionleft === "undefined") {
            subscriptionleft = 30;
        }

        const vendor = await adminModel.findById(adminId);
        if (!vendor) {
            return res.status(404).json({ message: "Admin not found" });
        }

        // If the subscription is true and subscriptionleft is 30, calculate the new subscription end date
        if (subscription === "true" && subscriptionleft === 30) {
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
                adminId: vendor._id,
                adminName: vendor.adminName,
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

        const vendor = await adminModel.findOne({ 'contacts.mobile': mobile });
        if (!vendor) {
            return res.status(404).json({ message: "Admin not found" });
        }

        const isPasswordValid = await bcrypt.compare(password, vendor.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Incorrect password" });
        }

        return res.status(200).json({
            message: "Login successful",
            adminId: vendor._id,
            adminName: vendor.adminName,
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
        const vendorData = await adminModel.findOne({ _id: id }, { password: 0 });

        if (!vendorData) {
            return res.status(404).json({ message: "Admin not found" });
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
        console.log("Welcome to fetch vendor data");
        console.log("Request Query Params:", req.query);
        console.log("Request Body:", req.body);

        let { adminId } = req.query || req.body;

        if (!adminId) {
            return res.status(400).json({ message: "Vendor ID is required" });
        }

        adminId = adminId.trim();  // Fix: Remove any extra spaces or newline characters

        const vendorData = await adminModel.findOne({ adminId });

        if (!vendorData) {
            return res.status(404).json({ message: "Admin not found" });
        }

        return res.status(200).json({
            message: "Vendor data fetched successfully",
            data: vendorData
        });
    } catch (err) {
        console.error("Error in fetching the vendor details", err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};


const fetchSlotVendorData = async (req, res) => {
    try {
        console.log("Welcome to fetch vendor data");

        const { id } = req.params;
        console.log("Vendor ID:", id);

        const vendorData = await adminModel.findOne({ _id: id }, { parkingEntries: 1 });

        if (!vendorData) {
            return res.status(404).json({ message: "Admin not found" });
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
        const vendorData = await adminModel.find({}, { password: 0 });

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
        const { adminId } = req.params;
        const { adminName, contacts, latitude, longitude, address, landmark, parkingEntries } = req.body;

        if (!adminId) {
            return res.status(400).json({ message: "Vendor ID is required" });
        }

        const existingVendor = await adminModel.findById(adminId);
        if (!existingVendor) {
            return res.status(404).json({ message: "Admin not found" });
        }

        const updateData = {
            adminName: adminName || existingVendor.adminName,
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

        const updatedVendor = await adminModel.findByIdAndUpdate(
            adminId,
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
        const { adminId } = req.params;
        const { parkingEntries } = req.body;

        if (!adminId) {
            return res.status(400).json({ message: "Vendor ID is required" });
        }

        if (!Array.isArray(parkingEntries)) {
            return res.status(400).json({ message: "Invalid parkingEntries format. It must be an array." });
        }

        const updatedVendor = await adminModel.findByIdAndUpdate(
            adminId,
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
        const { adminId } = req.params; // Get adminId from the request parameters

        if (!adminId) {
            return res.status(400).json({ message: "Vendor ID is required." });
        }

        // Find vendor by adminId
        const vendor = await adminModel.findOne({ adminId });

        if (!vendor) {
            return res.status(404).json({ message: "Admin not found." });
        }

        // Respond with vendor details and subscription status
        return res.status(200).json({
            message: "Vendor found.",
            vendor: {
                adminId: vendor.adminId,
                adminName: vendor.adminName,
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
        const { adminId } = req.params; // Get adminId from the request parameters

        if (!adminId) {
            return res.status(400).json({ message: "Vendor ID is required." });
        }

        // Find the vendor by adminId
        const vendor = await adminModel.findOne({ adminId });

        if (!vendor) {
            return res.status(404).json({ message: "Admin not found." });
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

const deleteVendor = async (req, res) => {
    try {
      const { vendorId } = req.params;
  
      const deletedVendor = await vendorModel.findOneAndDelete({ vendorId });
  
      if (!deletedVendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
  
      return res.status(200).json({ message: "Vendor deleted successfully" });
    } catch (error) {
      console.error("Error deleting vendor:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };

  const deleteUserById = async (req, res) => {
    try {
      const userId = req.params.id;
  
      const deletedUser = await userModel.findOneAndDelete({ uuid: userId });
  
      if (!deletedUser) {
        return res.status(404).json({ message: "User not found" });
      }
  
      res.status(200).json({
        message: "User deleted successfully",
        user: deletedUser,
      });
    } catch (err) {
      console.error("Error deleting user:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  };

const getAllSpaces = async (req, res) => {
  try {
    const vendors = await vendorModel.find(
      { spaceid: { $exists: true, $ne: "" } }, // filter vendors with a non-empty spaceid
      {
        vendorId: 1,
        vendorName: 1,
        spaceid: 1,
        address: 1,
        latitude: 1,
        longitude: 1,
        landMark: 1,
        image: 1,
        parkingEntries: 1,
        subscription: 1,
        subscriptionleft: 1,
        subscriptionenddate: 1,
        status: 1,
        _id: 0
      }
    );

    return res.status(200).json({
      message: "Fetched vendor spaces with spaceid successfully",
      total: vendors.length,
      vendorSpaces: vendors
    });

  } catch (err) {
    console.error("Error fetching vendor spaces:", err.message);
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

const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.find({}, '-userPassword'); 

    if (users.length === 0) {
      return res.status(404).json({ message: "No users found." });
    }

    res.status(200).json({
      message: "Users fetched successfully",
      users,
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchspacedatabyuser = async (req, res) => {
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

const deleteKycData = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedKyc = await KycDetails.findByIdAndDelete(id);

    if (!deletedKyc) {
      return res.status(404).json({ message: "KYC record not found" });
    }

    res.status(200).json({ message: "KYC record deleted successfully", data: deletedKyc });
  } catch (error) {
    console.error("Error deleting KYC:", error);
    res.status(500).json({ message: "Error deleting KYC", error: error.message });
  }
};

const getAllVendorsTransaction = async (req, res) => {
  try {
    const vendors = await vendorModel.find({});
    
    if (!vendors || vendors.length === 0) {
      return res.status(404).json({ success: false, message: "No vendors found" });
    }

    const results = await Promise.all(
      vendors.map(async (vendor) => {
        const platformFeePercentage = parseFloat(vendor.platformfee) || 0;
        const completedBookings = await Booking.find({ 
          vendorId: vendor._id, 
          status: "COMPLETED" 
        });

        const totals = completedBookings.reduce((acc, booking) => {
          const amount = parseFloat(booking.amount);
          const platformfee = (amount * platformFeePercentage) / 100;
          acc.totalAmount += amount;
          acc.totalReceivable += (amount - platformfee);
          return acc;
        }, { totalAmount: 0, totalReceivable: 0 });

        return {
          vendorId: vendor._id,
          vendorName: vendor.vendorName,
          platformFeePercentage,
          totalAmount: totals.totalAmount.toFixed(2),
          totalReceivable: totals.totalReceivable.toFixed(2),
          bookingCount: completedBookings.length
        };
      })
    );

    const grandTotals = results.reduce((acc, vendor) => {
      acc.grandTotalAmount += parseFloat(vendor.totalAmount);
      acc.grandTotalReceivable += parseFloat(vendor.totalReceivable);
      return acc;
    }, { grandTotalAmount: 0, grandTotalReceivable: 0 });

    res.status(200).json({
      success: true,
      data: {
        grandTotalAmount: grandTotals.grandTotalAmount.toFixed(2),
        grandTotalReceivable: grandTotals.grandTotalReceivable.toFixed(2),
        vendors: results
      }
    });

  } catch (error) {
    console.error("Error fetching vendors' summary:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};





const closeChat = async (req, res) => {
  try {
    const { helpRequestId } = req.params;
    const { adminId } = req.body;

    // Find the help request (no need to populate since vendorid is just a string)
    const helpRequest = await VendorHelpSupport.findById(helpRequestId);

    if (!helpRequest) {
      return res.status(404).json({ message: "Help request not found." });
    }

    helpRequest.status = "Completed";
    helpRequest.closedAt = new Date();
    helpRequest.closedBy = adminId;
    await helpRequest.save();

    // Check vendorid properly - vendorid is a string field, not ObjectId reference
    const vendorIdString = helpRequest?.vendorid || null;

    console.log("🔍 Debug closeChat:", {
      helpRequestId: helpRequest._id,
      vendorid: vendorIdString,
      status: helpRequest.status
    });

    if (vendorIdString) {
      // Since vendorid contains the MongoDB ObjectId of the vendor, find by _id
      console.log("🔍 Searching for vendor with _id:", vendorIdString);
      const vendorDoc = await vendorModel.findById(vendorIdString, { fcmTokens: 1, vendorId: 1 });

      if (vendorDoc) {
        console.log("✅ Vendor found:", {
          vendorId: vendorDoc.vendorId,
          fcmTokensCount: vendorDoc.fcmTokens?.length || 0,
          fcmTokens: vendorDoc.fcmTokens
        });

        if (vendorDoc.fcmTokens?.length > 0) {
          const tokens = vendorDoc.fcmTokens;

          console.log("📱 Sending notification to tokens:", tokens);

          try {
            // Fix: Use same method as working booking code
            const promises = tokens.map(async (token) => {
              try {
                await admin.messaging().send({
                  notification: {
                    title: "Support Ticket Update",
                    body: `Your support ticket #${helpRequest._id} has been updated. Please check the app for details.`,
                  },
                  data: {
                    type: "support_ticket_update",
                    helpRequestId: helpRequest._id.toString(),
                  },
                  token: token
                });
                console.log(`✅ Notification sent successfully to token: ${token.substring(0, 50)}...`);
              } catch (error) {
                console.error(`❌ Failed to send to token ${token.substring(0, 50)}...:`, error.message);
              }
            });

            await Promise.all(promises);
            console.log(`✅ All notifications processed. Sent to ${tokens.length} device(s)`);

          } catch (notifErr) {
            console.error("❌ Error sending notifications:", notifErr);
          }
        } else {
          console.log("⚠️ Vendor found but no FCM tokens available");
        }
      } else {
        console.log("❌ Vendor not found with vendorId:", vendorIdString);
      }
    } else {
      console.log("❌ No vendorid found in help request");
    }

    res.status(200).json({
      message: "Chat closed successfully and notification sent.",
      status: helpRequest.status,
    });
  } catch (error) {
    console.error("Error in closeChat:", error);
    res.status(500).json({ message: "Error closing chat", error: error.message });
  }
};

const getVendorCount = async (req, res) => {
  try {
    const count = await vendorModel.countDocuments();
    
    return res.status(200).json({
      message: "Vendor count fetched successfully",
      count: count
    });
  } catch (err) {
    console.error("Error fetching vendor count:", err);
    return res.status(500).json({
      message: "Internal server error",
      error: err.message
    });
  }
};


const getBookingSummary = async (req, res) => {
  try {
    const count = await Booking.countDocuments();

    const bookings = await Booking.find({}, { createdAt: 1 });

    // Create a Set to store unique "YYYY-MM" strings
    const uniqueMonths = new Set();

    bookings.forEach((booking) => {
      if (booking.createdAt) {
        const date = new Date(booking.createdAt);
        const month = `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
        uniqueMonths.add(month);
      }
    });

    res.status(200).json({
      message: "Booking summary fetched successfully",
      count,
      totalMonths: uniqueMonths.size
    });
  } catch (error) {
    console.error("Error fetching booking summary:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

const getUserSummary = async (req, res) => {
  try {
    const count = await userModel.countDocuments();

    const users = await userModel.find({}, { createdAt: 1 });

    const uniqueMonths = new Set();

    users.forEach((user) => {
      if (user.createdAt) {
        const date = new Date(user.createdAt);
        const month = `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
        uniqueMonths.add(month);
      }
    });

    res.status(200).json({
      message: "User summary fetched successfully",
      count,
      totalMonths: uniqueMonths.size
    });
  } catch (error) {
    console.error("Error fetching user summary:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

const getVendorSpaceSummary = async (req, res) => {
  try {
    // Filter only vendors with non-empty spaceid
    const vendors = await vendorModel.find(
      { spaceid: { $exists: true, $ne: "" } },
      { createdAt: 1 }
    );

    const count = vendors.length;

    const uniqueMonths = new Set();

    vendors.forEach((vendor) => {
      if (vendor.createdAt) {
        const date = new Date(vendor.createdAt);
        const month = `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
        uniqueMonths.add(month);
      }
    });

    return res.status(200).json({
      message: "Vendor space summary fetched successfully",
      count,
      totalMonths: uniqueMonths.size
    });
  } catch (err) {
    console.error("Error fetching vendor space summary:", err.message);
    return res.status(500).json({
      message: "Internal server error",
      error: err.message
    });
  }
};


const getKycSummary = async (req, res) => {
  try {
    const kycDetails = await KycDetails.find({}, { createdAt: 1 });

    if (!kycDetails || kycDetails.length === 0) {
      return res.status(404).json({ message: 'No KYC details found' });
    }

    const count = kycDetails.length;

    const uniqueMonths = new Set();

    kycDetails.forEach(detail => {
      if (detail.createdAt) {
        const date = new Date(detail.createdAt);
        const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        uniqueMonths.add(month);
      }
    });

    return res.status(200).json({
      message: 'KYC summary fetched successfully',
      count,
      totalMonths: uniqueMonths.size
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
};



const getTransactionSummary = async (req, res) => {
  try {
    const completedBookings = await Booking.find({ status: "COMPLETED" });

    if (!completedBookings || completedBookings.length === 0) {
      return res.status(404).json({ success: false, message: "No completed bookings found" });
    }

    const uniqueMonths = new Set();
    let totalAmount = 0;
    let totalAmountThisMonth = 0;

    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11
    const currentYear = now.getFullYear();

    completedBookings.forEach((booking) => {
      const amount = parseFloat(booking.amount || 0);
      totalAmount += amount;

      if (booking.createdAt) {
        const bookingDate = new Date(booking.createdAt);
        const monthKey = `${bookingDate.getFullYear()}-${(bookingDate.getMonth() + 1).toString().padStart(2, "0")}`;
        uniqueMonths.add(monthKey);

        // Check if this booking is from current month
        if (
          bookingDate.getMonth() === currentMonth &&
          bookingDate.getFullYear() === currentYear
        ) {
          totalAmountThisMonth += amount;
        }
      }
    });

    res.status(200).json({
      success: true,
      message: "Booking summary fetched successfully",
      totalCompletedBookings: completedBookings.length,
      totalMonths: uniqueMonths.size,
      totalAmount: totalAmount.toFixed(2),
      totalAmountThisMonth: totalAmountThisMonth.toFixed(2)
    });
  } catch (error) {
    console.error("Error fetching booking summary:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};


const getVendorsByTransactionStatus = async (req, res) => {
  try {
    const vendors = await vendorModel.find({});

    const active = [];
    const zero = [];

    for (const vendor of vendors) {
      const completedCount = await Booking.countDocuments({
        vendorId: vendor._id,
        status: "COMPLETED"
      });

      const vendorData = {
        vendorId: vendor._id,
        vendorName: vendor.vendorName,
        bookingCount: completedCount
      };

      if (completedCount > 0) {
        active.push(vendorData);
      } else {
        zero.push(vendorData);
      }
    }

    res.status(200).json({
      success: true,
      activeTransactions: active,
      zeroTransactions: zero,
      activeCount: active.length,
      zeroCount: zero.length
    });

  } catch (error) {
    console.error("Error fetching transaction status list:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


const getVendorStatusStats = async (req, res) => {
  try {
    const approvedData = await vendorModel.aggregate([
      { $match: { status: "approved" } },
      {
        $group: {
          _id: null,
          totalApproved: { $sum: 1 },
          latestApprovedMonth: { $max: "$createdAt" }
        }
      }
    ]);

    const pendingData = await vendorModel.aggregate([
      { $match: { status: "pending" } },
      {
        $group: {
          _id: null,
          totalPending: { $sum: 1 },
          latestPendingMonth: { $max: "$createdAt" }
        }
      }
    ]);

    const approved = approvedData[0] || { totalApproved: 0, latestApprovedMonth: null };
    const pending = pendingData[0] || { totalPending: 0, latestPendingMonth: null };

    return res.status(200).json({
      message: "Vendor summary fetched successfully",
      data: {
        totalApproved: approved.totalApproved,
        latestApprovedMonth: approved.latestApprovedMonth
          ? new Date(approved.latestApprovedMonth).toLocaleString("default", { month: "long", year: "numeric" })
          : null,
        totalPending: pending.totalPending,
        latestPendingMonth: pending.latestPendingMonth
          ? new Date(pending.latestPendingMonth).toLocaleString("default", { month: "long", year: "numeric" })
          : null
      }
    });

  } catch (error) {
    console.error("Error fetching vendor summary:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

const getSpacesStatus = async (req, res) => {
  try {
    // Approved vendors with spaceid
    const approvedData = await vendorModel.aggregate([
      { $match: { spaceid: { $exists: true, $ne: "" }, status: "approved" } },
      {
        $group: {
          _id: null,
          totalApproved: { $sum: 1 },
          latestApprovedMonth: { $max: "$createdAt" }
        }
      }
    ]);

    // Pending vendors with spaceid
    const pendingData = await vendorModel.aggregate([
      { $match: { spaceid: { $exists: true, $ne: "" }, status: "pending" } },
      {
        $group: {
          _id: null,
          totalPending: { $sum: 1 },
          latestPendingMonth: { $max: "$createdAt" }
        }
      }
    ]);

    const approved = approvedData[0] || { totalApproved: 0, latestApprovedMonth: null };
    const pending = pendingData[0] || { totalPending: 0, latestPendingMonth: null };

    return res.status(200).json({
      message: "Vendor summary fetched successfully",
      data: {
        totalApproved: approved.totalApproved,
        latestApprovedMonth: approved.latestApprovedMonth
          ? new Date(approved.latestApprovedMonth).toLocaleString("default", { month: "long", year: "numeric" })
          : null,
        totalPending: pending.totalPending,
        latestPendingMonth: pending.latestPendingMonth
          ? new Date(pending.latestPendingMonth).toLocaleString("default", { month: "long", year: "numeric" })
          : null
      }
    });

  } catch (err) {
    console.error("Error fetching vendor summary:", err.message);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

const updateVendorDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminName, contacts, address } = req.body;

    // Find and update the vendor in one operation
    const updatedVendor = await adminModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(adminName && { adminName }),
          ...(address && { address }),
          ...(contacts && { contacts: typeof contacts === 'string' ? JSON.parse(contacts) : contacts })
        }
      },
      { new: true }
    );

    if (!updatedVendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(200).json({ 
      message: "Vendor updated successfully",
      data: {
        adminName: updatedVendor.adminName,
        contacts: updatedVendor.contacts,
        address: updatedVendor.address
      }
    });
  } catch (error) {
    console.error("Error updating vendor:", error);
    res.status(500).json({ 
      message: "Error updating vendor", 
      error: error.message 
    });
  }
};

const getVendorById = async (req, res) => {
  try {
    const vendor = await adminModel.findById(req.params.id)
      .select('-password -__v'); // Exclude sensitive fields
    
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    res.json(vendor);
  } catch (error) {
    console.error('Error fetching vendor:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const UpdateVendorDataByAdmin = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { vendorName, contacts, latitude, longitude, address, landmark, parkingEntries, platformfee  } = req.body;

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
      platformfee: platformfee || existingVendor.platformfee,
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

const getVendorAndUserData = async (req, res) => {
  try {
    const vendorData = await vendorModel.find({}, { vendorName: 1 });
    const userData = await userModel.find({}, { userName: 1 });

    res.status(200).json({
      success: true,
      vendors: vendorData,
      users: userData,
    });
  } catch (err) {
    console.log("error in getting the user and vendor details", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor and user details",
      error: err.message,
    });
  }
};

const getPlanList = async (req, res) => {
  try {
    const { planId } = req.params;

    const planData = await transactionSchema.find({ planId });
    const planName = await planSchema.findById(planId,{planName:1});
    const vendorData = await vendorModel.find({}, { _id: 1, vendorName: 1 });

    const vendorMap = vendorData.reduce((acc, vendor) => {
      acc[vendor._id.toString()] = vendor.vendorName;
      return acc;
    }, {});

    const enrichedPlans = planData.map((plan) => ({
      ...plan._doc,
      vendorName: vendorMap[plan.vendorId] || "Unknown Vendor",
    }));

    res.status(200).json({
      success: true,
      plans: enrichedPlans,
      planName:planName.planName
    });
  } catch (err) {
    console.error("Error fetching plan list:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};



const getMySubscriberListList = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const transactionData = await transactionSchema.find({ vendorId });
    const planData = await planSchema.find({}, { _id: 1, planName: 1 });
    const vendorData = await vendorModel.find({}, { _id: 1, vendorName: 1 });

    const planMap = planData.reduce((acc, plan) => {
      acc[plan._id.toString()] = plan.planName;
      return acc;
    }, {});

    const vendorMap = vendorData.reduce((acc, vendor) => {
      acc[vendor._id.toString()] = vendor.vendorName;
      return acc;
    }, {});

    const enrichedTransactions = transactionData.map((txn) => ({
      ...txn._doc,
      planName: planMap[txn.planId] || "Unknown Plan",
      vendorName: vendorMap[txn.vendorId] || "Unknown Vendor",
    }));

    console.log("enrichedTransactions",enrichedTransactions)

    res.status(200).json({
      success: true,
      subscribers: enrichedTransactions,
    });
  } catch (err) {
    console.error("Error fetching subscriber list:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};













// ------------------------------------------------------------------
// Manual Notification API - Send notifications from web interface
// ------------------------------------------------------------------
const sendManualNotification = async (req, res) => {
  try {
    const { title, subtitle, image, target, filters } = req.body;

    // Validate required fields
    if (!title || !subtitle || !target) {
      return res.status(400).json({
        success: false,
        message: "Title, subtitle (message), and target (vendor/customer) are required",
      });
    }

    // Validate target
    if (target !== "vendor" && target !== "customer") {
      return res.status(400).json({
        success: false,
        message: "Target must be 'vendor' or 'customer'",
      });
    }

    console.log(`[${new Date().toISOString()}] Manual notification request:`, {
      title,
      subtitle,
      image: image ? "Provided" : "Not provided",
      target,
      filters,
    });

    let recipients = [];
    let notificationData = [];

    // Build query based on target and filters
    if (target === "customer") {
      // Find customers/users based on filters
      let userQuery = {};
      
      if (filters) {
        if (filters.userId) userQuery.uuid = filters.userId;
        if (filters.userMobile) userQuery.userMobile = filters.userMobile;
        if (filters.status) userQuery.status = filters.status;
        if (filters.userIds && Array.isArray(filters.userIds)) {
          userQuery.uuid = { $in: filters.userIds };
        }
      }

      const users = await userModel.find(userQuery, { uuid: 1, userMobile: 1, userfcmTokens: 1 });
      recipients = users.map(user => ({
        id: user.uuid || user._id,
        type: "customer",
        fcmTokens: user.userfcmTokens || [],
        mobile: user.userMobile,
      }));

      // Prepare notification data for each user
      const nowIst = DateTime.now().setZone("Asia/Kolkata");
      recipients.forEach((recipient) => {
        notificationData.push({
          userId: String(recipient.id),
          vendorId: filters?.vendorId || "",
          title,
          message: subtitle,
          status: "info",
          read: false,
          notificationdtime: nowIst.toFormat("dd-MM-yyyy HH:mm"),
          sts: "manual_notification",
          bookingtype: "manual",
        });
      });

    } else if (target === "vendor") {
      // Find vendors based on filters
      let vendorQuery = {};
      
      if (filters) {
        if (filters.vendorId) vendorQuery._id = filters.vendorId;
        if (filters.vendorIds && Array.isArray(filters.vendorIds)) {
          vendorQuery._id = { $in: filters.vendorIds };
        }
        if (filters.status) vendorQuery.status = filters.status;
        if (filters.subscription) vendorQuery.subscription = filters.subscription;
        if (filters.vendorName) vendorQuery.vendorName = { $regex: filters.vendorName, $options: "i" };
      }

      const vendors = await vendorModel.find(vendorQuery, { _id: 1, vendorName: 1, fcmTokens: 1 });
      recipients = vendors.map(vendor => ({
        id: vendor._id,
        type: "vendor",
        fcmTokens: vendor.fcmTokens || [],
        vendorName: vendor.vendorName,
      }));

      // Prepare notification data for each vendor
      const nowIst = DateTime.now().setZone("Asia/Kolkata");
      recipients.forEach((recipient) => {
        notificationData.push({
          vendorId: String(recipient.id),
          vendorname: recipient.vendorName || "",
          title,
          message: subtitle,
          status: "info",
          read: false,
          notificationdtime: nowIst.toFormat("dd-MM-yyyy HH:mm"),
          sts: "manual_notification",
          bookingtype: "manual",
        });
      });
    }

    if (recipients.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No ${target}s found matching the provided filters`,
      });
    }

    console.log(`[${new Date().toISOString()}] Found ${recipients.length} ${target}(s) to notify`);

    // Save notifications to database and send FCM
    let savedCount = 0;
    let fcmSentCount = 0;
    let fcmFailedCount = 0;
    const invalidTokens = [];

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const notifData = notificationData[i];

      try {
        // Save notification to database
        const notification = new Notification({
          ...notifData,
          ...(image && { image }), // Add image if provided
        });
        await notification.save();
        savedCount++;
        console.log(`[${new Date().toISOString()}] ✅ Notification saved for ${target}: ${recipient.id}`);
      } catch (notifErr) {
        console.error(`[${new Date().toISOString()}] ❌ Failed to save notification for ${target}: ${recipient.id}`, notifErr);
      }

      // Send FCM notification
      if (recipient.fcmTokens && recipient.fcmTokens.length > 0) {
        const fcmPayload = {
          notification: {
            title,
            body: subtitle,
            ...(image && { image }),
          },
          android: {
            notification: {
              sound: "default",
              priority: "high",
              ...(image && { image }),
            },
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
              },
            },
          },
          data: {
            type: "manual_notification",
            target: target,
            notificationId: notifData.userId || notifData.vendorId || "",
          },
        };

        for (const token of recipient.fcmTokens) {
          try {
            await admin.messaging().send({ ...fcmPayload, token });
            fcmSentCount++;
            console.log(`[${new Date().toISOString()}] ✅ FCM sent to ${target}: ${recipient.id}`);
          } catch (fcmErr) {
            fcmFailedCount++;
            if (fcmErr?.errorInfo?.code === "messaging/registration-token-not-registered") {
              invalidTokens.push({ token, recipientId: recipient.id });
            }
            console.error(`[${new Date().toISOString()}] ❌ FCM error for ${target}: ${recipient.id}`, fcmErr?.errorInfo?.code || fcmErr?.message);
          }
        }

        // Clean up invalid tokens
        if (invalidTokens.length > 0) {
          const recipientInvalidTokens = invalidTokens
            .filter(t => t.recipientId === recipient.id)
            .map(t => t.token);

          if (recipientInvalidTokens.length > 0) {
            if (target === "customer") {
              await userModel.updateOne(
                { uuid: recipient.id },
                { $pull: { userfcmTokens: { $in: recipientInvalidTokens } } }
              );
            } else {
              await vendorModel.updateOne(
                { _id: recipient.id },
                { $pull: { fcmTokens: { $in: recipientInvalidTokens } } }
              );
            }
          }
        }
      } else {
        console.log(`[${new Date().toISOString()}] ⚠️ No FCM tokens found for ${target}: ${recipient.id}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Manual notification sent successfully to ${recipients.length} ${target}(s)`,
      data: {
        totalRecipients: recipients.length,
        notificationsSaved: savedCount,
        fcmSent: fcmSentCount,
        fcmFailed: fcmFailedCount,
        invalidTokensRemoved: invalidTokens.length,
      },
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in manual notification:`, error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  getMySubscriberListList,
  getPlanList,
  getVendorAndUserData,
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
    deleteVendor,
    deleteUserById,
    getAllSpaces,
    fetchsinglespacedata,
    getAllUsers,
    fetchspacedatabyuser,
    deleteKycData,
    getAllVendorsTransaction,
    closeChat,
    getVendorCount,
    getBookingSummary,
    getUserSummary,
    getVendorSpaceSummary,
    getKycSummary,
    getTransactionSummary,
    getVendorsByTransactionStatus,
    getVendorStatusStats,
    getSpacesStatus,
    updateVendorDetails,
    getVendorById,
    UpdateVendorDataByAdmin,
    sendManualNotification,
};