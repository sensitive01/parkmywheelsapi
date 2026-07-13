const Leave = require("../../models/leaveSchema");

// Create Leave Record
exports.createLeave = async (req, res) => {
  try {
    const { employeeId, fromDate, toDate, category, type, permissionType, permissionDate, startTime, endTime, reason, status } = req.body;

    if (!employeeId || !reason) {
      return res.status(400).json({ success: false, message: "Employee and Reason are required" });
    }
    
    if (category === "Leave" && (!fromDate || !toDate)) {
      return res.status(400).json({ success: false, message: "From Date and To Date are required for Leaves" });
    }
    
    if (category === "Permission" && (!permissionDate || !startTime || !endTime)) {
      return res.status(400).json({ success: false, message: "Date, Start Time, and End Time are required for Permissions" });
    }

    const newLeave = new Leave({
      employeeId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      category: category || "Leave",
      type: category === "Leave" ? (type || "Casual") : undefined,
      permissionType: category === "Permission" ? (permissionType || "Personal Work") : undefined,
      permissionDate: permissionDate ? new Date(permissionDate) : undefined,
      startTime,
      endTime,
      reason,
      status: status || "Pending"
    });

    await newLeave.save();
    res.status(201).json({ success: true, message: "Record created successfully", data: newLeave });
  } catch (error) {
    console.error("Error creating record:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Get All Leave Records
exports.getLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find()
      .populate("employeeId", "userName userEmail userMobile designation")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: leaves.length, data: leaves });
  } catch (error) {
    console.error("Error fetching records:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Update Leave Record
exports.updateLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { fromDate, toDate, category, type, permissionType, permissionDate, startTime, endTime, reason, status } = req.body;

    const updateData = {};
    if (fromDate) updateData.fromDate = new Date(fromDate);
    if (toDate) updateData.toDate = new Date(toDate);
    if (category) updateData.category = category;
    if (type) updateData.type = type;
    if (permissionType) updateData.permissionType = permissionType;
    if (permissionDate) updateData.permissionDate = new Date(permissionDate);
    if (startTime) updateData.startTime = startTime;
    if (endTime) updateData.endTime = endTime;
    if (reason) updateData.reason = reason;
    if (status) updateData.status = status;

    const updatedLeave = await Leave.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedLeave) {
      return res.status(404).json({ success: false, message: "Leave record not found" });
    }

    res.status(200).json({ success: true, message: "Leave updated successfully", data: updatedLeave });
  } catch (error) {
    console.error("Error updating leave:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Delete Leave Record
exports.deleteLeave = async (req, res) => {
  try {
    const { id } = req.params;
    
    const record = await Leave.findByIdAndDelete(id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Leave record not found" });
    }

    res.status(200).json({ success: true, message: "Leave deleted successfully" });
  } catch (error) {
    console.error("Error deleting leave:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
