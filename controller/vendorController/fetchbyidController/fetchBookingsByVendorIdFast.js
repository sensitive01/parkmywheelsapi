const Booking = require("../../../models/bookingSchema");

const fetchBookingsByVendorIdFast = async (req, res) => {
  try {
    const { id } = req.params; 
    const { page, limit, search, statusFilter, bookingTypeFilter, countOnly, dashboardStats, isSubscriptionView } = req.query;

    const fields = {
      vendorId: 1, userid: 1, vendorName: 1, bookType: 1, sts: 1,
      bookingDate: 1, bookingTime: 1, parkingDate: 1, parkingTime: 1,
      exitvehicledate: 1, exitvehicletime: 1, parkedDate: 1, parkedTime: 1,
      amount: 1, totalamout: 1, payableamout: 1, status: 1,
      vehicleType: 1, vehicleNumber: 1, cancelledStatus: 1,
      personName: 1, mobileNumber: 1, invoiceid: 1, otp: 1,
      subsctiptiontype: 1, subsctiptionenddate: 1, invoice: 1,
      approvedDate: 1, approvedTime: 1, paymentMode: 1,
    };

    if (dashboardStats === 'true') {
      const matchQuery = { vendorId: id };

      const stats = await Booking.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              status: { $toLower: "$status" },
              isSubscription: {
                $cond: [
                  { $regexMatch: { input: { $ifNull: ["$sts", ""] }, regex: /^subscription$/i } },
                  true,
                  false
                ]
              }
            },
            count: { $sum: 1 },
            totalAmount: {
              $sum: {
                $convert: { input: "$amount", to: "double", onError: 0, onNull: 0 }
              }
            }
          }
        }
      ]);

      let counts = {
        pending: 0,
        approved: 0,
        cancelled: 0,
        parked: 0,
        completed: 0,
        subscriptions: 0
      };
      let totalAmount = 0;

      stats.forEach(stat => {
        if (stat._id.isSubscription) {
          counts.subscriptions += stat.count;
        } else if (stat._id.status) {
          counts[stat._id.status] = (counts[stat._id.status] || 0) + stat.count;
        }
        totalAmount += stat.totalAmount;
      });

      return res.status(200).json({
        message: "Dashboard stats fetched successfully",
        counts,
        totalAmount
      });
    }

    if (countOnly === 'true') {
      const matchQuery = { 
        vendorId: id
      };

      if (isSubscriptionView === 'true') {
        matchQuery.sts = { $regex: /^subscription$/i };
      } else {
        matchQuery.sts = { $not: { $regex: /^subscription$/i } };
        matchQuery.subsctiptiontype = { $nin: ['weekly', 'monthly', 'yearly', 'Weekly', 'Monthly', 'Yearly'] };
      }

      if (bookingTypeFilter === 'user') {
        matchQuery.userid = { $exists: true, $ne: id };
      } else if (bookingTypeFilter === 'vendor') {
        matchQuery.$or = [
          { userid: { $exists: false } },
          { userid: null },
          { userid: id }
        ];
      }

      const counts = await Booking.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: { $toLower: "$status" },
            count: { $sum: 1 }
          }
        }
      ]);

      const formattedCounts = counts.reduce((acc, curr) => {
        if (curr._id) {
          acc[curr._id] = curr.count;
        }
        return acc;
      }, {});

      return res.status(200).json({
        message: "Counts fetched successfully",
        counts: formattedCounts
      });
    }

    let query = { vendorId: id };

    // If pagination params are provided, apply filters and pagination
    if (page && limit) {
      // Support for filtering by bookingTypeFilter ('user' or 'vendor')
      if (bookingTypeFilter === 'user') {
        // User bookings: userid exists AND IS NOT same as vendorId
        query.userid = { $exists: true, $ne: id };
      } else if (bookingTypeFilter === 'vendor') {
        // Vendor bookings: userid missing OR userid IS same as vendorId
        query.$or = [
          { userid: { $exists: false } },
          { userid: null },
          { userid: id }
        ];
      }

      // Support for filtering by statusFilter
      if (statusFilter && statusFilter.toLowerCase() !== 'all') {
        query.status = { $regex: new RegExp(`^${statusFilter}$`, 'i') };
      }

      // Support for global search
      if (search) {
        const searchStr = search.replace(/[^a-zA-Z0-9 ]/g, "");
        if (searchStr) {
          const searchRegex = new RegExp(searchStr, 'i');
          const searchConditions = [
            { personName: searchRegex },
            { mobileNumber: searchRegex },
            { vehicleNumber: searchRegex },
            { bookingId: searchRegex },
            { vehicleType: searchRegex }
          ];
          
          if (query.$or) {
            query = {
              $and: [
                query,
                { $or: searchConditions }
              ]
            };
          } else {
            query.$or = searchConditions;
          }
        }
      }

      if (isSubscriptionView === 'true') {
        query.sts = { $regex: /^subscription$/i };
      } else {
        // Exclude subscriptions
        query.sts = { $not: { $regex: /^subscription$/i } };
        query.subsctiptiontype = { $nin: ['weekly', 'monthly', 'yearly', 'Weekly', 'Monthly', 'Yearly'] };
      }

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      const totalBookings = await Booking.countDocuments(query);
      
      const bookings = await Booking.find(query, fields)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      return res.status(200).json({
        message: "Bookings fetched successfully",
        totalBookings,
        totalPages: Math.ceil(totalBookings / limitNum),
        currentPage: pageNum,
        bookings,
      });
    }

    // Fallback if no pagination (backward compatibility for old endpoints)
    const bookings = await Booking.find({ vendorId: id }, fields).lean();

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ error: "No bookings found for this vendor" });
    }
    return res.status(200).json({
      message: "Bookings fetched successfully",
      totalBookings: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Error fetching bookings fast:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { fetchBookingsByVendorIdFast };
