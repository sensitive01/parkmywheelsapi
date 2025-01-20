const mongoose = require('mongoose');
const HelpSupport = require("../../../models/userhelp");
const { uploadImage } = require("../../../config/cloudinary");

const createHelpSupportRequest = async (req, res) => {
  try {
    const { userId, description, userActive, chatbox } = req.body;

    if (!userId || !description) {
      return res.status(400).json({
        message: "User ID and description are required.",
      });
    }

    const newHelpRequest = new HelpSupport({
      userId,
      description, 
      userActive: userActive || true,
      chatbox: [],
    });

    if (chatbox && Array.isArray(chatbox)) {
      chatbox.forEach((chat) => {
        const newMessage = {
          userId: chat.userId,
          message: chat.message,
          image: chat.image,
          time: chat.time || new Date().toLocaleTimeString(),
        };

        newHelpRequest.chatbox.push(newMessage);
      });
    }

    await newHelpRequest.save();

    return res.status(201).json({
      message: "Help and support request created successfully.",
      helpRequest: newHelpRequest,
    });
  } catch (error) {
    console.error("Error creating help and support request:", error);
    return res.status(500).json({
      message: "Server error while creating the help and support request.",
      error: error.message,
    });
  }
};


const getHelpSupportRequests = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required in the request." });
    }

    // Fetching help and support requests in descending order by date
    const helpRequests = await HelpSupport.find({ userId }).sort({ date: -1 });

    if (helpRequests.length === 0) {
      return res.status(404).json({
        message: `No help and support requests found for userId: ${userId}`,
      });
    }

    return res.status(200).json({
      message: "Help and support requests retrieved successfully.",
      helpRequests,
    });
  } catch (error) {
    console.error("Error retrieving help and support requests:", error);
    return res.status(500).json({
      message: "Server error while retrieving the help and support requests.",
      error: error.message,
    });
  }
};



const getChatMessageByChatId = async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: "Invalid chatId format." });
    }


    const result = await HelpSupport.aggregate([
      { $unwind: "$chatbox" }, 
      { 
        $match: { 
          "chatbox._id": new mongoose.Types.ObjectId(chatId) 
        }
      },
      {
        $project: {
          _id: 0, 
          chatMessage: "$chatbox",
        },
      },
    ]);

  
    if (result.length === 0) {
      return res.status(404).json({
        message: "Chat message not found.",
      });
    }

    return res.status(200).json({
      message: "Chat message fetched successfully.",
      chatMessage: result[0].chatMessage,
    });
  } catch (error) {
    console.error("Error fetching chat message:", error);
    return res.status(500).json({
      message: "Server error while fetching chat message.",
      error: error.message,
    });
  }
};

const sendChatDetails = async (req, res) => {
  try {
    console.log("Request received with params:", req.params);
    console.log("Request body:", req.body);
    console.log("Uploaded files:", req.files);

    const { helpRequestId } = req.params;
    const { userId, message } = req.body;

    if (!userId ) {
      return res.status(400).json({ message: "Vendor ID and message are required." });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadImage(req.file.buffer, "chatbox/images");
    }

    // Find the help request
    const helpRequest = await HelpSupport.findById(helpRequestId);
    if (!helpRequest) {
      return res.status(404).json({ message: "Help request not found." });
    }

    // Create the chat message object
    const chatMessage = {
      userId: userId,
      message,
      image: imageUrl,
      time: new Date().toLocaleTimeString(),
      timestamp: new Date(),
    };

    // Push the new message into the chatbox array
    helpRequest.chatbox.push(chatMessage);
    await helpRequest.save();

    res.status(200).json({ message: "Chat message sent successfully.", data: chatMessage });
  } catch (error) {
    console.error("Error in sendchat:", error);
    res.status(500).json({ message: "Error sending chat message", error: error.message });
  }
};

const fetchuserchathistory = async (req, res) => {
  try {
    const { helpRequestId } = req.params; // Get the help request ID from the URL

    // Find the help request by ID
    const helpRequest = await HelpSupport.findById(helpRequestId);
    if (!helpRequest) {
      return res.status(404).json({
        message: "Help request not found.",
      });
    }

    return res.status(200).json({
      message: "Chat history retrieved successfully.",
      chatbox: helpRequest.chatbox,
    });
  } catch (error) {
    console.error("Error retrieving chat history:", error);
    return res.status(500).json({
      message: "Server error while retrieving chat history.",
      error: error.message,
    });
  }
};






module.exports = { createHelpSupportRequest, getHelpSupportRequests, getChatMessageByChatId, sendChatDetails, fetchuserchathistory };
