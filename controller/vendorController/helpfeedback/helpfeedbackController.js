const VendorHelpSupport = require("../../../models/userhelp");
const { uploadImage } = require("../../../config/cloudinary");

const createVendorHelpSupportRequest = async (req, res) => {
  try {
    const { vendorid, description, vendoractive, chatbox } = req.body;

    if (!vendorid || !description) {
      return res.status(400).json({
        message: "Vendor ID and description are required.",
      });
    }

    const newHelpRequest = new VendorHelpSupport({
      vendorid,
      description,
      vendoractive: vendoractive !== undefined ? vendoractive : true,
      chatbox: [],
    });

    if (chatbox && Array.isArray(chatbox)) {
      chatbox.forEach((chat) => {
        const newMessage = {
          vendorid: chat.vendorid,
          message: chat.message,
          image: chat.image,
          time: chat.time || new Date().toLocaleTimeString(),
        };

        newHelpRequest.chatbox.push(newMessage);
      });
    }

    await newHelpRequest.save();

    return res.status(201).json({
      message: "Vendor help and support request created successfully.",
      helpRequest: newHelpRequest,
    });
  } catch (error) {
    console.error("Error creating vendor help and support request:", error);
    return res.status(500).json({
      message: "Server error while creating the vendor help and support request.",
      error: error.message,
    });
  }
};

const getVendorHelpSupportRequests = async (req, res) => {
  try {
    const { vendorid } = req.params;

    if (!vendorid) {
      return res.status(400).json({ message: "Vendor ID is required in the request." });
    }

    // Fetching vendor help and support requests in descending order by date
    const helpRequests = await VendorHelpSupport.find({ vendorid }).sort({ date: -1 });

    if (helpRequests.length === 0) {
      return res.status(404).json({
        message: `No vendor help and support requests found for vendorid: ${vendorid}`,
      });
    }

    return res.status(200).json({
      message: "Vendor help and support requests retrieved successfully.",
      helpRequests,
    });
  } catch (error) {
    console.error("Error retrieving vendor help and support requests:", error);
    return res.status(500).json({
      message: "Server error while retrieving the vendor help and support requests.",
      error: error.message,
    });
  }
};




const sendchat = async (req, res) => {
  try {
    console.log("Request received with params:", req.params);
    console.log("Request body:", req.body);
    console.log("Uploaded files:", req.files);

    const { helpRequestId } = req.params;
    const { vendorid, message } = req.body;

    if (!vendorid ) {
      return res.status(400).json({ message: "Vendor ID and message are required." });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadImage(req.file.buffer, "chatbox/images");
    }

    // Find the help request
    const helpRequest = await VendorHelpSupport.findById(helpRequestId);
    if (!helpRequest) {
      return res.status(404).json({ message: "Help request not found." });
    }

    // Create the chat message object
    const chatMessage = {
      userId: vendorid,
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




// Get chat history for a specific help request
const fetchchathistory = async (req, res) => {
  try {
    const { helpRequestId } = req.params; // Get the help request ID from the URL

    // Find the help request by ID
    const helpRequest = await VendorHelpSupport.findById(helpRequestId);
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

module.exports = {
  createVendorHelpSupportRequest,
  getVendorHelpSupportRequests,
  sendchat,
  fetchchathistory,
};



