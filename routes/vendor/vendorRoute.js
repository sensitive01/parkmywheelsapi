const express = require("express");
const multer = require("multer");
const vendorRoute = express.Router();
const vendorController = require("../../controller/vendorController/vendorController");
const meetingController = require("../../controller/vendorController/meetingController/meetingController")
const bookingController = require("../../controller/vendorController/bookingController/bookingController")
const vehiclefetchController = require("../../controller/vendorController/vehiclefetchController/vehiclefetchController");
const fetchbyidController = require("../../controller/vendorController/fetchbyidController/fetchBookingsByVendorId");
const privacyController = require("../../controller/vendorController/privacyController/privacyController")
const chargesController = require("../../controller/vendorController/chargesController/chargesController")
const bannerController = require("../../controller/vendorController/bannerController/bannerController");
const amenitiesController = require("../../controller/vendorController/amenitiesController/amenitiesController");
const kycController = require("../../controller/vendorController/kycController/kycDetails");
const  helpfeedbackController = require("../../controller/vendorController/helpfeedback/helpfeedbackController");
const bankdetailsConroller = require("../../controller/vendorController/bankdetailsController/bankdetailsController");
const agenda = require("../../config/agenda");
const  verifyPaymentResponse  = require("../../controller/vendorController/transaction/transaction");



const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

vendorRoute.get("/fetchnotification/:vendorId", bookingController.getNotificationsByVendor);

vendorRoute.post("/forgotpassword", vendorController.vendorForgotPassword);
vendorRoute.post("/verify-otp", vendorController.verifyOTP);
vendorRoute.post("/resend-otp", vendorController.vendorForgotPassword);
vendorRoute.post("/change-password", vendorController.vendorChangePassword);
vendorRoute.get("/fetchsubscription/:vendorId", vendorController.fetchVendorSubscription);
vendorRoute.get("/fetchbusinesshours/:vendorId", vendorController.fetchhours);

vendorRoute.post("/sendTestNotification", bookingController.sendTestNotification);


vendorRoute.put("/updatehours/:vendorId", vendorController.updateVendorHours);


vendorRoute.post("/createmeeting", meetingController.create);
vendorRoute.get("/fetchmeeting/:id", meetingController.getMeetingsByVendor);

vendorRoute.post("/createbooking", bookingController.createBooking);
vendorRoute.get("/getbookingdata/:id", bookingController.getBookingsByVendorId);
vendorRoute.get("/getbookinguserid/:id", bookingController.getBookingsByuserid);
vendorRoute.get("/getbooking/:id", bookingController.getBookingById);
vendorRoute.get("/bookings", bookingController.getAllBookings);
vendorRoute.delete("/deletebooking/:id", bookingController.deleteBooking);
vendorRoute.put("/update/:id", bookingController.updateBooking);
vendorRoute.put("/exitvehicle/:id", bookingController.updateBookingAmountAndHour);
vendorRoute.get("/fetchbookingtransaction/:vendorId", bookingController.getReceivableAmount);
vendorRoute.get("/bookedslots/:vendorId", bookingController.getParkedVehicleCount);
vendorRoute.get("/availableslots/:vendorId", bookingController.getAvailableSlotCount);
vendorRoute.get("/bookavailability", bookingController.getVendorParkingSummaryByType);

vendorRoute.post("/addparkingcharges", chargesController.parkingCharges);
vendorRoute.get("/getchargesdata/:id", chargesController.getChargesbyId);
vendorRoute.get("/getchargesbycategoryandtype/:vendorid/:category/:chargeid", chargesController.getChargesByCategoryAndType );
vendorRoute.get("/explorecharge/:id", chargesController.Explorecharge);

vendorRoute.put("/upadatefulldaycar/:vendorId",chargesController.updateExtraParkingDataCar)
vendorRoute.put("/upadatefulldaybike/:vendorId",chargesController.updateExtraParkingDataBike)
vendorRoute.put("/upadatefulldayothers/:vendorId",chargesController.updateExtraParkingDataOthers)
vendorRoute.get("/getfullday/:vendorId",chargesController.getFullDayModes)
vendorRoute.get('/fetchenable/:vendorId',chargesController. getEnabledVehicles);

// Update carenable flag
vendorRoute.put('/updateenable/:vendorId',chargesController. updateEnabledVehicles);
vendorRoute.put('/updatebottom/:vendorId',chargesController. updatelistv);


vendorRoute.get("/privacy/:id", privacyController.getPrivacyPolicy)

vendorRoute.post("/update-status",bookingController.updateBookingStatus)


vendorRoute.post("/createbanner", upload.fields([{ name: 'image', maxCount: 1 }]), bannerController.createBanner)
vendorRoute.get("/getbanner", bannerController.getBanners)


