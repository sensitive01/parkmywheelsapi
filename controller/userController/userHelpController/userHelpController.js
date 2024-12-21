const mongoose = require('mongoose');
const HelpSupport = require("../../../models/userhelp");

const createHelpSupportRequest = async (req, res) => {
  try {
    const { userId, description, userActive, chatbox } = req.body;

    // Validate input
    if (!userId || !description) {
      return res.status(400).json({
        message: "User ID and description are required.",
      });
    }

    // Always create a new document for each request
    const newHelpRequest = new HelpSupport({
      userId,
      description, // Store as a plain string
      userActive: userActive || true, // Default to true if not provided
      chatbox: [],
    });

    // Add chat messages from the incoming chatbox payload
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

    // Save the new help request to the database
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

    const helpRequests = await HelpSupport.find({ userId });

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
    const { chatId } = req.params; // Get the chat message _id from request params

    // Check if the chatId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: "Invalid chatId format." });
    }

    // Use MongoDB's aggregation pipeline to locate the specific chat message
    const result = await HelpSupport.aggregate([
      { $unwind: "$chatbox" }, // Unwind the chatbox array into individual documents
      { 
        $match: { 
          "chatbox._id": new mongoose.Types.ObjectId(chatId) // Use new Types.ObjectId() correctly here
        }
      },
      {
        $project: {
          _id: 0, // Exclude the parent document's _id
          chatMessage: "$chatbox", // Include only the matched chat message
        },
      },
    ]);

    // If no result is found
    if (result.length === 0) {
      return res.status(404).json({
        message: "Chat message not found.",
      });
    }

    // Return the matched chat message
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





module.exports = { createHelpSupportRequest, getHelpSupportRequests, getChatMessageByChatId };
