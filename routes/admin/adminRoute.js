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
const authLogController = require("../../controller/adminController/authLogController");
const valetDriverController = require("../../controller/adminController/valetDriverController");
const employeeController = require("../../controller/adminController/employeeController");
const leadController = require("../../controller/adminController/leadController");
const attendanceController = require("../../controller/adminController/attendanceController");
const leaveController = require("../../controller/adminController/leaveController");


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
adminRoute.post("/logout", adminController.adminLogout);
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
adminRoute.get('/getfilteredbookingtransactions', adminController.getFilteredVendorsTransaction);

// Valet Drivers
adminRoute.get("/valet-drivers", valetDriverController.getAllValetDrivers);
adminRoute.put("/valet-driver/:driverId", upload.single("proof"), valetDriverController.updateValetDriver);
adminRoute.delete("/valet-driver/:driverId", valetDriverController.deleteValetDriver);

// adminRoute.get("/get-admin-notifications", adminController.getAdminNotifications);




adminRoute.patch("/adminclosechat/:helpRequestId", adminController.closeChat);

// Dashboard route for admin
adminRoute.get("/vendor-count", adminController.getVendorCount);
adminRoute.get("/booking-count", adminController.getBookingSummary);
adminRoute.get("/booking-summary-v2", adminController.getBookingSummaryV2);
adminRoute.get("/user-summary", adminController.getUserSummary);
adminRoute.get("/user-summary-v2", adminController.getUserSummaryV2);
adminRoute.get("/space-summary", adminController.getVendorSpaceSummary);
adminRoute.get("/vendor-space-summary-v2", adminController.getVendorSpaceSummaryV2);
adminRoute.get('/kyc-summary', adminController.getKycSummary);
adminRoute.get('/kyc-summary-v2', adminController.getKycSummaryV2);
adminRoute.get("/transaction-summary", adminController.getTransactionSummary);
adminRoute.get("/transaction-summary-v2", adminController.getTransactionSummaryV2);
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

// --- Employee Routes ---
adminRoute.post("/employee", employeeController.createEmployee);
adminRoute.get("/employees", employeeController.getEmployees);
adminRoute.put("/employee/:id", employeeController.updateEmployee);
adminRoute.delete("/employee/:id", employeeController.deleteEmployee);


// --- Lead Routes ---
adminRoute.post("/lead", leadController.createLead);
adminRoute.get("/leads", leadController.getLeads);
adminRoute.put("/lead/:id", leadController.updateLead);
adminRoute.delete("/lead/:id", leadController.deleteLead);
// --- Attendance Routes ---
adminRoute.post("/attendance", attendanceController.createAttendance);
adminRoute.get("/attendance", attendanceController.getAttendance);
adminRoute.put("/attendance/:id", attendanceController.updateAttendance);
adminRoute.delete("/attendance/:id", attendanceController.deleteAttendance);

// --- Leave Routes ---
adminRoute.post("/leave", leaveController.createLeave);
adminRoute.get("/leaves", leaveController.getLeaves);
adminRoute.put("/leave/:id", leaveController.updateLeave);
adminRoute.delete("/leave/:id", leaveController.deleteLeave);

adminRoute.put("/clear-all-admin-notifications", notificationController.clearAllAdminNotification);

adminRoute.get("/fetchallvendors", adminController.getAllVendorData);




const activityLogController = require("../../controller/adminController/activityLogController");

// Auth Audit Logs
adminRoute.get("/auth-logs", authLogController.getAuthLogs);
adminRoute.get("/auth-logs/:id", authLogController.getAuthLogById);
adminRoute.delete("/auth-logs/:id", authLogController.deleteAuthLog);

// Activity Audit Logs
adminRoute.get("/activity-logs", activityLogController.getActivityLogs);
adminRoute.get("/activity-logs/:id", activityLogController.getActivityLogById);
adminRoute.delete("/activity-logs/:id", activityLogController.deleteActivityLog);

module.exports = adminRoute;