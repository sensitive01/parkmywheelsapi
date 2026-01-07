const chatboxSchema = require("../../models/chatbox");
const advNotification = require("../../models/meetingSchema");
const VendorHelpSupport = require("../../models/userhelp");
const bankApprovalSchema = require("../../models/bankdetailsSchema");


const getNotification = async (req, res) => {
    try {
        const notifications = await advNotification.find({ isRead: false });
        const helpAndSupports = await VendorHelpSupport.find({ isRead: false });
        const bankApprovalNotification = await bankApprovalSchema.find({ isRead: false });



        res.json({
            data: notifications,
            helpAndSupports,
            bankApprovalNotification,
            notificationCount: notifications.length,
            helpAndSupportCount: helpAndSupports.length,
            bankApprovalNotificationCount: bankApprovalNotification.length
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
};

const updateNotification = async (req, res) => {
    try {
        console.log(req.params);
        const { id } = req.params;
        const notification = await advNotification.findByIdAndUpdate(id, { isRead: true });
        const helpAndSupport = await VendorHelpSupport.findByIdAndUpdate(id, { isRead: true });
        const bankApprovalNotification = await bankApprovalSchema.findByIdAndUpdate(id, { isRead: true });

        res.json({ notification, helpAndSupport, bankApprovalNotification });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update notification" });
    }
};


const getNotificationsByVendor = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const notifications = await advNotification.find({ vendorId: vendorId, isRead: true });
        const helpAndSupports = await chatboxSchema.find({ vendorId: vendorId, isRead: true });

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


const clearAllAdminNotification = async (req, res) => {
    try {
        await advNotification.updateMany({}, { $set: { isRead: true } });
        await chatboxSchema.updateMany({}, { $set: { isRead: true } });
        res.json({ message: "All notifications marked as read successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to mark notifications as read" });
    }
};












module.exports = {
    clearAllAdminNotification,
    getNotification,
    updateNotification,
    getNotificationsByVendor
};
