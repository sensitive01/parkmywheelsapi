const mongoose = require("mongoose");
const chatboxSchema = require("../../models/chatbox");
const advNotification = require("../../models/meetingSchema");
const VendorHelpSupport = require("../../models/userhelp");
const bankApprovalSchema = require("../../models/bankdetailsSchema");
const Notification = require("../../models/notificationschema"); // Adjust the path as necessary
const Vendor = require("../../models/venderSchema");


const getNotification = async (req, res) => {
    try {
        const notifications = await advNotification.find({ isRead: false });
        let helpAndSupports = await VendorHelpSupport.find({ isRead: false }).sort({ updatedAt: -1 }).lean();

        let bankApprovalNotification = await bankApprovalSchema.find({ $or: [{ isRead: false }, { isApproved: false }] }).lean();


        // Manually populate vendor details
        if (helpAndSupports.length > 0) {
            helpAndSupports = await Promise.all(helpAndSupports.map(async (support) => {
                const vendor = await Vendor.findOne({
                    $or: [
                        { vendorId: support.vendorid },
                        ...(mongoose.Types.ObjectId.isValid(support.vendorid) ? [{ _id: support.vendorid }] : [])
                    ]
                }).select("vendorName image");

                // Extract latest message for snippet
                let latestMsg = support.description;
                if (support.chatbox && support.chatbox.length > 0) {
                    const lastChat = support.chatbox[support.chatbox.length - 1];
                    latestMsg = lastChat.message || "Sent an attachment";
                }

                return {
                    ...support,
                    message: latestMsg, // Explicitly send the latest message
                    title: "Help Request", // Ensure title exists
                    type: "chat", // Ensure type is chat
                    vendorName: vendor ? vendor.vendorName : "Unknown Vendor",
                    vendorImage: vendor ? vendor.image : null
                };
            }));
        }

        // Manually populate vendor details for bankApprovalNotification
        if (bankApprovalNotification.length > 0) {
            bankApprovalNotification = await Promise.all(bankApprovalNotification.map(async (approval) => {
                const vendor = await Vendor.findOne({
                    $or: [
                        { vendorId: approval.vendorId },
                        ...(mongoose.Types.ObjectId.isValid(approval.vendorId) ? [{ _id: approval.vendorId }] : [])
                    ]
                }).select("vendorName image");

                return {
                    ...approval,
                    vendorName: vendor ? vendor.vendorName : "Unknown Vendor",
                    vendorImage: vendor ? vendor.image : null
                };
            }));
        }


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
        const notifications = await advNotification.find({ vendorId: vendorId, isVendorRead: false }).sort({ createdAt: -1 });
        const helpAndSupports = await VendorHelpSupport.find({ vendorid: vendorId, isVendorRead: false }).sort({ updatedAt: -1 });
        const bankAccountNotifications = await bankApprovalSchema.find({ vendorId: vendorId, isVendorRead: false }).sort({ updatedAt: -1 });

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


// Backend Controller Update
const clearAllAdminNotification = async (req, res) => {
    try {
        // 1. Clear General Callbacks
        await advNotification.updateMany({ isRead: false }, { $set: { isRead: true } });

        // 2. Clear Help & Support (Match this model to your "Get" logic)
        await VendorHelpSupport.updateMany({ isRead: false }, { $set: { isRead: true } });

        // 3. Clear Bank Approvals
        await bankApprovalSchema.updateMany({ isRead: false }, { $set: { isRead: true } });

        res.json({ message: "All notifications marked as read successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to mark notifications as read" });
    }
};



const getNotificationsByVendorWeb = async (req, res) => {
    try {
        const { vendorId } = req.params;
        console.log(`[getNotificationsByVendorWeb] Fetching for VendorID: ${vendorId}`);

        // 1. General Notifications
        const notifications = await Notification.find({ vendorId, isVendorRead: false }).sort({ createdAt: -1 });

        // 2. Callback (Adv) Notifications
        const advNotifications = await advNotification.find({ vendorId: vendorId, isVendorRead: false }).sort({ createdAt: -1 });

        // 3. Help & Support
        const helpAndSupports = await VendorHelpSupport.find({ vendorid: vendorId, isVendorRead: false }).sort({ updatedAt: -1 });
        console.log(`[getNotificationsByVendorWeb] Found ${helpAndSupports.length} support tickets.`);

        // 4. Bank Account Notifications
        const bankAccountNotifications = await bankApprovalSchema.find({ vendorId: vendorId, isVendorRead: false }).sort({ updatedAt: -1 });

        res.status(200).json({
            success: true,
            count: notifications.length + advNotifications.length + helpAndSupports.length + bankAccountNotifications.length,
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

const deleteAllNotificationsByVendor = async (req, res) => {
    try {
        const { vendorId } = req.params;
        console.log(`[deleteAllNotificationsByVendor] Clearing all for VendorID: ${vendorId}`);

        await Notification.updateMany({ vendorId }, { $set: { isVendorRead: true } });
        await advNotification.updateMany({ vendorId }, { $set: { isVendorRead: true } });
        await VendorHelpSupport.updateMany({ vendorid: vendorId }, { $set: { isVendorRead: true } });
        await bankApprovalSchema.updateMany({ vendorId }, { $set: { isVendorRead: true } });

        res.status(200).json({ success: true, message: "All notifications cleared (marked as read)." });
    } catch (error) {
        console.error("Error clearing notifications:", error);
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
        const del4 = await bankApprovalSchema.findByIdAndUpdate(notificationId, { isApproved: true, isVendorRead: true });

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
    deleteNotificationByVendor,
    deleteAllNotificationsByVendor
};
