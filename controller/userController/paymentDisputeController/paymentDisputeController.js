const PaymentDispute = require("../../../models/paymentDispute");
const { uploadImage } = require("../../../config/cloudinary");

// Generate unique ticket ID
const generateTicketId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PD-${timestamp}-${random}`;
};

// Create payment dispute ticket
const createPaymentDispute = async (req, res) => {
  try {
    const { userId, issueType, description } = req.body;

    if (!userId || !issueType) {
      return res.status(400).json({
        success: false,
        message: "User ID and issue type are required.",
      });
    }

    // Generate unique ticket ID
    const ticketId = generateTicketId();

    // Handle screenshot upload if provided
    let screenshotUrl = null;
    if (req.file) {
      screenshotUrl = await uploadImage(req.file.buffer, "payment-disputes");
    } else if (req.body.screenshot && req.body.screenshot.startsWith("data:image")) {
      // If screenshot is base64, upload it
      try {
        const base64Data = req.body.screenshot.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");
        screenshotUrl = await uploadImage(buffer, "payment-disputes");
      } catch (error) {
        console.error("Error uploading base64 screenshot:", error);
      }
    }

    // Create payment dispute ticket
    const dispute = new PaymentDispute({
      userId,
      ticketId,
      issueType,
      description: description || "",
      screenshot: screenshotUrl,
      status: "Pending",
    });

    await dispute.save();

    return res.status(201).json({
      success: true,
      message: "Payment dispute ticket created successfully.",
      data: {
        ticketId: dispute.ticketId,
        status: dispute.status,
        createdAt: dispute.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating payment dispute:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating payment dispute.",
      error: error.message,
    });
  }
};

// Get payment disputes for a user
const getUserPaymentDisputes = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const disputes = await PaymentDispute.find({ userId })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Payment disputes retrieved successfully.",
      data: disputes,
    });
  } catch (error) {
    console.error("Error getting payment disputes:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while getting payment disputes.",
      error: error.message,
    });
  }
};

// Get payment dispute by ticket ID
const getPaymentDisputeByTicketId = async (req, res) => {
  try {
    const { ticketId } = req.params;

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        message: "Ticket ID is required.",
      });
    }

    const dispute = await PaymentDispute.findOne({ ticketId });

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: "Payment dispute not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment dispute retrieved successfully.",
      data: dispute,
    });
  } catch (error) {
    console.error("Error getting payment dispute:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while getting payment dispute.",
      error: error.message,
    });
  }
};

module.exports = {
  createPaymentDispute,
  getUserPaymentDisputes,
  getPaymentDisputeByTicketId,
};

