const admin = require('../../../config/firebaseAdmin');
const vendorModel = require('../../../models/venderSchema');
const Booking = require('../../../models/bookingSchema');

const requestVehicleReturn = async (req, res) => {
    try {
        let { vendorId, vehicleNumber, bookingId, requestTime } = req.body;

        console.log("Return Request data:", req.body);

        // 1️⃣ Validation
        if (!vendorId || !vehicleNumber) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: vendorId or vehicleNumber'
            });
        }

        // 1.5️⃣ Lookup Booking/Vehicle if needed (Partial Match Support)
        if (vendorId && vehicleNumber) {
            try {
                // Trim and prepare regex for "ends with" matching (case-insensitive)
                const normalizedInput = String(vehicleNumber).trim();
                const escapedInput = normalizedInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escapedInput + "$", "i");

                // Find the most recent PARKED booking matching the vehicle number pattern
                const booking = await Booking.findOne({
                    vendorId: vendorId,
                    vehicleNumber: { $regex: regex },
                    status: { $regex: /^(parked)$/i }
                }).sort({ createdAt: -1 });

                if (booking) {
                    console.log(`Matched vehicle "${vehicleNumber}" to booking "${booking.vehicleNumber}" (${booking._id})`);
                    // Update to full vehicle number and bookingId from database
                    vehicleNumber = booking.vehicleNumber;
                    if (!bookingId) bookingId = booking._id.toString();
                } else {
                    console.log(`No active PARKED booking found matching "${vehicleNumber}" for vendor ${vendorId}`);
                }
            } catch (err) {
                console.error("Error looking up booking details:", err);
            }
        }

        // 2️⃣ Fetch Vendor
        const vendorData = await vendorModel.findOne(
            { _id: vendorId },
            { fcmTokens: 1 }
        );

        if (!vendorData) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found'
            });
        }

        if (!vendorData.fcmTokens || vendorData.fcmTokens.length === 0) {
            console.log(`Vendor ${vendorId} has no registered devices.`);
            return res.status(200).json({
                success: true,
                message: 'Request logged, but vendor has no active devices to notify.'
            });
        }

        // 3️⃣ Notification Payload
        let notificationBody = `Customer is requesting return of vehicle ${vehicleNumber}.`;

        // Check for Valet Token format (Token-VehicleNumber, e.g., "2-7895")
        if (vehicleNumber && vehicleNumber.includes('-')) {
            const parts = vehicleNumber.split('-');
            if (parts.length === 2) {
                const token = parts[0];
                const vNum = parts[1];
                notificationBody = `Get my vehicle ${vNum}\nValet token ${token}`;
            }
        }

        const notificationMessage = {
            notification: {
                title: 'Vehicle Return Requested',
                body: notificationBody,
            },
            data: {
                type: 'RETURN_REQUEST',
                vehicleNumber: vehicleNumber,
                bookingId: bookingId || '',
                requestTime: requestTime || new Date().toISOString(),
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
            },
            android: {
                notification: {
                    sound: "default",
                    priority: "high"
                }
            },
            apns: {
                payload: {
                    aps: { sound: "default" }
                }
            }
        };

        // 4️⃣ Save Notification in DB
        try {
            const Notification = require('../../../models/notificationschema');

            const newNotification = new Notification({
                vendorId: vendorId,
                bookingId: bookingId,
                title: 'Vehicle Return Requested',
                message: notificationBody,
                vehicleNumber: vehicleNumber,
                createdAt: new Date(),
                read: false,
                isVendorRead: false,
                status: 'RETURN_REQUESTED'
            });

            await newNotification.save();
            console.log("Return request notification saved to DB.");
        } catch (dbError) {
            console.error("Error saving notification to DB:", dbError);
        }

        // 5️⃣ Send Push (Using send() like createBooking)
        let failedTokens = [];

        for (const token of vendorData.fcmTokens) {
            try {
                await admin.messaging().send({
                    ...notificationMessage,
                    token: token
                });
            } catch (error) {
                console.log("Invalid token:", token);
                failedTokens.push(token);
            }
        }

        // 6️⃣ Remove Invalid Tokens
        if (failedTokens.length > 0) {
            await vendorModel.updateOne(
                { _id: vendorId },
                { $pull: { fcmTokens: { $in: failedTokens } } }
            );
        }

        console.log("Return request notifications sent successfully.");

        return res.status(200).json({
            success: true,
            message: 'Notification sent successfully'
        });

    } catch (error) {
        console.error('Error in requestVehicleReturn:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

module.exports = { requestVehicleReturn };
