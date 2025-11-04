const Chatbox = require("../../../models/chatbox");
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

