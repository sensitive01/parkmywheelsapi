const Booking = require("../models/bookingSchema");
const User = require("../models/userModel");
const { DateTime } = require("luxon");

const getSubscriptionReport = async () => {
  try {
    console.log(`[${new Date().toISOString()}] Generating subscription report...`);

    // Find all subscription bookings
    const subscriptionBookings = await Booking.find({
      sts: { $regex: /^subscription$/i },
      subsctiptionenddate: { $exists: true, $ne: null, $ne: "" },
    });

    console.log(`📋 Found ${subscriptionBookings.length} subscription bookings`);

    const report = [];

    for (const booking of subscriptionBookings) {
      try {
        // Parse the end date
        const endDtIst = parseEndDateIst(booking.subsctiptionenddate);
        if (!endDtIst) {
          console.log(`❌ Failed to parse end date for ${booking.vehicleNumber} (${booking._id})`);
          continue;
        }

        // Calculate days left
        const nowIst = DateTime.now().setZone("Asia/Kolkata").startOf("day");
        const daysLeft = Math.ceil(endDtIst.diff(nowIst, 'days').days);

        // Get mobile number (enhanced detection)
        let mobileNumber = booking.mobileNumber;
        let userId = booking.userid;

        // If no direct mobile, try to find from user record
        if (!mobileNumber && userId) {
          let user = await User.findOne({ uuid: userId }, { userMobile: 1, userPhone: 1, phone: 1, mobile: 1 });
          if (!user) {
            user = await User.findOne({ _id: userId }, { userMobile: 1, userPhone: 1, phone: 1, mobile: 1 });
          }
          if (!user) {
            user = await User.findOne({ userid: userId }, { userMobile: 1, userPhone: 1, phone: 1, mobile: 1 });
          }

          if (user) {
            mobileNumber = user.userMobile || user.userPhone || user.phone || user.mobile;
          }
        }

        // Check alternative mobile fields in booking
        if (!mobileNumber) {
          const altFields = ['phoneNumber', 'phone', 'contactNumber', 'contact', 'mobile', 'userPhone', 'userMobile'];
          for (const field of altFields) {
            if (booking[field]) {
              mobileNumber = booking[field];
              break;
            }
          }
        }

        // Calculate parking date (start date)
        let parkingDate = booking.parkingDate || booking.bookingDate;
        if (booking.createdAt) {
          const createdDate = new Date(booking.createdAt);
          if (!parkingDate) {
            parkingDate = createdDate.toLocaleDateString('en-IN');
          }
        }

        const reportItem = {
          _id: booking._id,
          vehicleNumber: booking.vehicleNumber || 'No vehicle',
          parkingDate: parkingDate || 'Unknown',
          exitDate: booking.subsctiptionenddate,
          daysLeft: daysLeft,
          mobileNumber: mobileNumber || 'No mobile',
          status: booking.status,
          sts: booking.sts,
          personName: booking.personName || 'No name',
          vendorName: booking.vendorName || 'No vendor'
        };

        report.push(reportItem);

      } catch (error) {
        console.error(`❌ Error processing booking ${booking._id}:`, error.message);
      }
    }

    // Sort by days left (ascending - most urgent first)
    report.sort((a, b) => a.daysLeft - b.daysLeft);

    // Display the report
    console.log(`\n📊 === SUBSCRIPTION REPORT ===`);
    console.log(`🚗 VEHICLE    | 📅 START      | 📅 EXPIRES    | ⏰ DAYS | 📱 MOBILE        | 👤 NAME      | 🏢 VENDOR`);
    console.log(`-------------|---------------|---------------|---------|------------------|--------------|-----------`);

    report.forEach(item => {
      const vehicleNum = item.vehicleNumber.padEnd(12);
      const startDate = item.parkingDate.padEnd(13);
      const endDate = item.exitDate.padEnd(13);
      const days = item.daysLeft.toString().padStart(7);
      const mobile = item.mobileNumber ? item.mobileNumber.substring(0, 16).padEnd(16) : 'NO MOBILE'.padEnd(16);
      const name = item.personName.substring(0, 12).padEnd(12);
      const vendor = item.vendorName.substring(0, 10).padEnd(10);

      const statusIndicator = item.daysLeft <= 0 ? '❌' :
                             item.daysLeft <= 2 ? '🚨' :
                             item.daysLeft <= 5 ? '⚠️' : '✅';

      console.log(`${vehicleNum} | ${startDate} | ${endDate} | ${days} | ${mobile} | ${name} | ${vendor} ${statusIndicator}`);
    });

    // Summary
    const urgent = report.filter(item => item.daysLeft <= 2).length;
    const soon = report.filter(item => item.daysLeft > 2 && item.daysLeft <= 5).length;
    const normal = report.filter(item => item.daysLeft > 5).length;
    const noMobile = report.filter(item => !item.mobileNumber || item.mobileNumber === 'No mobile').length;

    console.log(`\n📋 === SUMMARY ===`);
    console.log(`🚨 Urgent (≤2 days): ${urgent}`);
    console.log(`⚠️  Soon (3-5 days): ${soon}`);
    console.log(`✅ Normal (>5 days): ${normal}`);
    console.log(`📱 No mobile: ${noMobile}`);
    console.log(`📊 Total subscriptions: ${report.length}`);
    console.log(`📋 === END REPORT ===\n`);

    return report;

  } catch (error) {
    console.error(`❌ Error generating subscription report:`, error);
    throw error;
  }
};

module.exports = {
  getSubscriptionReport
};
