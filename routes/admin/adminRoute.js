const express = require("express");
const multer = require("multer");
const adminRoute = express.Router();
const adminController = require("../../controller/adminController/adminController");
const meetingController = require("../../controller/adminController/meetingController/meetingController")
const bookingController = require("../../controller/adminController/bookingController/bookingController")
const vehiclefetchController = require("../../controller/adminController/vehiclefetchController/vehiclefetchController");
const fetchbyidController = require("../../controller/adminController/fetchbyidController/fetchBookingsByVendorId");
const privacyController = require("../../controller/adminController/privacyController/privacyController")
const chargesController = require("../../controller/adminController/chargesController/chargesController")
const bannerController = require("../../controller/adminController/bannerController/bannerController");
const amenitiesController = require("../../controller/adminController/amenitiesController/amenitiesController");
const kycController = require("../../controller/adminController/kycController/kycDetails");
const  helpfeedbackController = require("../../controller/adminController/helpfeedback/helpfeedbackController");
const bankdetailsConroller = require("../../controller/adminController/bankdetailsController/bankdetailsController");
const agenda = require("../../config/agenda");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


adminRoute.post("/forgotpassword", adminController.vendorForgotPassword);
adminRoute.post("/verify-otp", adminController.verifyOTP);
adminRoute.post("/resend-otp", adminController.vendorForgotPassword);
adminRoute.post("/change-password", adminController.vendorChangePassword);
adminRoute.get("/fetchsubscription/:adminId", adminController.fetchVendorSubscription);


adminRoute.post("/createmeeting", meetingController.create);
adminRoute.get("/fetchmeeting/:id", meetingController.getMeetingsByVendor);

adminRoute.post("/createbooking", bookingController.createBooking);
adminRoute.get("/getbookingdata/:id", bookingController.getBookingsByVendorId);
adminRoute.get("/getbookinguserid/:id", bookingController.getBookingsByuserid);
adminRoute.get("/getbooking/:id", bookingController.getBookingById);
adminRoute.get("/bookings", bookingController.getAllBookings);
adminRoute.delete("/deletebooking/:id", bookingController.deleteBooking);
adminRoute.put("/update/:id", bookingController.updateBooking);
adminRoute.put("/exitvehicle/:id", bookingController.updateBookingAmountAndHour);
adminRoute.get("/fetchbookingtransaction/:adminId", bookingController.getReceivableAmount);
adminRoute.get("/bookedslots/:adminId", bookingController.getParkedVehicleCount);
adminRoute.get("/availableslots/:adminId", bookingController.getAvailableSlotCount);


adminRoute.post("/addparkingcharges", chargesController.parkingCharges);
adminRoute.get("/getchargesdata/:id", chargesController.getChargesbyId);
adminRoute.get("/getchargesbycategoryandtype/:vendorid/:category/:chargeid", chargesController.getChargesByCategoryAndType );
adminRoute.get("/explorecharge/:id", chargesController.Explorecharge);


adminRoute.get("/privacy/:id", privacyController.getPrivacyPolicy)

adminRoute.post("/update-status",bookingController.updateBookingStatus)


adminRoute.post("/createbanner", upload.fields([{ name: 'image', maxCount: 1 }]), bannerController.createBanner)
adminRoute.get("/getbanner", bannerController.getBanners)


adminRoute.post("/amenities", amenitiesController.addAmenitiesData)
adminRoute.get("/getamenitiesdata/:id", amenitiesController.getAmenitiesData)
adminRoute.put("/updateamenitiesdata/:id",amenitiesController.updateAmenitiesData )
adminRoute.put("/updateparkingentries/:id", amenitiesController.updateParkingEntries)
adminRoute.get("/fetchmonth/:id/:vehicleType", chargesController.fetchbookmonth);
adminRoute.put("/approvebooking/:id", bookingController.updateApproveBooking);
adminRoute.put("/cancelbooking/:id", bookingController.updateCancelBooking);
adminRoute.put("/approvedcancelbooking/:id", bookingController.updateApprovedCancelBooking);
adminRoute.put("/allowparking/:id", bookingController.allowParking);
adminRoute.put("/usercancelbooking/:id", bookingController.userupdateCancelBooking);

adminRoute.get("/fetchbookingsbyvendorid/:id", fetchbyidController.fetchBookingsByVendorId);

adminRoute.get("/vendortotalparking/:id", vehiclefetchController.fetchParkingData);

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


adminRoute.post("/createkyc",  upload.fields([
  { name: "idProofImage", maxCount: 1 },
  { name: "addressProofImage", maxCount: 1 }
]),kycController.createKycData)
adminRoute.get("/getkyc/:id", kycController.getKycData)
adminRoute.put(
  "/updatekyc/:adminId",
  upload.fields([
    { name: "idProofImage", maxCount: 1 },
    { name: "addressProofImage", maxCount: 1 },
  ]),
  kycController.updateKycData
);
adminRoute.get("/getallkyc", kycController.getallKycData)



adminRoute.post("/createhelpvendor", helpfeedbackController.createVendorHelpSupportRequest);
adminRoute.get("/gethelpvendor/:adminId", helpfeedbackController.getVendorHelpSupportRequests);
adminRoute.post("/sendchat/:helpRequestId", upload.single("image"), helpfeedbackController.sendchat);
adminRoute.get("/fetchchat/:helpRequestId", helpfeedbackController.fetchchathistory);
adminRoute.get("/charge/:id", chargesController.fetchC);
adminRoute.get("/fetchbookcharge/:id/:vehicleType", chargesController.fetchbookamout);

adminRoute.get("/charges/:id/:vehicleType", chargesController.fetchexit);
adminRoute.get("/run-agenda-job", async (req, res) => {
  try {
    await agenda.now("decrease subscription left"); 
    res.status(200).json({ message: "Agenda job triggered successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to trigger agenda job." });
  }
});

adminRoute.post("/bankdetails", upload.none(), bankdetailsConroller.createOrUpdateBankDetail);
adminRoute.get("/getbankdetails/:adminId", bankdetailsConroller.getBankDetails);

adminRoute.get("/fetchsubscriptionleft/:adminId", adminController.fetchVendorSubscriptionLeft);

module.exports = adminRoute;
