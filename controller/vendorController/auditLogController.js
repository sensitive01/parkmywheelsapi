const ActivityLog = require("../../models/activityLogSchema");
const AuthLog = require("../../models/authLogSchema");

// GET /api/vendor/activity-logs/:vendorId
exports.getVendorActivityLogs = async (req, res) => {
  try {
    const vendorId = req.params.vendorId;
    if (!vendorId) return res.status(400).json({ success: false, message: "Vendor ID is required" });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const {
      action,
      resourceType,
      search,
      startDate,
      endDate
    } = req.query;

    // Must be scoped to this vendor
    let query = { actorId: vendorId };

    if (action && action !== 'ALL') query.action = action;
    if (resourceType && resourceType !== 'ALL') query.resourceType = resourceType;

    if (search) {
      query.$or = [
        { resourceId: { $regex: search, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await ActivityLog.countDocuments(query);

    res.status(200).json({
      success: true,
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Error fetching vendor activity logs:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// GET /api/vendor/auth-logs/:vendorId
exports.getVendorAuthLogs = async (req, res) => {
  try {
    const vendorId = req.params.vendorId;
    if (!vendorId) return res.status(400).json({ success: false, message: "Vendor ID is required" });

    const {
      page = 1,
      limit = 10,
      search = "",
      action,
      status,
      accessType,
      osType,
      deviceType,
      dateFrom,
      dateTo,
    } = req.query;

    // Must be scoped to this vendor
    const query = { userId: vendorId, userType: "VENDOR" };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (action) query.action = action;
    if (status) query.status = status;
    if (accessType) query.accessType = accessType;
    if (osType) query.osType = osType;
    if (deviceType) query.deviceType = deviceType;

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
    console.error("Error fetching vendor auth logs:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
