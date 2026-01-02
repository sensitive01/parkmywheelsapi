const planModel = require("../../models/planSchema");
const { uploadImage } = require("../../config/cloudinary");
const Vendor = require("../../models/venderSchema");
const addNewPlan = async (req, res) => {
  try {
    const {
      planName,
      role,
      validity,
      vendorid,
      amount,
      features,
      status,
      subscriptionGivenTo,
    } = req.body;

    let subscriptionData = subscriptionGivenTo;

    if (typeof subscriptionData === "string") {
      try {
        subscriptionData = JSON.parse(subscriptionData);
      } catch (err) {
        subscriptionData = [];
      }
    }

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
      vendorid,
      validity: Number(validity),
      amount: Number(amount),
      features: parsedFeatures,
      status: status || "disable",
      image: imageUrl,
      subscriptionGivenTo:Array.isArray(subscriptionData) ? subscriptionData : [],
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

const getUserPlan = async (req, res) => {
  try {
    console.log("User Role:", req.user?.role);

    // Base filter for enabled user plans
    const baseQuery = { status: "enable", role: "user" };

    let plans = [];

    if (req.params.vendorid || req.query.vendorid) {
      const vendorid = req.params.vendorid || req.query.vendorid;

      console.log(
        "Fetching vendor-specific + global user plans for:",
        vendorid
      );

      // Get vendor details
      const vendor = await Vendor.findOne({ vendorId: vendorid });
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      // Apply trial filter
      let amountFilter = {};
      if (vendor.trial === "true") {
        amountFilter.amount = { $ne: 0 }; // exclude free plans
      }

      // Vendor-specific plans
      const vendorPlans = await planModel
        .find({ ...baseQuery, vendorid, ...amountFilter })
        .sort({ createdAt: -1 });

      // Global plans (no vendorid field or null)
      const globalPlans = await planModel
        .find({
          ...baseQuery,
          $or: [{ vendorid: { $exists: false } }, { vendorid: null }],
          ...amountFilter,
        })
        .sort({ createdAt: -1 });

      plans = [...vendorPlans, ...globalPlans];
    } else {
      // No vendorid provided → all user plans
      plans = await planModel.find(baseQuery).sort({ createdAt: -1 });
    }

    console.log("Retrieved Plans:", plans);

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

const getvendorplan = async (req, res) => {
  try {
    console.log("User Role:", req.user?.role);

    const baseQuery = { status: "enable", role: "vendor" };

    let plans = [];

    if (req.params.vendorid || req.query.vendorid) {
      const vendorid = req.params.vendorid || req.query.vendorid;

      console.log(
        "Fetching vendor-specific + global vendor plans for:",
        vendorid
      );

      // Get vendor details
      const vendor = await Vendor.findOne({ vendorId: vendorid });
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      // Build additional filter based on trial
      let amountFilter = {};
      if (vendor.trial === "true") {
        amountFilter.amount = { $ne: 0 }; // exclude free plans
      }

      // Vendor-specific vendor plans
      const vendorPlans = await planModel
        .find({ ...baseQuery, vendorid, ...amountFilter })
        .sort({ createdAt: -1 });

      // Global vendor plans (no vendorid field or null)
      const globalPlans = await planModel
        .find({
          ...baseQuery,
          $or: [{ vendorid: { $exists: false } }, { vendorid: null }],
          ...amountFilter,
        })
        .sort({ createdAt: -1 });

      // Merge results
      plans = [...vendorPlans, ...globalPlans];
    } else {
      // No vendorid provided → fetch all vendor plans
      plans = await planModel.find(baseQuery).sort({ createdAt: -1 });
    }

    console.log("Retrieved Plans:", plans);

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
        message: "Plan not found",
      });
    }

    res.status(200).json({
      message: "Plan retrieved successfully",
      plan: plan,
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
    const {
      planName,
      role,
      validity,
      amount,
      features,
      status,
      subscriptionGivenTo,
    } = req.body

    let subscriptionData = subscriptionGivenTo;

    if (typeof subscriptionData === "string") {
      try {
        subscriptionData = JSON.parse(subscriptionData);
      } catch (err) {
        subscriptionData = [];
      }
    }

    // Prepare update object
    const updateData = {
      planName,
      role,
      validity: Number(validity),
      amount: Number(amount),
      status: status || "disable",
      subscriptionGivenTo: Array.isArray(subscriptionData)
        ? subscriptionData
        : [],
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
        message: "Plan not found",
      });
    }

    res.status(200).json({
      message: "Plan deleted successfully",
      plan: deletedPlan,
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
  getUserPlan,
  getvendorplan,
  deletePlan,
};
