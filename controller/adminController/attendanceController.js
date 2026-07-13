const Attendance = require("../../models/attendanceSchema");

// Create Attendance Record
exports.createAttendance = async (req, res) => {
  try {
    const { employeeId, date, status, remarks } = req.body;

    if (!employeeId || !date || !status) {
      return res.status(400).json({ success: false, message: "Employee, Date, and Status are required" });
    }

    const newAttendance = new Attendance({
      employeeId,
      date: new Date(date),
      status,
      remarks: remarks || ""
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
    const attendanceRecords = await Attendance.find()
      .populate("employeeId", "userName userEmail userMobile designation")
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
    const { status, remarks } = req.body;

    const updatedAttendance = await Attendance.findByIdAndUpdate(
      id,
      { status, remarks },
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
