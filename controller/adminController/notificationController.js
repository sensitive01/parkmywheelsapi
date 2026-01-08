const chatboxSchema = require("../../models/chatbox");
const advNotification = require("../../models/meetingSchema");
const VendorHelpSupport = require("../../models/userhelp");
const bankApprovalSchema = require("../../models/bankdetailsSchema");
const Notification = require("../../models/notificationschema"); // Adjust the path as necessary


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
        const notifications = await advNotification.find({ vendorId: vendorId, isVendorRead: false, isRead: true });
        const helpAndSupports = await chatboxSchema.find({ vendorId: vendorId, isVendorRead: false, isRead: true });
        const bankAccountNotifications = await bankApprovalSchema.find({ vendorId: vendorId, isVendorRead: false, isRead: true });

        res.json({
            notifications,
            helpAndSupports,
            bankAccountNotifications,
            notificationCount: notifications.length,
            helpAndSupportCount: helpAndSupports.length,
            bankAccountNotificationCount: bankAccountNotifications.length
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



const getNotificationsByVendorWeb = async (req, res) => {
    try {
        const { vendorId } = req.params;

        const notifications = await Notification.find({ vendorId, isVendorRead: false }).sort({ createdAt: -1 });
        const advNotifications = await advNotification.find({ vendorId: vendorId, isVendorRead: false, isRead: true }).sort({ createdAt: -1 });
        const helpAndSupports = await VendorHelpSupport.find({ vendorid: vendorId, isVendorRead: false, status: "Completed" }).sort({ createdAt: -1 });
        const bankAccountNotifications = await bankApprovalSchema.find({ vendorId: vendorId, isApproved: true, isVendorRead: false }).sort({ createdAt: -1 });



        res.status(200).json({
            success: true,
            count: notifications.length,
            notifications,
            advNotifications,
            helpAndSupports,
            bankAccountNotifications,
        });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};


const deleteNotificationByVendor = async (req, res) => {
    try {
        const { notificationId } = req.params;

        // Try to delete from all potential collections
        // Since IDs are usually unique, it will likely only be found in one
        const del1 = await Notification.findByIdAndDelete(notificationId);
        const del2 = await advNotification.findByIdAndDelete(notificationId);
        const del3 = await VendorHelpSupport.findByIdAndUpdate(notificationId, { isVendorRead: true });
        const del4 = await bankApprovalSchema.findByIdAndUpdate(notificationId, { isApproved: true ,isVendorRead:true});

        if (del1 || del2 || del3 || del4) {
            res.json({ message: "Notification deleted successfully" });
        } else {
            res.status(404).json({ message: "Notification not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to delete notification" });
    }
};








module.exports = {
    getNotificationsByVendorWeb,
    clearAllAdminNotification,
    getNotification,
    updateNotification,
    getNotificationsByVendor,
    deleteNotificationByVendor
};
