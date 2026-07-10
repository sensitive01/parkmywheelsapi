const AuthLog = require("../../models/authLogSchema");

// GET /api/admin/auth-logs
const getAuthLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      action,
      status,
      userType,
      accessType,
      osType,
      deviceType,
      dateFrom,
      dateTo,
    } = req.query;

    const query = {};

    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Exact matches
    if (action) query.action = action;
    if (status) query.status = status;
    if (userType) query.userType = userType;
    if (accessType) query.accessType = accessType;
    if (osType) query.osType = osType;
    if (deviceType) query.deviceType = deviceType;

    // Date range
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const logs = await AuthLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await AuthLog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching auth logs:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/admin/auth-logs/:id
const getAuthLogById = async (req, res) => {
  try {
    const log = await AuthLog.findById(req.params.id).lean();
    if (!log) {
      return res.status(404).json({ success: false, message: "Log not found" });
    }
    res.status(200).json({ success: true, data: log });
  } catch (error) {
    console.error("Error fetching auth log by id:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE /api/admin/auth-logs/:id
const deleteAuthLog = async (req, res) => {
  try {
    const log = await AuthLog.findByIdAndDelete(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, message: "Log not found" });
    }
    res.status(200).json({ success: true, message: "Log deleted successfully" });
  } catch (error) {
    console.error("Error deleting auth log:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  getAuthLogs,
  getAuthLogById,
  deleteAuthLog,
};
