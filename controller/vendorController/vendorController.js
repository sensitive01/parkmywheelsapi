const bcrypt = require("bcrypt");
const vendorModel = require("../../models/venderSchema");
const { uploadImage } = require("../../config/cloudinary");
const generateOTP = require("../../utils/generateOTP");

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
      },
    });
  } catch (err) {
    console.error("Error in vendor signup", err);
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
  updateParkingEntriesVendorData,
};
