const express = require("express");
const multer = require("multer");
const userRoute = express();

// Import controllers
const userController = require("../../controller/userController/userAuthController");
const userProfileController = require("../../controller/userController/userProfileController");
const userHelpController = require("../../controller/userController/userHelpController/userHelpController")

// Configure multer for file uploads
const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage });

userRoute.post("/forgotpassword",userController.userForgotPassword)
userRoute.post("/verify-otp",userController.verifyOTP)
userRoute.post("/resend-otp",userController.userForgotPassword)
userRoute.post("/change-password",userController.userChangePassword)

//User Help and support routes
userRoute.post("/helpandsupport", userHelpController.createHelpSupportRequest)
userRoute.get("/gethelpandsupport/:userId", userHelpController.getHelpSupportRequests)
userRoute.get("/chat/:chatId", userHelpController.getChatMessageByChatId);



// User authentication routes
userRoute.post("/signup", userController.userSignUp);
userRoute.post("/login", userController.userVerification);


// User profile routes
userRoute.get("/get-userdata", userProfileController.getUserData);
userRoute.post("/update-userdata", upload.fields([{ name: 'image', maxCount: 1 }]), userProfileController.updateUserData);

// Home data route for display the user name and images
userRoute.get("/home", userProfileController.getUserDataHome);

// Vehicle data routes to display all the added vehicles
userRoute.get("/get-vehicle", userProfileController.getUserVehicleData);

// Add vehicle route with file upload
userRoute.post("/add-vehicle", upload.fields([{ name: 'image' }]), userProfileController.addNewVehicle);



// Get the vendor details at the time of choose parking dropdown
userRoute.get("/get-slot-details-vendor",userProfileController.getVendorDetails)

// Get the user vehicle details at the time of choose parking dropdown
userRoute.get("/get-vehicle-slot", userProfileController.getUserVehicleData);

//Booking the slot for parking the vehicle
userRoute.post("/book-parking-slot", userProfileController.bookParkingSlot);


userRoute.get("/get-book-parking-slot", userProfileController.getBookingDetails);



//get user details on vendor








// Export the router
module.exports = userRoute;
