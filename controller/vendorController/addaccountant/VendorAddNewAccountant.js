const Accountant = require("../../../models/accountantSchema");
const venderSchema = require("../../../models/venderSchema");
const vendorModel = venderSchema;
const bcrypt = require("bcrypt");
const axios = require("axios");
const qs = require("qs");
const generateOTP = require("../../../utils/generateOTP");
const mongoose = require("mongoose");
const Booking = require("../../../models/bookingSchema");

// Temporary model to store OTP verification sessions
const OtpVerification = mongoose.models.OtpVerification || mongoose.model("OtpVerification", new mongoose.Schema({
    mobile: { type: String, required: true, unique: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true }
}));

// ================= SEND OTP FOR ACCOUNTANT =================
exports.sendOtpForAccountant = async (req, res) => {
    try {
        const { mobile } = req.body;

        if (!mobile) {
            return res.status(400).json({ success: false, message: "Mobile number is required" });
        }

        // Clean and validate Indian mobile format
        let cleanedMobile = mobile.replace(/\D/g, '');
        if (cleanedMobile.startsWith("91") && cleanedMobile.length > 10) {
            cleanedMobile = cleanedMobile.slice(2);
        }

        if (!/^[6-9]\d{9}$/.test(cleanedMobile)) {
            return res.status(400).json({ success: false, message: "Invalid mobile number format" });
        }

        // Check if vendor exists with this mobile
        const existVendor = await venderSchema.findOne({ "contacts.mobile": cleanedMobile });
        if (existVendor) {
            return res.status(400).json({ success: false, message: "Mobile number is already registered as a vendor" });
        }

        // Check if accountant already exists
        const existingAccountant = await Accountant.findOne({ mobile: cleanedMobile });
        if (existingAccountant) {
            return res.status(400).json({ success: false, message: "Mobile number is already registered as an accountant" });
        }

        // Generate and save OTP
        const otp = generateOTP();
        await OtpVerification.findOneAndUpdate(
            { mobile: cleanedMobile },
            { otp, expiresAt: new Date(Date.now() + 5 * 60 * 1000) }, // 5 minutes expiration
            { upsert: true, new: true }
        );

        // Send SMS via VISPL Gateway API
        const rawMessage = `Hi, ${otp} is your One time verification code. Park Smart with ParkMyWheels.`;
        const smsParams = {
            username: process.env.VISPL_USERNAME,
            password: process.env.VISPL_PASSWORD,
            unicode: "false",
            from: process.env.VISPL_SENDER_ID,
            to: cleanedMobile,
            text: rawMessage,
            dltContentId: process.env.VISPL_TEMPLATE_ID,
        };

        console.log("🔐 Accountant OTP:", otp);

        const smsResponse = await axios.get("https://pgapi.vispl.in/fe/api/v1/send", {
            params: smsParams,
            paramsSerializer: params => qs.stringify(params, { encode: true }),
            headers: {
                'User-Agent': 'Mozilla/5.0 (Node.js)',
            },
        });

        const status = smsResponse.data.STATUS || smsResponse.data.status || smsResponse.data.statusCode;
        const isSuccess = status === "SUCCESS" || status === 200 || status === 2000;

        if (!isSuccess) {
            return res.status(500).json({
                success: false,
                message: "Failed to send OTP via SMS",
                visplResponse: smsResponse.data,
            });
        }

        return res.status(200).json({ success: true, message: "OTP sent successfully" });
    } catch (error) {
        console.error("❌ Error in sendOtpForAccountant:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ================= VERIFY OTP FOR ACCOUNTANT =================
exports.verifyOtpForAccountant = async (req, res) => {
    try {
        const { mobile, otp } = req.body;

        if (!mobile || !otp) {
            return res.status(400).json({ success: false, message: "Mobile number and OTP are required" });
        }

        let cleanedMobile = mobile.replace(/\D/g, '');
        if (cleanedMobile.startsWith("91") && cleanedMobile.length > 10) {
            cleanedMobile = cleanedMobile.slice(2);
        }

        const record = await OtpVerification.findOne({ mobile: cleanedMobile });
        if (!record || record.otp !== otp || new Date() > new Date(record.expiresAt)) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
        }

        res.status(200).json({ success: true, message: "OTP verified successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ================= ADD ACCOUNTANT =================
// ================= ADD ACCOUNTANT =================
exports.addAccountant = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { accountName, mobile, password, otp } = req.body;

        // Verify OTP again to ensure session authenticity
        let cleanedMobile = mobile.replace(/\D/g, '');
        if (cleanedMobile.startsWith("91") && cleanedMobile.length > 10) {
            cleanedMobile = cleanedMobile.slice(2);
        }

        const record = await OtpVerification.findOne({ mobile: cleanedMobile });
        if (!record || record.otp !== otp || new Date() > new Date(record.expiresAt)) {
            return res.status(400).json({ success: false, message: "OTP verification required" });
        }

        // Check vendor exists
        const existingVendor = await venderSchema.findById(vendorId);
        if (!existingVendor) {
            return res.status(404).json({
                success: false,
                message: "Vendor not found",
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Store vendorId reference inside the accountant object
        const accountant = await Accountant.create({
            vendorId,
            accountName,
            mobile: cleanedMobile,
            password: hashedPassword,
        });

        existingVendor.accountant.push(accountant._id.toString());
        await existingVendor.save();

        // Delete OTP record after successful creation
        await OtpVerification.deleteOne({ mobile: cleanedMobile });

        res.status(201).json({
            success: true,
            message: "Accountant added successfully",
            data: accountant,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// ================= EDIT ACCOUNTANT =================
exports.editAccountant = async (req, res) => {
    try {
        const { id } = req.params;

        const updatedAccountant = await Accountant.findByIdAndUpdate(
            id,
            req.body,
            { new: true }
        );

        if (!updatedAccountant) {
            return res.status(404).json({
                success: false,
                message: "Accountant not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Accountant updated successfully",
            data: updatedAccountant,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ================= DELETE ACCOUNTANT =================
exports.deleteAccountant = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedAccountant = await Accountant.findByIdAndDelete(id);

        if (!deletedAccountant) {
            return res.status(404).json({
                success: false,
                message: "Accountant not found",
            });
        }

        await venderSchema.updateMany(
            { accountant: id },
            { $pull: { accountant: id } }
        );

        res.status(200).json({
            success: true,
            message: "Accountant deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ================= CHANGE PASSWORD =================
exports.changePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { oldPassword, newPassword } = req.body;

        const accountant = await Accountant.findById(id);

        if (!accountant) {
            return res.status(404).json({
                success: false,
                message: "Accountant not found",
            });
        }

        // Compare old password
        const isMatch = await bcrypt.compare(
            oldPassword,
            accountant.password
        );

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Old password is incorrect",
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        accountant.password = hashedPassword;

        await accountant.save();

        res.status(200).json({
            success: true,
            message: "Password changed successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ================= GET ACCOUNTANTS =================
exports.getAccountants = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const vendor = await venderSchema.findById(vendorId);
        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: "Vendor not found",
            });
        }

        const accountants = await Accountant.find({ _id: { $in: vendor.accountant } }, { password: 0 });

        res.status(200).json({
            success: true,
            data: accountants,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};



// ================= SUBUNITS: SEND OTP =================
exports.sendOtpForSubunit = async (req, res) => {
  try {
    const { mainVendorId, mobile } = req.body;

    if (!mainVendorId || !mobile) {
      return res.status(400).json({ success: false, message: "Main vendor ID and mobile number are required" });
    }

    // Clean and validate Indian mobile format
    let cleanedMobile = mobile.replace(/\D/g, '');
    if (cleanedMobile.startsWith("91") && cleanedMobile.length > 10) {
      cleanedMobile = cleanedMobile.slice(2);
    }

    if (!/^[6-9]\d{9}$/.test(cleanedMobile)) {
      return res.status(400).json({ success: false, message: "Invalid mobile number format" });
    }

    // 1. Find the main vendor
    const mainVendor = await vendorModel.findById(mainVendorId);
    if (!mainVendor) {
      return res.status(404).json({ success: false, message: "Main vendor not found" });
    }

    // 2. Find the subunit vendor by mobile
    const subVendor = await vendorModel.findOne({ "contacts.mobile": cleanedMobile });
    if (!subVendor) {
      return res.status(404).json({ success: false, message: "Subunit vendor not found with this mobile number" });
    }

    // Prevent linking self
    if (subVendor._id.toString() === mainVendor._id.toString()) {
      return res.status(400).json({ success: false, message: "You cannot add yourself as a subunit" });
    }

    // Check if already added
    if (mainVendor.subUnits && mainVendor.subUnits.includes(subVendor._id.toString())) {
      return res.status(400).json({ success: false, message: "This vendor is already added as your subunit" });
    }

    // Generate and save OTP on sub-vendor document
    const otp = generateOTP();
    subVendor.otp = otp;
    subVendor.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
    await subVendor.save();

    // Send SMS via VISPL Gateway API
    const rawMessage = `Hi, ${otp} is your One time verification code. Park Smart with ParkMyWheels.`;
    const smsParams = {
      username: process.env.VISPL_USERNAME,
      password: process.env.VISPL_PASSWORD,
      unicode: "false",
      from: process.env.VISPL_SENDER_ID,
      to: cleanedMobile,
      text: rawMessage,
      dltContentId: process.env.VISPL_TEMPLATE_ID,
    };

    console.log("🔐 Subunit Link OTP:", otp);

    const smsResponse = await axios.get("https://pgapi.vispl.in/fe/api/v1/send", {
      params: smsParams,
      paramsSerializer: params => qs.stringify(params, { encode: true }),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Node.js)',
      },
    });

    const status = smsResponse.data.STATUS || smsResponse.data.status || smsResponse.data.statusCode;
    const isSuccess = status === "SUCCESS" || status === 200 || status === 2000;

    if (!isSuccess) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP via SMS",
        visplResponse: smsResponse.data,
      });
    }

    return res.status(200).json({ success: true, message: "OTP sent successfully to the subunit vendor" });

  } catch (error) {
    console.error("❌ Error in sendOtpForSubunit:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= SUBUNITS: VERIFY & ADD =================
exports.verifyAndAddSubunit = async (req, res) => {
  try {
    const { mainVendorId, mobile, otp } = req.body;

    if (!mainVendorId || !mobile || !otp) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    let cleanedMobile = mobile.replace(/\D/g, '');
    if (cleanedMobile.startsWith("91") && cleanedMobile.length > 10) {
      cleanedMobile = cleanedMobile.slice(2);
    }

    // 1. Find main vendor
    const mainVendor = await vendorModel.findById(mainVendorId);
    if (!mainVendor) {
      return res.status(404).json({ success: false, message: "Main vendor not found" });
    }

    // 2. Find subunit vendor
    const subVendor = await vendorModel.findOne({ "contacts.mobile": cleanedMobile });
    if (!subVendor) {
      return res.status(404).json({ success: false, message: "Subunit vendor not found" });
    }

    // 3. Verify OTP
    if (
      subVendor.otp !== otp ||
      !subVendor.otpExpiresAt ||
      new Date() > new Date(subVendor.otpExpiresAt)
    ) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    // 4. Add to subUnits array
    if (!mainVendor.subUnits) {
      mainVendor.subUnits = [];
    }

    if (!mainVendor.subUnits.includes(subVendor._id.toString())) {
      mainVendor.subUnits.push(subVendor._id.toString());
      await mainVendor.save();
    }

    // Clear OTP
    subVendor.otp = null;
    subVendor.otpExpiresAt = null;
    await subVendor.save();

    return res.status(200).json({
      success: true,
      message: "Subunit mapped successfully",
      data: {
        id: subVendor._id,
        name: subVendor.vendorName,
      }
    });

  } catch (error) {
    console.error("❌ Error in verifyAndAddSubunit:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= SUBUNITS: FETCH LIST =================

exports.getSubunits = async (req, res) => {
  try {
    const { vendorId } = req.params;

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "Vendor ID is required" });
    }

    const mainVendor = await vendorModel.findById(vendorId);
    if (!mainVendor) {
      return res.status(404).json({ success: false, message: "Main vendor not found" });
    }

    const subunitIds = mainVendor.subUnits || [];
    const subvendors = await vendorModel.find({ _id: { $in: subunitIds } });

    // Format subunits response with statistics
    const formattedSubunits = await Promise.all(
      subvendors.map(async (sub) => {
        // Calculate total slots from parking entries
        const slotsCount = sub.parkingEntries
          ? sub.parkingEntries.reduce((total, entry) => total + (parseInt(entry.count) || 0), 0)
          : 0;

        // Get count of parked vehicles currently active
        const activeBookingsCount = await Booking.countDocuments({
          vendorId: sub._id.toString(),
          status: "parked",
        });

        // Get all bookings for this subunit to calculate total bookings count and total revenue amount
        const subBookings = await Booking.find({ vendorId: sub._id.toString() });
        const totalBookings = subBookings.length;
        const totalAmount = subBookings.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);

        return {
          id: sub._id,
          name: sub.vendorName,
          description: sub.address || "No address provided",
          members: sub.accountant ? sub.accountant.length : 0,
          slots: slotsCount,
          activeBookings: activeBookingsCount,
          status: sub.visibility ? "Active" : "Inactive",
          contacts: sub.contacts,
          totalBookings: totalBookings,
          totalAmount: totalAmount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: formattedSubunits,
    });

  } catch (error) {
    console.error("❌ Error in getSubunits:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


// ================= SUBUNITS: REMOVE MAPPING =================
exports.removeSubunit = async (req, res) => {
  try {
    const { mainVendorId, subunitId } = req.params;

    if (!mainVendorId || !subunitId) {
      return res.status(400).json({ success: false, message: "Missing required IDs" });
    }

    const mainVendor = await vendorModel.findById(mainVendorId);
    if (!mainVendor) {
      return res.status(404).json({ success: false, message: "Main vendor not found" });
    }

    if (mainVendor.subUnits) {
      mainVendor.subUnits = mainVendor.subUnits.filter(id => id !== subunitId);
      await mainVendor.save();
    }

    return res.status(200).json({
      success: true,
      message: "Subunit removed successfully",
    });

  } catch (error) {
    console.error("❌ Error in removeSubunit:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

