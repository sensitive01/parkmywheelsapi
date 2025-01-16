const VendorHelpSupport = require("../../../models/userhelp");

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

    const helpRequests = await VendorHelpSupport.find({ vendorid });

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
    const { helpRequestId } = req.params; // Get the help request ID from the URL
    const { vendorid, message, image } = req.body; // Get message details from the request body

    if (!vendorid || !message) {
      return res.status(400).json({
        message: "Vendor ID and message are required.",
      });
    }

    // Find the help request by ID
    const helpRequest = await VendorHelpSupport.findById(helpRequestId);
    if (!helpRequest) {
      return res.status(404).json({
        message: "Help request not found.",
      });
    }

    // Create a new chat message
    const newMessage = {
      vendorid,
      message,
      image,
      time: new Date().toLocaleTimeString(),
    };

    // Add the new message to the chatbox
    helpRequest.chatbox.push(newMessage);
    await helpRequest.save();

    return res.status(200).json({
      message: "Message added to chatbox successfully.",
      chatbox: helpRequest.chatbox,
    });
  } catch (error) {
    console.error("Error adding message to chatbox:", error);
    return res.status(500).json({
      message: "Server error while adding message to chatbox.",
      error: error.message,
    });
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



