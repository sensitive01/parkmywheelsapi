const ValetDriver = require("../../models/valetDriverSchema");
const { uploadImage } = require("../../config/cloudinary");

// Add a new valet driver
exports.createValetDriver = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, licenseNumber, status } = req.body;
    
    // We assume vendorId is passed in the request or injected by middleware
    // Here we'll take it from req.body or req.vendorId
    const vendorId = req.vendor?.id || req.body.vendorId;

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "Vendor ID is required" });
    }

    let uploadedImageUrl = "";
    if (req.file) {
      uploadedImageUrl = await uploadImage(req.file.buffer, "valet_proofs");
    }

    const newDriver = new ValetDriver({
      vendorId,
      firstName,
      lastName,
      email,
      phone,
      licenseNumber,
      status: status || 'active',
      proofUrl: uploadedImageUrl
    });

    await newDriver.save();

    res.status(201).json({ success: true, message: "Valet driver created successfully", data: newDriver });
  } catch (error) {
    console.error("Error creating valet driver:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Get all valet drivers for a specific vendor
exports.getValetDriversByVendor = async (req, res) => {
  try {
    const vendorId = req.vendor?.id || req.params.vendorId;

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "Vendor ID is required" });
    }

    const drivers = await ValetDriver.find({ vendorId }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: drivers.length, data: drivers });
  } catch (error) {
    console.error("Error fetching valet drivers:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Update a valet driver
exports.updateValetDriver = async (req, res) => {
  try {
    const { driverId } = req.params;
    const vendorId = req.vendor?.id || req.body.vendorId;
    
    const driver = await ValetDriver.findById(driverId);
    
    if (!driver) {
      return res.status(404).json({ success: false, message: "Valet driver not found" });
    }

    // Ensure the driver belongs to the vendor (if vendorId is provided)
    if (vendorId && driver.vendorId.toString() !== vendorId) {
        return res.status(403).json({ success: false, message: "Unauthorized to update this driver" });
    }

    const updateData = { ...req.body };
    if (req.file) {
      const uploadedImageUrl = await uploadImage(req.file.buffer, "valet_proofs");
      updateData.proofUrl = uploadedImageUrl;
    }

    const updatedDriver = await ValetDriver.findByIdAndUpdate(driverId, updateData, { new: true, runValidators: true });

    res.status(200).json({ success: true, message: "Valet driver updated successfully", data: updatedDriver });
  } catch (error) {
    console.error("Error updating valet driver:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Delete a valet driver
exports.deleteValetDriver = async (req, res) => {
  try {
    const { driverId } = req.params;
    const vendorId = req.vendor?.id || req.body.vendorId;

    const driver = await ValetDriver.findById(driverId);
    
    if (!driver) {
      return res.status(404).json({ success: false, message: "Valet driver not found" });
    }

    // Ensure the driver belongs to the vendor (if vendorId is provided)
    if (vendorId && driver.vendorId.toString() !== vendorId) {
        return res.status(403).json({ success: false, message: "Unauthorized to delete this driver" });
    }

    await ValetDriver.findByIdAndDelete(driverId);

    res.status(200).json({ success: true, message: "Valet driver deleted successfully" });
  } catch (error) {
    console.error("Error deleting valet driver:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