vendorRoute.post("/amenities", amenitiesController.addAmenitiesData)
vendorRoute.get("/getamenitiesdata/:id", amenitiesController.getAmenitiesData)
vendorRoute.put("/updateamenitiesdata/:id",amenitiesController.updateAmenitiesData )
vendorRoute.put("/updateparkingentries/:id", amenitiesController.updateParkingEntries)
vendorRoute.get("/fetchmonth/:id/:vehicleType", chargesController.fetchbookmonth);
vendorRoute.put("/approvebooking/:id", bookingController.updateApproveBooking);
vendorRoute.put("/cancelbooking/:id", bookingController.updateCancelBooking);
vendorRoute.put("/approvedcancelbooking/:id", bookingController.updateApprovedCancelBooking);
vendorRoute.put("/allowparking/:id", bookingController.allowParking);
vendorRoute.put("/usercancelbooking/:id", bookingController.userupdateCancelBooking);

vendorRoute.get("/fetchbookingsbyvendorid/:id", fetchbyidController.fetchBookingsByVendorId);

vendorRoute.get("/vendortotalparking/:id", vehiclefetchController.fetchParkingData);

vendorRoute.post(
  "/spaceregister",
  upload.single("image"),
  vendorController.myspacereg
);
vendorRoute.post(
  "/signup",
  upload.single("image"),
  vendorController.vendorSignup
);
vendorRoute.post("/login", vendorController.vendorLogin);

vendorRoute.get("/fetchspacedata", vendorController.fetchsinglespacedata);
vendorRoute.get("/fetch-vendor-data", vendorController.fetchVendorData);
vendorRoute.get("/fetch-all-vendor-data", vendorController.fetchAllVendorData);
vendorRoute.get("/fetch-slot-vendor-data/:id", vendorController.fetchSlotVendorData);
vendorRoute.get("/fetchspace/:spaceid", vendorController.fetchspacedata);
vendorRoute.put(
  "/updatevendor/:vendorId",
   upload.single("image"), 
   vendorController.updateVendorData);
   vendorRoute.put(
    "/updatespace/:vendorId",
     upload.single("image"), 
     vendorController.updatespacedata);
vendorRoute.post("/addExtraDays/:vendorId", vendorController.addExtraDaysToSubscription);
vendorRoute.put("/update-parking-entries-vendor-data/:vendorId", vendorController.updateParkingEntriesVendorData);
vendorRoute.get('/fetchtrial/:vendorId', vendorController.getVendorTrialStatus);
vendorRoute.put("/freetrial/:vendorId", vendorController.updateVendorSubscription);
vendorRoute.get("/all-vendors", vendorController.fetchAllVendorDetails);
vendorRoute.put("/approve/:vendorId", vendorController.updateVendorStatus);
vendorRoute.post('/sucesspay/:vendorId', verifyPaymentResponse.verifyPaymentResponse);

vendorRoute.post('/log/:vendorId', verifyPaymentResponse.logpay);
vendorRoute.post('/usersucesspay/:userid', verifyPaymentResponse.userverifyPaymentResponse);
vendorRoute.post('/userlog/:userid', verifyPaymentResponse.userlogpay);
vendorRoute.get('/fetchpay/:userid', verifyPaymentResponse.getPaymentsUserId);

vendorRoute.get('/fet/:id', chargesController.fetchtestAmount);


vendorRoute.post("/createkyc",  upload.fields([
  { name: "idProofImage", maxCount: 1 },
  { name: "addressProofImage", maxCount: 1 }
]),kycController.createKycData)
vendorRoute.get("/getkyc/:id", kycController.getKycData)
vendorRoute.put(
  "/updatekyc/:vendorId",
  upload.fields([
    { name: "idProofImage", maxCount: 1 },
    { name: "addressProofImage", maxCount: 1 },
  ]),
  kycController.updateKycData
);
vendorRoute.get("/getallkyc", kycController.getallKycData);
vendorRoute.put('/verifykyc/:vendorId', kycController.verifyKycStatus);



vendorRoute.post("/createhelpvendor", helpfeedbackController.createVendorHelpSupportRequest);
vendorRoute.get("/gethelpvendor/:vendorid", helpfeedbackController.getVendorHelpSupportRequests);
vendorRoute.post("/sendchat/:helpRequestId", upload.single("image"), helpfeedbackController.sendchat);
vendorRoute.get("/fetchchat/:helpRequestId", helpfeedbackController.fetchchathistory);
vendorRoute.get("/charge/:id", chargesController.fetchC);
vendorRoute.get("/fetchbookcharge/:id/:vehicleType", chargesController.fetchbookamout);
vendorRoute.put('/book/:id/', chargesController.tested);


vendorRoute.get("/charges/:id/:vehicleType", chargesController.fetchexit);
vendorRoute.get("/run-agenda-job", async (req, res) => {
  try {
    await agenda.now("decrease subscription left"); 
    res.status(200).json({ message: "Agenda job triggered successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to trigger agenda job." });
  }
});

vendorRoute.post("/bankdetails", upload.none(), bankdetailsConroller.createOrUpdateBankDetail);
vendorRoute.get("/getbankdetails/:vendorId", bankdetailsConroller.getBankDetails);

vendorRoute.get("/fetchsubscriptionleft/:vendorId", vendorController.fetchVendorSubscriptionLeft);

vendorRoute.post("/vendorlogout", vendorController.vendorLogoutById);


module.exports = vendorRoute;
