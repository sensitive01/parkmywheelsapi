const Chatbox = require("../../../models/chatbox");
const VendorHelpSupport = require("../../../models/userhelp");
const PaymentDispute = require("../../../models/paymentDispute");
const Notification = require("../../../models/notificationschema");
const userModel = require("../../../models/userModel");
const admin = require("../../../config/firebaseAdmin");
const { uploadImage } = require("../../../config/cloudinary");

// Get all chatboxes (for admin to see all user conversations)
const getAllChatboxes = async (req, res) => {
  try {
    const chatboxes = await Chatbox.find({})
      .sort({ lastUpdated: -1 })
      .select('userId messages lastUpdated');

    return res.status(200).json({
      success: true,
      message: "Chatboxes retrieved successfully.",
      data: chatboxes,
    });
  } catch (error) {
    console.error("Error getting all chatboxes:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while getting chatboxes.",
      error: error.message,
    });
  }
};

// Get chat history for a specific user (for admin)
const getUserChatHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const chatbox = await Chatbox.findOne({ userId });

    if (!chatbox || !chatbox.messages || chatbox.messages.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No chat history found.",
        data: {
          userId,
          messages: [],
        },
      });
    }

    // Sort messages by timestamp
    const sortedMessages = chatbox.messages.sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    return res.status(200).json({
      success: true,
      message: "Chat history retrieved successfully.",
      data: {
        userId: chatbox.userId,
        messages: sortedMessages,
        lastUpdated: chatbox.lastUpdated,
      },
    });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching chat history.",
      error: error.message,
    });
  }
};

