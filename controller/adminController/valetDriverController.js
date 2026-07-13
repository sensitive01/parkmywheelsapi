const ValetDriver = require("../../models/valetDriverSchema");
const { uploadImage } = require("../../config/cloudinary");

// Get all valet drivers, optionally filtered by vendorId
exports.getAllValetDrivers = async (req, res) => {
  try {
    const { vendorId } = req.query;
    
    let query = {};
    if (vendorId) {
      query.vendorId = vendorId;
    }

    const drivers = await ValetDriver.find(query)
      .populate("vendorId", "vendorName companyName email phone")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: drivers.length, data: drivers });
  } catch (error) {
    console.error("Error fetching all valet drivers:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Update a valet driver
exports.updateValetDriver = async (req, res) => {
  try {
    const { driverId } = req.params;
    
    const updateData = { ...req.body };
    if (req.file) {
      const uploadedImageUrl = await uploadImage(req.file.buffer, "valet_proofs");
      updateData.proofUrl = uploadedImageUrl;
    }

    const updatedDriver = await ValetDriver.findByIdAndUpdate(driverId, updateData, { new: true, runValidators: true });

    if (!updatedDriver) {
      return res.status(404).json({ success: false, message: "Valet driver not found" });
    }

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

    const deletedDriver = await ValetDriver.findByIdAndDelete(driverId);
    
    if (!deletedDriver) {
      return res.status(404).json({ success: false, message: "Valet driver not found" });
    }

    res.status(200).json({ success: true, message: "Valet driver deleted successfully" });
  } catch (error) {
    console.error("Error deleting valet driver:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
