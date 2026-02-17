const admin = require('../../../config/firebaseAdmin');
const vendorModel = require('../../../models/venderSchema');

const requestVehicleReturn = async (req, res) => {
    try {
        const { vendorId, vehicleNumber, bookingId, requestTime } = req.body;

        console.log("Return Request data:", req.body);

        // 1️⃣ Validation
        if (!vendorId || !vehicleNumber) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: vendorId or vehicleNumber'
            });
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
        const notificationMessage = {
            notification: {
                title: 'Vehicle Return Requested',
                body: `Customer is requesting return of vehicle ${vehicleNumber}.`,
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
                message: `Customer is requesting return of vehicle ${vehicleNumber}.`,
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
