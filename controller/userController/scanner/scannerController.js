const admin = require('../../../config/firebaseAdmin');
const vendorModel = require('../../../models/venderSchema');
const Booking = require('../../../models/bookingSchema');

const requestVehicleReturn = async (req, res) => {
    try {
        let { vendorId, vehicleNumber, bookingId, requestTime } = req.body;

        console.log("Return Request data:", req.body);

        if (!vendorId || !vehicleNumber) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: vendorId or vehicleNumber'
            });
        }

        if (vendorId && vehicleNumber) {
            try {
                const normalizedInput = String(vehicleNumber).trim();
                const cleanInput = normalizedInput.replace(/\s+/g, '');
                const escapedInput = cleanInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                let query = { vendorId: vendorId, status: { $regex: /^parked/i } };

                if (cleanInput.includes('-')) {
                    query.vehicleNumber = { $regex: new RegExp(`^${escapedInput}$`, 'i') };
                } else {
                    query.vehicleNumber = { $regex: new RegExp(`${escapedInput}$`, 'i') };
                }

                const booking = await Booking.findOne(query).sort({ createdAt: -1 });

                let isValid = true;
                if (booking) {
                    const bookingVehicle = booking.vehicleNumber.replace(/\s+/g, '');

                    if (bookingVehicle.includes('-')) {
                        if (cleanInput.includes('-')) {
                            if (bookingVehicle.toLowerCase() !== cleanInput.toLowerCase()) {
                                isValid = false;
                            }
                        } else {
                            if (!bookingVehicle.toLowerCase().endsWith(cleanInput.toLowerCase())) {
                                isValid = false;
                            }
                        }
                    } else { // Booking vehicle does not have a token (no hyphen)
                        if (cleanInput.includes('-')) { // Input has a token, but booking doesn't
                            isValid = false;
                        } else { // Both input and booking vehicle don't have tokens
                            if (bookingVehicle.toLowerCase() !== cleanInput.toLowerCase()) {
                                isValid = false;
                            }
                        }
                    }
                } else {
                    isValid = false;
                }

                if (isValid && booking) {
                    console.log(`Matched vehicle "${vehicleNumber}" to booking "${booking.vehicleNumber}" (${booking._id})`);
                    vehicleNumber = booking.vehicleNumber;
                    if (!bookingId) bookingId = booking._id.toString();
                } else {
                    console.log(`No active PARKED booking found matching "${vehicleNumber}" for vendor ${vendorId}`);
                    return res.status(404).json({
                        success: false,
                        message: 'Vehicle not found or not currently parked.'
                    });
                }
            } catch (err) {
                console.error("Error looking up booking details:", err);
            }
        }

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

        let notificationBody = `Customer is requesting return of vehicle ${vehicleNumber}.`;

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
