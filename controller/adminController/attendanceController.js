const Attendance = require("../../models/attendanceSchema");
const { uploadImage } = require("../../config/cloudinary");

// Create Attendance Record
exports.createAttendance = async (req, res) => {
  try {
    const { employeeId, date, status, remarks } = req.body;

    if (!employeeId || !date || !status) {
      return res.status(400).json({ success: false, message: "Employee, Date, and Status are required" });
    }

    let photoUrl = "";
    
    // Check if attendance already exists for today
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAttendance = await Attendance.findOne({
      employeeId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (existingAttendance) {
      return res.status(400).json({ success: false, message: "Attendance already marked for today" });
    }

    if (req.file) {
      try {
        photoUrl = await uploadImage(req.file.buffer, "attendance");
      } catch (imageError) {
        console.error("Image upload failed:", imageError);
        return res.status(500).json({ success: false, message: "Image upload failed" });
      }
    }

    const newAttendance = new Attendance({
      employeeId,
      date: new Date(date),
      status,
      remarks: remarks || "",
      photoUrl,
      loginTime: new Date()
    });

    await newAttendance.save();
    res.status(201).json({ success: true, message: "Attendance created successfully", data: newAttendance });
  } catch (error) {
    console.error("Error creating attendance:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Get All Attendance Records
exports.getAttendance = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, search } = req.query;
    let filter = {};
    if (employeeId) filter.employeeId = employeeId;

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (search) {
      const Employee = require("../../models/employeeModel");
      const users = await Employee.find({
        $or: [
          { userName: { $regex: search, $options: "i" } },
          { userMobile: { $regex: search, $options: "i" } }
        ]
      });
      let userIds = users.map(u => u._id);
      
      // If employeeId is already set (e.g. employee requesting their own), intersect the results
      if (employeeId) {
        // Only allow searching if the matched user is themselves
        userIds = userIds.filter(id => id.toString() === employeeId.toString());
        filter.employeeId = userIds.length > 0 ? employeeId : null; // If no match, force empty result
      } else {
        filter.employeeId = { $in: userIds };
      }
    }

    const attendanceRecords = await Attendance.find(filter)
      .populate("employeeId", "userName userEmail userMobile designation employeeId")
      .sort({ date: -1 });

    res.status(200).json({ success: true, count: attendanceRecords.length, data: attendanceRecords });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Update Attendance Record
exports.updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks, setLogout } = req.body;

    let updatePayload = {};
    if (status) updatePayload.status = status;
    if (remarks !== undefined) updatePayload.remarks = remarks;
    if (setLogout) updatePayload.logoutTime = new Date();

    const updatedAttendance = await Attendance.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    if (!updatedAttendance) {
      return res.status(404).json({ success: false, message: "Attendance record not found" });
    }

    res.status(200).json({ success: true, message: "Attendance updated successfully", data: updatedAttendance });
  } catch (error) {
    console.error("Error updating attendance:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Delete Attendance Record
exports.deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    
    const record = await Attendance.findByIdAndDelete(id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Attendance record not found" });
    }

    res.status(200).json({ success: true, message: "Attendance deleted successfully" });
  } catch (error) {
    console.error("Error deleting attendance:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
