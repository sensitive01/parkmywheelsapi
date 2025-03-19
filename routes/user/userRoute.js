const express = require("express");
const multer = require("multer");
const userRoute = express();

const userController = require("../../controller/userController/userAuthController");
const userProfileController = require("../../controller/userController/userProfileController");
const userHelpController = require("../../controller/userController/userHelpController/userHelpController")
const feedbackController = require("../../controller/userController/feedbackreviewController/feedbackreview");
const bookingController = require("../../controller/userController/userbookController/userbookController");
const addFavoriteVendor =require("../../controller/userController/userProfileController");
const removeFavoriteVendor =require("../../controller/userController/userProfileController");
const getFavoriteVendors =require("../../controller/userController/userProfileController");

const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage });

userRoute.post("/forgotpassword",userController.userForgotPassword)
userRoute.post("/verify-otp",userController.verifyOTP)
userRoute.post("/resend-otp",userController.userForgotPassword)
userRoute.post("/change-password",userController.userChangePassword)

userRoute.post("/helpandsupport", userHelpController.createHelpSupportRequest)
userRoute.get("/gethelpandsupport/:userId", userHelpController.getHelpSupportRequests)
userRoute.get("/chat/:chatId", userHelpController.getChatMessageByChatId);
userRoute.post("/sendchat/:helpRequestId", upload.single("image"), userHelpController.sendChatDetails);
userRoute.get("/fetchuserchat/:helpRequestId", userHelpController.fetchuserchathistory);

userRoute.post("/signup", userController.userSignUp);
userRoute.post("/login", userController.userVerification);

userRoute.get("/get-userdata", userProfileController.getUserData);
userRoute.post("/update-userdata", upload.fields([{ name: 'image', maxCount: 1 }]), userProfileController.updateUserData);


userRoute.get("/home", userProfileController.getUserDataHome);

userRoute.get("/get-vehicle", userProfileController.getUserVehicleData);

userRoute.delete("/deletevehicle", userProfileController.deleteUserVehicle);

userRoute.post("/add-vehicle", upload.fields([{ name: 'image' }]), userProfileController.addNewVehicle);

userRoute.get("/get-slot-details-vendor",userProfileController.getVendorDetails)

userRoute.get("/get-vehicle-slot", userProfileController.getUserVehicleData);

userRoute.post("/book-parking-slot", userProfileController.bookParkingSlot);


userRoute.get("/get-book-parking-slot", userProfileController.getBookingDetails);

userRoute.get("/getwallet/:id", userProfileController.fetchWallet);

// feedback routes

userRoute.get("/getfeedback", feedbackController.fetchFeedback);
userRoute.post("/createfeedback", feedbackController.addFeedback);
userRoute.get("/feedbackbyid/:userId", feedbackController.fetchFeedbackByUserId);
userRoute.put("/updatefeedback/:userId", feedbackController.updateFeedback);
userRoute.post("/addfavourite", addFavoriteVendor.addFavoriteVendor);
userRoute.delete("/removefavourite", removeFavoriteVendor.removeFavoriteVendor);
userRoute.get("/getfavourite", getFavoriteVendors.getFavoriteVendors);

userRoute.get("/cancelled-count/:userid", bookingController.getUserBookingCounts);
userRoute.put("/updatebookingbyid/:id", bookingController.updateBookingById);



module.exports = userRoute;
