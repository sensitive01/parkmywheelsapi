const express = require("express");
const multer = require("multer");
const vendorRoute = express.Router();
const vendorController = require("../../controller/vendorController/vendorController");
const meetingController = require("../../controller/vendorController/meetingController/meetingController")
// const meetingController = require("../../controller/vendorController/meetingController/meetingController")
const bookingController = require("../../controller/vendorController/bookingController/bookingController")
const vehiclefetchController = require("../../controller/vendorController/vehiclefetchController/vehiclefetchController");
const fetchbyidController = require("../../controller/vendorController/fetchbyidController/fetchBookingsByVendorId");
const privacyController = require("../../controller/vendorController/privacyController/privacyController")
const chargesController = require("../../controller/vendorController/chargesController/chargesController")
const bannerController = require("../../controller/vendorController/bannerController/bannerController");
const amenitiesController = require("../../controller/vendorController/amenitiesController/amenitiesController");
const kycController = require("../../controller/vendorController/kycController/kycDetails");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

vendorRoute.post("/forgotpassword", vendorController.vendorForgotPassword);
vendorRoute.post("/verify-otp", vendorController.verifyOTP);
vendorRoute.post("/resend-otp", vendorController.vendorForgotPassword);
vendorRoute.post("/change-password", vendorController.vendorChangePassword);


vendorRoute.post("/createmeeting", meetingController.create);

// Route to get meetings by vendor
vendorRoute.get("/fetchmeeting/:id", meetingController.getMeetingsByVendor);
// vendorRoute.post("/create", )

vendorRoute.post("/createbooking", bookingController.createBooking);
vendorRoute.get("/getbookingdata/:id", bookingController.getBookingsByVendorId);
vendorRoute.get("/getbookinguserid/:id", bookingController.getBookingsByuserid);
vendorRoute.get("/getbooking/:id", bookingController.getBookingById);
vendorRoute.get("/bookings", bookingController.getAllBookings);
vendorRoute.delete("/deletebooking/:id", bookingController.deleteBooking);
vendorRoute.put("/update/:id", bookingController.updateBooking);
vendorRoute.post("/exitvehicle/:id", bookingController.exitVehicle);
vendorRoute.get("/bookedslots/:vendorId", bookingController.getParkedVehicleCount);
// vendorRoute.get("/availableslots/:vendorId", bookingController.getParkedVehicleCount);

vendorRoute.post("/addparkingcharges", chargesController.parkingCharges);
vendorRoute.get("/getchargesdata/:id", chargesController.getChargesbyId);
vendorRoute.get("/getchargesbycategoryandtype/:vendorid/:category/:chargeid", chargesController.getChargesByCategoryAndType );


vendorRoute.get("/privacy/:id", privacyController.getPrivacyPolicy)

vendorRoute.post("/update-status",bookingController.updateBookingStatus)

//Route for banner
vendorRoute.post("/createbanner", upload.fields([{ name: 'image', maxCount: 1 }]), bannerController.createBanner)
vendorRoute.get("/getbanner", bannerController.getBanners)

//Route for amenities
vendorRoute.post("/amenities", amenitiesController.addAmenitiesData)
vendorRoute.get("/getamenitiesdata/:id", amenitiesController.getAmenitiesData)
vendorRoute.put("/updateamenitiesdata/:id",amenitiesController.updateAmenitiesData )
vendorRoute.put("/updateparkingentries/:id", amenitiesController.updateParkingEntries)


vendorRoute.put("/approvebooking/:id", bookingController.updateApproveBooking);
vendorRoute.put("/cancelbooking/:id", bookingController.updateCancelBooking);
vendorRoute.put("/allowparking/:id", bookingController.allowParking);


vendorRoute.get("/fetchbookingsbyvendorid/:id", fetchbyidController.fetchBookingsByVendorId); //total how many bookings

vendorRoute.get("/vendortotalparking/:id", vehiclefetchController.fetchParkingData); // total booking including cars and bikes

// Routes
vendorRoute.post(
  "/signup",
  upload.single("image"),
  vendorController.vendorSignup
);
vendorRoute.post("/login", vendorController.vendorLogin);
vendorRoute.get("/fetch-vendor-data", vendorController.fetchVendorData);
vendorRoute.get("/fetch-all-vendor-data", vendorController.fetchAllVendorData);
vendorRoute.get("/fetch-slot-vendor-data/:id", vendorController.fetchSlotVendorData);
vendorRoute.put(
  "/updatevendor/:vendorId",
   upload.single("image"), 
   vendorController.updateVendorData);
vendorRoute.put("/update-parking-entries-vendor-data/:vendorId", vendorController.updateParkingEntriesVendorData);


//Route for KYC
vendorRoute.post("/createkyc",  upload.fields([
  { name: "idProofImage", maxCount: 1 }, // Handle idProofImage field
  { name: "addressProofImage", maxCount: 1 } // Handle addressProofImage field
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
vendorRoute.get("/getallkyc", kycController.getallKycData)



module.exports = vendorRoute;
