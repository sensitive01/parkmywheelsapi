const chatboxSchema = require("../../models/chatbox");
const advNotification = require("../../models/meetingSchema");


const getNotification = async (req, res) => {
    try {
        const notifications = await advNotification.find({ isRead: false });
        const helpAndSupports = await chatboxSchema.find({ isRead: false });

        res.json({
            notifications,
            helpAndSupports,
            notificationCount: notifications.length,
            helpAndSupportCount: helpAndSupports.length
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
};

const updateNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await advNotification.findByIdAndUpdate(id, { isRead: true });
        const helpAndSupport = await chatboxSchema.findByIdAndUpdate(id, { isRead: true });
        res.json({ notification, helpAndSupport });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update notification" });
    }
};


const getNotificationsByVendor = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const notifications = await advNotification.find({vendorId:vendorId, isRead: true });
        const helpAndSupports = await chatboxSchema.find({vendorId:vendorId, isRead: true });

        res.json({
            notifications,
            helpAndSupports,
            notificationCount: notifications.length,
            helpAndSupportCount: helpAndSupports.length
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
};













module.exports = {
    getNotification,
    updateNotification,
    getNotificationsByVendor
};
