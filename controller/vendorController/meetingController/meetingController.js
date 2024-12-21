const meetingModel = require("../../../models/meetingSchema");

// Create a new meeting
const create = async (req, res) => {
  try {
      const {
          name,
          department,
          email,
          mobile,
          businessURL,
          callbackTime,
          vendorId,
      } = req.body;

      // Validation for missing fields
      if (!name || !department || !email || !mobile || !businessURL || !callbackTime || !vendorId) {
          return res.status(400).json({ message: "All fields are required" });
      }

      // Create the meeting
      const newMeeting = new meetingModel({
          name,
          department,
          email,
          mobile,
          businessURL,
          callbackTime,
          vendorId,
      });

      // Save the meeting instance
      await newMeeting.save();

      res.status(200).json({
          message: "Meeting created successfully",
          meeting: newMeeting,
      });
  } catch (error) {
      res.status(500).json({ message: "Error creating meeting", error: error.stack });
  }
};

// Get meetings by vendor
const getMeetingsByVendor = async (req, res) => {
  try {
    const { id } = req.params;  // Extract the vendorId from URL parameters

    // Validate vendorId
    if (!id) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    // Find meetings where vendorId matches the one from the URL
    const meetings = await meetingModel.find({ vendorId: id });

    if (!meetings || meetings.length === 0) {
      return res.status(404).json({ message: "No meetings found for this vendor" });
    }

    // Return the meetings if found
    res.status(200).json({ meetings });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving meetings", error: error.stack });
  }
};

module.exports = { create, getMeetingsByVendor };
