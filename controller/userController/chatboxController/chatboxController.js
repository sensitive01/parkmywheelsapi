const Chatbox = require("../../../models/chatbox");
const { uploadImage } = require("../../../config/cloudinary");

// Create or get chatbox for a user
const getOrCreateChatbox = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    // Try to find existing chatbox
    let chatbox = await Chatbox.findOne({ userId });

    // If no chatbox exists, create a new one
    if (!chatbox) {
      chatbox = new Chatbox({
        userId,
        messages: [],
      });
      await chatbox.save();
    }

    return res.status(200).json({
      success: true,
      message: "Chatbox retrieved successfully.",
      data: {
        chatboxId: chatbox._id,
        userId: chatbox.userId,
        messages: chatbox.messages,
        lastUpdated: chatbox.lastUpdated,
      },
    });
  } catch (error) {
    console.error("Error getting/creating chatbox:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while getting/creating chatbox.",
      error: error.message,
    });
  }
};

// Save a message to chatbox
const saveMessage = async (req, res) => {
  try {
    const { userId } = req.params;
    const { message, messageType = "user", image } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    if (!message && !image) {
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
    let imageUrl = image;
    if (req.file) {
      imageUrl = await uploadImage(req.file.buffer, "chatbox/images");
    } else if (image && image.startsWith("data:image")) {
      // If image is base64, upload it
      try {
        const base64Data = image.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");
        imageUrl = await uploadImage(buffer, "chatbox/images");
      } catch (error) {
        console.error("Error uploading base64 image:", error);
      }
    }

    // Create new message
    const newMessage = {
      userId,
      message: message || (imageUrl ? "Image" : ""),
      image: imageUrl || null,
      messageType,
      time: new Date().toLocaleTimeString(),
      timestamp: new Date(),
    };

    // Add message to chatbox
    chatbox.messages.push(newMessage);
    chatbox.lastUpdated = new Date();
    await chatbox.save();

    return res.status(200).json({
      success: true,
      message: "Message saved successfully.",
      data: newMessage,
    });
  } catch (error) {
    console.error("Error saving message:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while saving message.",
      error: error.message,
    });
  }
};

// Fetch chat history for a user
const getChatHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    // Find chatbox
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

// Save multiple messages at once (for initial load)
const saveMultipleMessages = async (req, res) => {
  try {
    const { userId, messages } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        message: "Messages array is required.",
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

    // Add all messages
    messages.forEach((msg) => {
      const newMessage = {
        userId: msg.userId || userId,
        message: msg.message || "",
        image: msg.image || null,
        messageType: msg.messageType || "user",
        time: msg.time || new Date().toLocaleTimeString(),
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      };
      chatbox.messages.push(newMessage);
    });

    chatbox.lastUpdated = new Date();
    await chatbox.save();

    return res.status(200).json({
      success: true,
      message: "Messages saved successfully.",
      data: {
        userId: chatbox.userId,
        messageCount: chatbox.messages.length,
      },
    });
  } catch (error) {
    console.error("Error saving multiple messages:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while saving messages.",
      error: error.message,
    });
  }
};

// Delete chat history for a user
const deleteChatHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const chatbox = await Chatbox.findOne({ userId });

    if (!chatbox) {
      return res.status(404).json({
        success: false,
        message: "Chatbox not found.",
      });
    }

    // Clear messages
    chatbox.messages = [];
    chatbox.lastUpdated = new Date();
    await chatbox.save();

    return res.status(200).json({
      success: true,
      message: "Chat history deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting chat history:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting chat history.",
      error: error.message,
    });
  }
};

module.exports = {
  getOrCreateChatbox,
  saveMessage,
  getChatHistory,
  saveMultipleMessages,
  deleteChatHistory,
};

