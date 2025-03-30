const express = require("express");
const multer = require("multer");
const adminRoute = express.Router();
const adminController = require("../../controller/adminController/adminController");
const planController = require("../../controller/adminController/planController");
const subscriptionController = require('../../controller/adminController/subscriptionController');
const CommercialController = require('../../controller/adminController/commercialController');
const CorporateController = require('../../controller/adminController/corporateController');

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

adminRoute.post('/createcorporate', CorporateController.createService);
adminRoute.get('/getallcorporate', CorporateController.getAllServices);
adminRoute.get('/getbycorporate/:id', CorporateController.getServiceById);
adminRoute.put('/updatecorporate/:id', CorporateController.updateService);
adminRoute.delete('/deletecorporate/:id', CorporateController.deleteService);

module.exports = adminRoute;
