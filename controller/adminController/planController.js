const planModel = require("../../models/planSchema");
const { uploadImage } = require("../../config/cloudinary");

const addNewPlan = async (req, res) => {
    try {
      const { planName, role, validity, amount, features, status } = req.body;
  
      // Check if image is provided
      if (!req.file) {
        return res.status(400).json({ message: "No image provided" });
      }
  
      const imageFile = req.file;
  
      // Upload image to cloudinary
      const imageUrl = await uploadImage(imageFile.buffer, "plans");
  
      // Parse features (comma-separated string or array)
      const parsedFeatures = Array.isArray(features)
        ? features
        : features.split(",").map((feature) => feature.trim());
  
      // Create new plan
      const newPlan = new planModel({
        planName,
        role,
        validity: Number(validity),
        amount: Number(amount),
        features: parsedFeatures,
        status: status || "disable",
        image: imageUrl,
      });
  
      // Save plan
      const savedPlan = await newPlan.save();
  
      res.status(201).json({
        message: "Plan added successfully",
        plan: savedPlan,
      });
    } catch (err) {
      console.error("Error in adding plan", err);
      res.status(500).json({
        message: "Error in adding plan",
        error: err.message,
      });
    }
  };
  

  const getAllPlans = async (req, res) => {
    try {
      const { status } = req.query;
  
      // Build query object
      const query = {};
      if (status) query.status = status;
  
      // Fetch all plans
      const plans = await planModel.find(query).sort({ createdAt: -1 });
  
      res.status(200).json({
        message: "Plans retrieved successfully",
        plans,
      });
    } catch (err) {
      console.error("Error in retrieving plans", err);
      res.status(500).json({
        message: "Error in retrieving plans",
        error: err.message,
      });
    }
  };
  

const getPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await planModel.findById(id);

    if (!plan) {
      return res.status(404).json({
        message: "Plan not found"
      });
    }

    res.status(200).json({
      message: "Plan retrieved successfully",
      plan: plan
    });
  } catch (err) {
    console.error("Error in retrieving plan", err);
    res.status(500).json({
      message: "Error in retrieving plan",
      error: err.message,
    });
  }
};

const updatePlan = async (req, res) => {
    try {
      const { id } = req.params;
      const { planName, role, validity, amount, features, status } = req.body;
  
      // Prepare update object
      const updateData = {
        planName,
        role,
        validity: Number(validity),
        amount: Number(amount),
        status: status || "disable",
      };
  
      // Parse features (assuming it's a comma-separated string or array)
      if (features) {
        updateData.features = Array.isArray(features)
          ? features
          : features.split(",").map((feature) => feature.trim());
      }
  
      // Check if new image is uploaded
      if (req.file) {
        const imageFile = req.file; // `req.file` contains uploaded file
        updateData.image = await uploadImage(imageFile.buffer, "plans");
      }
  
      // Update plan
      const updatedPlan = await planModel.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });
  
      if (!updatedPlan) {
        return res.status(404).json({
          message: "Plan not found",
        });
      }
  
      res.status(200).json({
        message: "Plan updated successfully",
        plan: updatedPlan,
      });
    } catch (err) {
      console.error("Error in updating plan", err);
      res.status(500).json({
        message: "Error in updating plan",
        error: err.message,
      });
    }
  };
  

const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedPlan = await planModel.findByIdAndDelete(id);

    if (!deletedPlan) {
      return res.status(404).json({
        message: "Plan not found"
      });
    }

    res.status(200).json({
      message: "Plan deleted successfully",
      plan: deletedPlan
    });
  } catch (err) {
    console.error("Error in deleting plan", err);
    res.status(500).json({
      message: "Error in deleting plan",
      error: err.message,
    });
  }
};

module.exports = {
  addNewPlan,
  getAllPlans,
  getPlanById,
  updatePlan,
  deletePlan
};