// Admin sends message to user
const sendAdminMessage = async (req, res) => {
  try {
    const { userId } = req.params;
    const { adminId, message } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Admin ID is required.",
      });
    }

    if (!message && !req.file) {
      return res.status(400).json({
        success: false,
        message: "Message or image is required.",
      });
    }

    // Find or create chatbox
    let chatbox = await Chatbox.findOne({ userId });

    if (!chatbox) {
      chatbox = new Chatbox({
        userId,
        messages: [],
      });
    }

    // Handle image upload if provided
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadImage(req.file.buffer, "chatbox/images");
    } else if (req.body.image && req.body.image.startsWith("data:image")) {
      // If image is base64, upload it
      try {
        const base64Data = req.body.image.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");
        imageUrl = await uploadImage(buffer, "chatbox/images");
      } catch (error) {
        console.error("Error uploading base64 image:", error);
      }
    }

    // Create new admin message
    const newMessage = {
      userId: adminId, // Admin ID stored in userId field
      message: message || (imageUrl ? "Image" : ""),
      image: imageUrl || null,
      messageType: "admin",
      adminId: adminId,
      time: new Date().toLocaleTimeString(),
      timestamp: new Date(),
    };

    // Add message to chatbox
    chatbox.messages.push(newMessage);
    chatbox.lastUpdated = new Date();
    await chatbox.save();

    // Update Notification for Vendor
    // Update Notification for Vendor
    let updatedSupport = null;
    try {
      // 1. Try treating userId as Ticket ID (_id)
      // Safely attempt to find by ID
      try {
        updatedSupport = await VendorHelpSupport.findById(userId);
      } catch (e) { /* Ignore cast errors */ }

      // 2. If not found, try treating userId as Vendor ID (vendorid)
      if (!updatedSupport) {
        // Priority A: Find LATEST ACTIVE ticket first (Pending or In Progress)
        // This ensures we reply to the open conversation if one exists
        updatedSupport = await VendorHelpSupport.findOne({
          vendorid: userId,
          status: { $in: ['Pending', 'In Progress', 'Active', 'Open'] }
        }).sort({ createdAt: -1 });

        // Priority B: If no active ticket, just find ANY latest ticket (likely Closed) to re-open
        if (!updatedSupport) {
          console.log(`No active ticket found for vendor ${userId}. Finding latest ticket to re-open.`);
          updatedSupport = await VendorHelpSupport.findOne({ vendorid: userId }).sort({ createdAt: -1 });
        }
      }

      if (updatedSupport) {
        console.log("✅ [Backend] Found Support Ticket:", updatedSupport._id, "Current Status:", updatedSupport.status);

        // Update the ticket
        updatedSupport.isVendorRead = false;
        updatedSupport.isRead = true;

        // Re-open if closed
        if (['Completed', 'Resolved', 'Closed'].includes(updatedSupport.status)) {
          console.log(`Re-opening ticket ${updatedSupport._id} because Admin replied.`);
          updatedSupport.status = 'In Progress';
        }

        updatedSupport.chatbox.push({
          userId: adminId,
          message: message || (imageUrl ? "Image" : ""),
          image: imageUrl || null,
          time: new Date().toLocaleTimeString(),
          timestamp: new Date()
        });

        await updatedSupport.save();
        console.log("✅ Updated VendorHelpSupport for notification. Ticket ID:", updatedSupport._id);
      } else {
        console.warn("⚠️ Failed to find any VendorHelpSupport ticket to update for ID:", userId);
      }

    } catch (err) {
      console.error("Error updating VendorHelpSupport notification:", err);
    }


    // Check if this is a response to a payment dispute
    // Look for payment dispute tickets for this user
    try {
      const pendingDisputes = await PaymentDispute.find({
        userId,
        status: { $in: ["Pending", "In Progress"] },
      }).sort({ createdAt: -1 });

      // If there's a pending dispute and admin is responding, create notification
      if (pendingDisputes.length > 0 && message) {
        const latestDispute = pendingDisputes[0];

        // Update dispute with admin response
        latestDispute.adminResponse = message;
        latestDispute.adminId = adminId;
        if (latestDispute.status === "Pending") {
          latestDispute.status = "In Progress";
        }
        await latestDispute.save();

        // Create notification for customer
        const notificationMessage = `Your "payment dispute" ticket #${latestDispute.ticketId} has been received.`;

        // Format notification time
        const now = new Date();
        const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const formattedTime = istTime.toLocaleString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        const notification = new Notification({
          userId: userId,
          title: "Payment Dispute",
          message: notificationMessage,
          sts: "payment_dispute",
          status: "info",
          read: false,
          notificationdtime: formattedTime,
          createdAt: new Date(),
        });

        await notification.save();
        console.log(`[${new Date().toISOString()}] ✅ Notification saved to database for user ${userId} - Payment Dispute ticket #${latestDispute.ticketId}`);
        console.log(`Notification details:`, {
          userId: notification.userId,
          title: notification.title,
          message: notification.message,
          ticketId: latestDispute.ticketId,
        });

        // Send FCM push notification to user
        try {
          // Find user by userId (uuid field)
          const user = await userModel.findOne({ uuid: userId }, { userfcmTokens: 1 });

          if (user && user.userfcmTokens && user.userfcmTokens.length > 0) {
            const fcmPayload = {
              notification: {
                title: "Payment Dispute",
                body: notificationMessage,
              },
              android: {
                notification: {
                  sound: "default",
                  priority: "high",
                  channelId: "payment_dispute_channel",
                },
              },
              apns: {
                payload: {
                  aps: {
                    sound: "default",
                    badge: 0,
                  },
                },
              },
              data: {
                type: "payment_dispute",
                ticketId: latestDispute.ticketId,
                userId: userId,
                notificationId: notification._id.toString(),
              },
            };

            const invalidTokens = [];
            let fcmSentCount = 0;
            let fcmFailedCount = 0;

            // Send FCM notification to all user's tokens
            for (const token of user.userfcmTokens) {
              try {
                await admin.messaging().send({
                  ...fcmPayload,
                  token: token,
                });
                fcmSentCount++;
                console.log(`[${new Date().toISOString()}] ✅ FCM notification sent to user ${userId} for payment dispute ticket #${latestDispute.ticketId}`);
              } catch (fcmError) {
                fcmFailedCount++;
                if (fcmError?.errorInfo?.code === "messaging/registration-token-not-registered") {
                  invalidTokens.push(token);
                  console.log(`[${new Date().toISOString()}] 🗑️ Invalid FCM token detected for user ${userId}: ${token}`);
                } else {
                  console.error(`[${new Date().toISOString()}] ❌ FCM error for user ${userId}:`, fcmError?.errorInfo?.code || fcmError?.message);
                }
              }
            }

            // Remove invalid tokens from user's FCM tokens
            if (invalidTokens.length > 0) {
              await userModel.updateOne(
                { uuid: userId },
                { $pull: { userfcmTokens: { $in: invalidTokens } } }
              );
              console.log(`[${new Date().toISOString()}] 🧹 Removed ${invalidTokens.length} invalid FCM tokens for user ${userId}`);
            }

            console.log(`[${new Date().toISOString()}] FCM Summary for user ${userId}: ${fcmSentCount} sent, ${fcmFailedCount} failed, ${invalidTokens.length} invalid tokens removed`);
          } else {
            console.log(`[${new Date().toISOString()}] ⚠️ No FCM tokens found for user ${userId}`);
          }
        } catch (fcmError) {
          // Log FCM error but don't fail the notification save
          console.error(`[${new Date().toISOString()}] ❌ Error sending FCM notification for payment dispute:`, fcmError);
        }
      }
    } catch (notificationError) {
      // Log error but don't fail the admin message send
      console.error(`[${new Date().toISOString()}] ❌ Error creating notification for payment dispute:`, notificationError);
      // Continue with admin message response even if notification fails
    }

    return res.status(200).json({
      success: true,
      message: "Admin message sent successfully.",
      data: newMessage,
    });
  } catch (error) {
    console.error("Error sending admin message:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while sending admin message.",
      error: error.message,
    });
  }
};

// Get all users with chatboxes (for admin dashboard)
const getUsersWithChats = async (req, res) => {
  try {
    const chatboxes = await Chatbox.find({})
      .select('userId lastUpdated')
      .sort({ lastUpdated: -1 });

    const usersList = chatboxes.map(chatbox => ({
      userId: chatbox.userId,
      lastMessageTime: chatbox.lastUpdated,
      messageCount: chatbox.messages ? chatbox.messages.length : 0,
    }));

    return res.status(200).json({
      success: true,
      message: "Users with chats retrieved successfully.",
      data: usersList,
    });
  } catch (error) {
    console.error("Error getting users with chats:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while getting users with chats.",
      error: error.message,
    });
  }
};

// Get unread message count for admin (messages from users)
const getUnreadMessageCount = async (req, res) => {
  try {
    const chatboxes = await Chatbox.find({});

    let unreadCount = 0;
    chatboxes.forEach(chatbox => {
      if (chatbox.messages && chatbox.messages.length > 0) {
        // Count messages that are from users (not admin or bot)
        const userMessages = chatbox.messages.filter(
          msg => msg.messageType === 'user'
        );
        unreadCount += userMessages.length;
      }
    });

    return res.status(200).json({
      success: true,
      message: "Unread message count retrieved successfully.",
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    console.error("Error getting unread message count:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while getting unread message count.",
      error: error.message,
    });
  }
};

module.exports = {
  getAllChatboxes,
  getUserChatHistory,
  sendAdminMessage,
  getUsersWithChats,
  getUnreadMessageCount,
};

