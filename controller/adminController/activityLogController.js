const ActivityLog = require("../../models/activityLogSchema");

// Get all activity logs with pagination and filtering
exports.getActivityLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const {
      actorType,
      action,
      resourceType,
      search,
      startDate,
      endDate
    } = req.query;

    let query = {};

    if (actorType && actorType !== 'ALL') query.actorType = actorType;
    if (action && action !== 'ALL') query.action = action;
    if (resourceType && resourceType !== 'ALL') query.resourceType = resourceType;

    if (search) {
      query.$or = [
        { actorId: { $regex: search, $options: "i" } },
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

    // Fetch vendor details for logs where actorType === 'VENDOR'
    const vendorIds = logs.filter(log => log.actorType === 'VENDOR').map(log => log.actorId);

    if (vendorIds.length > 0) {
      const Vendor = require("../../models/venderSchema");
      const vendors = await Vendor.find({ _id: { $in: vendorIds } }).select('vendorName');
      const vendorMap = {};
      vendors.forEach(v => { vendorMap[v._id.toString()] = v.vendorName; });

      logs.forEach(log => {
        if (log.actorType === 'VENDOR' && vendorMap[log.actorId]) {
          log.actorName = vendorMap[log.actorId];
        }
      });
    }

    const total = await ActivityLog.countDocuments(query);

    res.status(200).json({
      success: true,
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getActivityLogById = async (req, res) => {
  try {
    const log = await ActivityLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, message: "Log not found" });
    }
    res.status(200).json({ success: true, log });
  } catch (error) {
    console.error("Error fetching activity log:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.deleteActivityLog = async (req, res) => {
  try {
    const log = await ActivityLog.findByIdAndDelete(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, message: "Log not found" });
    }
    res.status(200).json({ success: true, message: "Log deleted successfully" });
  } catch (error) {
    console.error("Error deleting activity log:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
