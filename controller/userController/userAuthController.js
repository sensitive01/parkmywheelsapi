const bcrypt = require("bcrypt");
const userModel = require("../../models/userModel");
const generateOTP = require("../../utils/generateOTP")
const vendorModel = require("../../models/venderSchema");
const admin = require("firebase-admin");
const qs = require("qs");
const { v4: uuidv4 } = require('uuid');
const axios = require('axios'); // <-- Add this line
const generateUserUUID = () => {
  return uuidv4();
};


const userForgotPassword = async (req, res) => {
  try {
    const { contactNo } = req.body;

    // 1. Basic validation
    if (!contactNo) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    // 2. Clean and validate Indian mobile format
    let cleanedMobile = contactNo.replace(/\D/g, '');
    if (cleanedMobile.startsWith("91") && cleanedMobile.length > 10) {
      cleanedMobile = cleanedMobile.slice(2);
    }

    if (!/^[6-9]\d{9}$/.test(cleanedMobile)) {
      return res.status(400).json({ message: "Invalid mobile number format" });
    }

    // 3. Check user
    const existUser = await userModel.findOne({ userMobile: cleanedMobile });
    if (!existUser) {
      return res.status(404).json({ message: "User not found with the provided mobile number" });
    }

    // 4. Generate OTP and save
    const otp = generateOTP();
    existUser.otp = otp;
    existUser.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
    await existUser.save();

    // 5. Prepare message
    const rawMessage = `Hi, ${otp} is your One time verification code. Park Smart with ParkMyWheels.`;
    const encodedMessage = encodeURIComponent(rawMessage);

    console.log("🔐 OTP:", otp);
    console.log("📤 SMS Raw Message:", rawMessage);

    // 6. Prepare query parameters
    const smsParams = {
      username: process.env.VISPL_USERNAME || "Vayusutha.trans",
      password: process.env.VISPL_PASSWORD || "pdizP",
      unicode: "false",
      from: process.env.VISPL_SENDER_ID || "PRMYWH",
      to: cleanedMobile,
      text: rawMessage, // pass raw, we'll encode it via qs below
      dltContentId: process.env.VISPL_TEMPLATE_ID || "1007991289098439570",
    };

    // 7. Send SMS using axios with safe encoding
    const smsResponse = await axios.get("https://pgapi.vispl.in/fe/api/v1/send", {
      params: smsParams,
      paramsSerializer: params => qs.stringify(params, { encode: true }),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Node.js)', // mimic browser
      },
    });

    console.log("📩 VISPL SMS API Response:", smsResponse.data);

    const status = smsResponse.data.STATUS || smsResponse.data.status || smsResponse.data.statusCode;
    const isSuccess = status === "SUCCESS" || status === 200 || status === 2000;

    if (!isSuccess) {
      return res.status(500).json({
        message: "Failed to send OTP via SMS",
        visplResponse: smsResponse.data,
      });
    }

    // ✅ Success
    return res.status(200).json({ message: "OTP sent successfully" });

  } catch (err) {
    console.error("❌ Error in userForgotPassword:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { contactNo, otp } = req.body;

    if (!contactNo || !otp) {
      return res.status(400).json({ message: "Mobile number and OTP are required" });
    }

    // Clean mobile number as in forgot password
    let cleanedMobile = contactNo.replace(/\D/g, '');
    if (cleanedMobile.startsWith("91") && cleanedMobile.length > 10) {
      cleanedMobile = cleanedMobile.slice(2);
    }

    // Find user by mobile
    const user = await userModel.findOne({ userMobile: cleanedMobile });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check OTP and expiry
    if (
      user.otp === otp &&
      user.otpExpiresAt &&
      new Date() < new Date(user.otpExpiresAt)
    ) {
      // Optionally clear OTP after successful verification
      user.otp = null;
      user.otpExpiresAt = null;
      await user.save();

      return res.status(200).json({
        message: "OTP verified successfully",
        success: true,
      });
    } else {
      return res.status(400).json({
        message: "Invalid or expired OTP",
        success: false,
      });
    }
  } catch (err) {
    console.log("Error in OTP verification:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};




const userSignUp = async (req, res) => {
  try {
    console.log("Welcome to user sugnup",req.body)
    const { userName, userMobile,userEmail,userPassword} = req.body;
    const uuid = generateUserUUID()
   
    const mobile = parseInt(userMobile);

    const existUser = await userModel.findOne({ userMobile });
    console.log("ExistUser",existUser)
    if (!existUser) {
      const hashedPassword = await bcrypt.hash(userPassword, 10);
      
      const userData = {
        uuid,
        userName,
        userEmail:userEmail||"",
        userMobile: mobile,
        userPassword: hashedPassword,
    

       
      };

      const newUser = new userModel(userData);
      await newUser.save();

      res.status(201).json({ message: "User registered successfully.", userData: newUser });
    } else {
      res.status(400).json({ message: "User already registered with the mobile number." });
    }
  } catch (err) {
    console.log("Error in registration",err)
    res.status(500).json({ message: "Internal server error." });
  }
};

const userVerification = async (req, res) => {
  try {
    const { mobile, password, userfcmToken } = req.body;
    const userData = await userModel.findOne({ userMobile: mobile });

    if (!userData) {
      return res.status(404).json({ message: "User is not registered, please sign up." });
    }

    const isPasswordValid = await bcrypt.compare(password, userData.userPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Entered password is incorrect." });
    }

    // Handle FCM token - user collection
    if (userfcmToken && (!userData.userfcmTokens || !userData.userfcmTokens.includes(userfcmToken))) {
      if (!userData.userfcmTokens) {
        userData.userfcmTokens = [];
      }
      userData.userfcmTokens.push(userfcmToken);
      await userData.save();
    }

    // ✅ Associate user's FCM token with vendor (if applicable)
    if (userfcmToken && userData.spaceid) {
      const vendor = await vendorModel.findOne({ spaceid: userData.spaceid });

      if (vendor) {
        if (!vendor.fcmTokens.includes(userfcmToken)) {
          vendor.fcmTokens.push(userfcmToken);
          await vendor.save();
        }
      }
    }

    const role = userData.role === "user" ? "user" : "admin";
    return res.status(200).json({
      message: "Login successful.",
      id: userData.uuid,
      role: role,
    });

  } catch (err) {
    console.error("Verification error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};




const userChangePassword = async (req, res) => {
  try {
    console.log("Welcome to user change password");

    const { contactNo, password, confirmPassword } = req.body;

    // Validate inputs
    if (!contactNo || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Find the user by contact number
    const user = await userModel.findOne({ userMobile: contactNo });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the user's password field
    user.userPassword = hashedPassword;

    // Save the updated user to trigger schema validation and middleware
    await user.save();

    // Send success response
    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error in user change password:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.find({}, '-userPassword'); 

    if (users.length === 0) {
      return res.status(404).json({ message: "No users found." });
    }

    res.status(200).json({
      message: "Users fetched successfully",
      users,
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const { userName, userEmail, userMobile, vehicleNo } = req.body;

    const updatedUser = await userModel.findOneAndUpdate(
      { uuid: userId },
      {
        $set: {
          userName,
          userEmail,
          userMobile: parseInt(userMobile),
          vehicleNo,
        },
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await userModel.findOne(
      { uuid: userId },
      '-userPassword'
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User fetched successfully",
      user,
    });
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};



const userLogoutById = async (req, res) => {
  try {
    const { uuid } = req.body;

    if (!uuid) {
      return res.status(400).json({ message: "User uuid is required" });
    }

    // Use the model correctly and avoid name conflict
    const user = await userModel.findOne({ uuid });

    if (!user) {
      return res.status(404).json({ message: "User not found with provided uuid" });
    }

    if (!user.userfcmTokens || user.userfcmTokens.length === 0) {
      return res.status(200).json({ message: "No FCM tokens to remove" });
    }

    // Remove the last token
    user.userfcmTokens.pop();
    await user.save();

    return res.status(200).json({ message: "Last FCM token removed successfully" });
  } catch (error) {
    console.error("Error in logout:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};




module.exports = {
 
  userSignUp,
  userLogoutById,
  userVerification,
  userForgotPassword,
  verifyOTP,
  userChangePassword,
  getAllUsers,
  updateUserById,
  getUserById,
};