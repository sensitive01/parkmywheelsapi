const VendorBankDetails = require('../../models/bankdetailsSchema');

exports.getAllVendorBankDetails = async (req, res) => {
  try {
    const bankDetails = await VendorBankDetails.find({isApproved:false}).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Bank details fetched successfully",
      data: bankDetails
    });
  } catch (error) {
    console.error("Error fetching bank details:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

exports.verifyVendorBankDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body; 

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'approved' or 'rejected'."
      });
    }

    const bankDetails = await VendorBankDetails.findById(id);

    if (!bankDetails) {
      return res.status(404).json({
        success: false,
        message: "Bank details not found"
      });
    }

    bankDetails.isApproved = (status === 'approved');
    
    if (status === 'rejected' && reason) {
        bankDetails.rejectionReason = reason;
    } else if (status === 'approved') {
        bankDetails.rejectionReason = null; 
    }

    await bankDetails.save();

    return res.status(200).json({
      success: true,
      message: `Bank details ${status} successfully`,
      data: bankDetails
    });

  } catch (error) {
    console.error("Error verifying bank details:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};