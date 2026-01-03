const express = require("express");
const multer = require("multer");
const adminRoute = express.Router();
const adminController = require("../../controller/adminController/adminController");
const planController = require("../../controller/adminController/planController");
const subscriptionController = require('../../controller/adminController/subscriptionController');
const CommercialController = require('../../controller/adminController/commercialController');
const CorporateController = require('../../controller/adminController/corporateController');
const adminChatboxController = require("../../controller/adminController/chatboxController/chatboxController");
const customerHandlingFeeController = require("../../controller/adminController/customerHanglingFee");
const bankVerificationController = require("../../controller/adminController/bankVerificationController");
const notificationController = require("../../controller/adminController/notificationController");


const agenda = require("../../config/agenda");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


adminRoute.post("/forgotpassword", adminController.vendorForgotPassword);
adminRoute.post("/verify-otp", adminController.verifyOTP);
adminRoute.post("/resend-otp", adminController.vendorForgotPassword);
adminRoute.post("/change-password", adminController.vendorChangePassword);
adminRoute.get("/fetchsubscription/:adminId", adminController.fetchVendorSubscription);


adminRoute.post(
  "/spaceregister",
  upload.single("image"),
  adminController.myspacereg
);
adminRoute.post(
  "/signup",
  upload.single("image"),
  adminController.vendorSignup
);

adminRoute.get("/fetchspace", adminController.fetchspacedata);
adminRoute.post("/login", adminController.vendorLogin);
adminRoute.get("/fetch-vendor-data", adminController.fetchVendorData);
adminRoute.get("/fetch-all-vendor-data", adminController.fetchAllVendorData);
adminRoute.get("/fetch-slot-vendor-data/:id", adminController.fetchSlotVendorData);
adminRoute.put(
  "/updatevendor/:adminId",
   upload.single("image"), 
   adminController.updateVendorData);
adminRoute.put("/update-parking-entries-vendor-data/:adminId", adminController.updateParkingEntriesVendorData);

adminRoute.put("/freetrial/:adminId", adminController.updateVendorSubscription);


adminRoute.get("/fetchsubscriptionleft/:adminId", adminController.fetchVendorSubscriptionLeft);

adminRoute.post("/createplan",upload.single("image"), planController.addNewPlan);
adminRoute.get("/getallplan", planController.getAllPlans);
adminRoute.get('/getuserplan/:vendorid', planController.getUserPlan);
adminRoute.get("/getvendorplan/:vendorid", planController.getvendorplan);
adminRoute.get("/getplanbyid/:id", planController.getPlanById);
adminRoute.put("/updateplan/:id",upload.single("image"), planController.updatePlan);
adminRoute.delete("/deleteplan/:id", planController.deletePlan);

adminRoute.post('/subscription', subscriptionController.createSubscription);
adminRoute.get('/subscriptionbyid/:userId', subscriptionController.getUserSubscription);
adminRoute.put('/subscriptioncancel/:userId', subscriptionController.cancelSubscription);
adminRoute.get('/subscriptionall', subscriptionController.getAllSubscriptions);
adminRoute.put('/subscriptionupdate/:userId', subscriptionController.updateSubscription);

adminRoute.post('/createCommercial', CommercialController.createService);
adminRoute.get('/getallCommercial', CommercialController.getAllServices);
adminRoute.get('/getbyCommercial/:id', CommercialController.getServiceById);
adminRoute.put('/updateCommercial/:id', CommercialController.updateService);
adminRoute.delete('/deleteCommercial/:id', CommercialController.deleteService);

adminRoute.post('/createcorporate', CorporateController.createCorporate);
adminRoute.get('/getallcorporate', CorporateController.getAllCorporates);
adminRoute.get('/getbycorporate/:id', CorporateController.getCorporateById);
adminRoute.put('/updatecorporate/:id', CorporateController.updateCorporate);
adminRoute.delete('/deletecorporate/:id', CorporateController.deleteCorporate);
adminRoute.delete("/deletevendor/:vendorId", adminController.deleteVendor);
adminRoute.delete("/deleteuser/:id", adminController.deleteUserById);
adminRoute.get("/getallspaces", adminController.getAllSpaces);
adminRoute.get("/fetchspacebyvendor", adminController.fetchsinglespacedata);
adminRoute.get("/allusers", adminController.getAllUsers);
adminRoute.get("/fetchspace/:spaceid", adminController.fetchspacedatabyuser);

adminRoute.delete("/delete/:id", adminController.deleteKycData);
adminRoute.get("/fetchallbookingtransactions", adminController.getAllVendorsTransaction);

adminRoute.get("/get-admin-notifications", adminController.getAdminNotifications);




adminRoute.patch("/adminclosechat/:helpRequestId", adminController.closeChat);

// Dashboard route for admin
adminRoute.get("/vendor-count", adminController.getVendorCount);
adminRoute.get("/booking-count", adminController.getBookingSummary);
adminRoute.get("/user-summary", adminController.getUserSummary);
adminRoute.get("/space-summary", adminController.getVendorSpaceSummary);
adminRoute.get('/kyc-summary', adminController.getKycSummary);
adminRoute.get("/transaction-summary", adminController.getTransactionSummary);
adminRoute.get("/transaction-status-list", adminController.getVendorsByTransactionStatus);
adminRoute.get("/vendor-status-stats", adminController.getVendorStatusStats);
adminRoute.get("/space-status-stats", adminController.getSpacesStatus);

adminRoute.put(
  "/update-vendor/:id",
  adminController.updateVendorDetails
);

adminRoute.get("/fetchadmin/:id", adminController.getVendorById)
adminRoute.put(
  "/updatevendors/:vendorId",
   upload.single("image"), 
   adminController.UpdateVendorDataByAdmin);


adminRoute.get("/get-vendor-and-user-data", adminController.getVendorAndUserData)
adminRoute.get("/fetch-subscription-list/:planId", adminController.getPlanList)
adminRoute.get("/fetch-subscriber-list/:vendorId", adminController.getMySubscriberListList)

// Manual Notification API - Send notifications from web interface
adminRoute.post("/send-manual-notification", adminController.sendManualNotification);

// Admin Chatbox routes
adminRoute.get("/chatbox/all", adminChatboxController.getAllChatboxes);
adminRoute.get("/chatbox/user/:userId", adminChatboxController.getUserChatHistory);
adminRoute.post("/chatbox/send/:userId", upload.single("image"), adminChatboxController.sendAdminMessage);
adminRoute.get("/chatbox/users", adminChatboxController.getUsersWithChats);
adminRoute.get("/chatbox/unread-count", adminChatboxController.getUnreadMessageCount);



adminRoute.post("/add-customer-handling-fee", customerHandlingFeeController.addCustomerHandlingFee);
adminRoute.get("/get-customer-handling-fee", customerHandlingFeeController.getCustomerHandlingFee);
adminRoute.put("/update-customer-handling-fee/:id", customerHandlingFeeController.updateCustomerHandlingFee);
adminRoute.delete("/delete-customer-handling-fee/:id", customerHandlingFeeController.deleteCustomerHandlingFee);

adminRoute.get("/get-active-customer-handling-fee", customerHandlingFeeController.getActiveCustomerHandlingFee);


adminRoute.get("/get-all-vendor-bank-details", bankVerificationController.getAllVendorBankDetails);
adminRoute.put('/verify-vendor-bank-details/:id', bankVerificationController.verifyVendorBankDetails);


adminRoute.get("/get-admin-notifications", notificationController.getNotification);
adminRoute.put("/update-admin-notification/:id", notificationController.updateNotification);






module.exports = adminRoute;