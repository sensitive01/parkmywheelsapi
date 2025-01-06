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



module.exports = {
  createVendorHelpSupportRequest,
  getVendorHelpSupportRequests,
};

