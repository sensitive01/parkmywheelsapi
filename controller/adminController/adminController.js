const bcrypt = require("bcrypt");
const adminModel = require("../../models/adminSchema");
const { uploadImage } = require("../../config/cloudinary");
const generateOTP = require("../../utils/generateOTP");
// const agenda = require("../../config/agenda");
const { v4: uuidv4 } = require('uuid');

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
            subscriptionleft: "0",
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
            subscriptionleft: "0",
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
            subscriptionleft = "30";
        }

        const vendor = await adminModel.findById(adminId);
        if (!vendor) {
            return res.status(404).json({ message: "Admin not found" });
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
};
