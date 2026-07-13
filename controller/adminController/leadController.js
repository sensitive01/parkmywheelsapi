const User = require("../../models/userModel");
const crypto = require("crypto");

// Create Lead
exports.createLead = async (req, res) => {
  try {
    const { userName, userMobile, userEmail, userPassword, leadStatus, status } = req.body;

    if (!userName || !userMobile || !userPassword) {
      return res.status(400).json({ success: false, message: "Name, Mobile, and Password are required" });
    }

    const existingUser = await User.findOne({ userMobile });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Mobile number already exists" });
    }

    const newLead = new User({
      uuid: crypto.randomUUID(),
      userName,
      userMobile,
      userEmail,
      userPassword,
      role: "lead",
      leadStatus: leadStatus || "New",
      followUps: [],
      status: status || "Active"
    });

    await newLead.save();

    res.status(201).json({ success: true, message: "Lead created successfully", data: newLead });
  } catch (error) {
    console.error("Error creating lead:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Get all Leads
exports.getLeads = async (req, res) => {
  try {
    const leads = await User.find({ role: "lead" }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: leads.length, data: leads });
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Update Lead (Includes adding followups)
exports.updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { userName, userMobile, userEmail, userPassword, leadStatus, status, newFollowUp } = req.body;

    const lead = await User.findOne({ _id: id, role: "lead" });
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    // Check mobile conflict if changed
    if (userMobile && userMobile !== lead.userMobile) {
      const existingUser = await User.findOne({ userMobile });
      if (existingUser) {
        return res.status(400).json({ success: false, message: "Mobile number already in use" });
      }
      lead.userMobile = userMobile;
    }

    if (userName) lead.userName = userName;
    if (userEmail) lead.userEmail = userEmail;
    if (userPassword && userPassword.trim() !== '') lead.userPassword = userPassword;
    if (leadStatus) lead.leadStatus = leadStatus;
    if (status) lead.status = status;

    // Add new follow up if provided
    if (newFollowUp && newFollowUp.notes) {
      lead.followUps.push({
        date: newFollowUp.date ? new Date(newFollowUp.date) : new Date(),
        notes: newFollowUp.notes
      });
    }

    await lead.save();

    res.status(200).json({ success: true, message: "Lead updated successfully", data: lead });
  } catch (error) {
    console.error("Error updating lead:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Delete Lead
exports.deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    
    const lead = await User.findOneAndDelete({ _id: id, role: "lead" });
    
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    res.status(200).json({ success: true, message: "Lead deleted successfully" });
  } catch (error) {
    console.error("Error deleting lead:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
