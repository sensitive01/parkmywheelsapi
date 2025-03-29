const bcrypt = require("bcrypt");
const userModel = require("../../models/userModel");
const generateOTP = require("../../utils/generateOTP")



const { v4: uuidv4 } = require('uuid');

const generateUserUUID = () => {
  return uuidv4();
};


const userForgotPassword = async (req, res) => {
  try {
    const { contactNo } = req.body;

    const existUser = await userModel.findOne({userMobile:contactNo})

    if (!existUser) {
      return res.status(404).json({
        message: "User not found with the provided contact number"
      });
    }

    if (!contactNo) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    const otp = generateOTP();
    console.log("Generated OTP:", otp);

    req.app.locals.otp = otp;


    return res.status(200).json({
      message: "OTP sent successfully",
      otp: otp,
    });
  } catch (err) {
    console.log("Error in sending OTP in forgot password:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res
        .status(400)
        .json({ message: "OTP is required" });
    }

    if (req.app.locals.otp) {
      if (otp == req.app.locals.otp) {
        return res.status(200).json({
          message: "OTP verified successfully",
          success: true,
        });
      } else {
        return res.status(400).json({
          message: "Invalid OTP",
          success: false,
        });
      }
    } else {
      return res.status(400).json({
        message: "OTP has expired or is invalid",
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
    const { mobile, password } = req.body;
    const userData = await userModel.findOne({ userMobile:mobile });

    if (userData) {
      const isPasswordValid = await bcrypt.compare(password, userData.userPassword);
      
      if (isPasswordValid) {
        const role = userData.role === "user" ? "user" : "admin";
        return res.status(200).json({
          message: "Login successful.",
          id: userData.uuid,
          role: role,
        });
      } else {
        return res.status(401).json({ message: "Entered password is incorrect." });
      }
    } else {
      return res.status(404).json({ message: "User is not registered, please sign up." });
    }
  } catch (err) {
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
    const users = await userModel.find({}, '-userPassword'); // Exclude password from response

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




module.exports = {
  userSignUp,
  userVerification,
  userForgotPassword,
  verifyOTP,
  userChangePassword,
  getAllUsers
};